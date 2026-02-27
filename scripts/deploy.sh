#!/bin/bash
# =============================================================================
# Class Booking Portal - Deployment Script
# =============================================================================

set -e

# Configuration
PROJECT_NAME="${PROJECT_NAME:-class-booking}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_PROFILE="${AWS_PROFILE:-sit}"
STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment   Environment (dev|staging|prod). Default: dev"
    echo "  -r, --region        AWS region. Default: us-east-1"
    echo "  -p, --profile       AWS profile. Default: sit"
    echo "  -d, --delete        Delete the stack"
    echo "  -s, --skip-frontend Skip frontend build & deploy"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  PROJECT_NAME        Project name. Default: class-booking"
    echo "  ENVIRONMENT         Environment name. Default: dev"
    echo "  AWS_REGION          AWS region. Default: us-east-1"
    echo "  AWS_PROFILE         AWS profile. Default: sit"
    echo ""
    echo "Examples:"
    echo "  $0 -e dev                       # Full deploy (infra + frontend)"
    echo "  $0 -e dev -s                    # Infra only, skip frontend"
    echo "  $0 -e prod -r us-east-1 -p prod # Production deploy"
    echo "  $0 -e dev -d                    # Delete dev stack"
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse arguments
DELETE_STACK=false
SKIP_FRONTEND=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -p|--profile)
            AWS_PROFILE="$2"
            shift 2
            ;;
        -d|--delete)
            DELETE_STACK=true
            shift
            ;;
        -s|--skip-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Update stack name
STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}"

# Handle delete
if [ "$DELETE_STACK" = true ]; then
    log_warn "Deleting stack: ${STACK_NAME}"
    read -p "Are you sure? (y/N): " confirm
    if [[ $confirm =~ ^[Yy]$ ]]; then
        aws cloudformation delete-stack \
            --stack-name "${STACK_NAME}" \
            --region "${AWS_REGION}" \
            --profile "${AWS_PROFILE}"
        
        log_info "Waiting for stack deletion..."
        aws cloudformation wait stack-delete-complete \
            --stack-name "${STACK_NAME}" \
            --region "${AWS_REGION}" \
            --profile "${AWS_PROFILE}"
        
        log_info "Stack deleted successfully!"
    else
        log_info "Deletion cancelled."
    fi
    exit 0
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
    exit 1
fi

# Check AWS credentials
log_info "Checking AWS credentials for profile: ${AWS_PROFILE}..."
if ! aws sts get-caller-identity --region "${AWS_REGION}" --profile "${AWS_PROFILE}" > /dev/null 2>&1; then
    log_error "AWS credentials not configured for profile '${AWS_PROFILE}'. Check your ~/.aws/credentials"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --profile "${AWS_PROFILE}")
log_info "AWS Account: ${AWS_ACCOUNT_ID}"
log_info "AWS Profile: ${AWS_PROFILE}"
log_info "Region: ${AWS_REGION}"
log_info "Environment: ${ENVIRONMENT}"

# Template location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}/.."
TEMPLATE_FILE="${PROJECT_DIR}/infrastructure/standalone.yaml"
PACKAGED_TEMPLATE="${PROJECT_DIR}/infrastructure/packaged.yaml"
FRONTEND_DIR="${PROJECT_DIR}/frontend"

# S3 bucket for Lambda code packaging
ARTIFACTS_BUCKET="${PROJECT_NAME}-${ENVIRONMENT}-artifacts-${AWS_ACCOUNT_ID}"

# =========================================================================
# STEP 0: Ensure artifacts bucket exists
# =========================================================================
log_info "Ensuring artifacts S3 bucket exists: ${ARTIFACTS_BUCKET}..."
if ! aws s3 ls "s3://${ARTIFACTS_BUCKET}" --region "${AWS_REGION}" --profile "${AWS_PROFILE}" 2>/dev/null; then
    log_info "Creating artifacts bucket..."
    aws s3 mb "s3://${ARTIFACTS_BUCKET}" --region "${AWS_REGION}" --profile "${AWS_PROFILE}"
fi

# =========================================================================
# STEP 1: Package and deploy CloudFormation stack
# =========================================================================
log_info "Packaging CloudFormation template (uploading Lambda code to S3)..."
aws cloudformation package \
    --template-file "${TEMPLATE_FILE}" \
    --s3-bucket "${ARTIFACTS_BUCKET}" \
    --s3-prefix "lambda" \
    --output-template-file "${PACKAGED_TEMPLATE}" \
    --region "${AWS_REGION}" \
    --profile "${AWS_PROFILE}"

log_info "Validating packaged CloudFormation template..."
aws cloudformation validate-template \
    --template-body "file://${PACKAGED_TEMPLATE}" \
    --region "${AWS_REGION}" \
    --profile "${AWS_PROFILE}" > /dev/null

log_info "Deploying stack: ${STACK_NAME}"

aws cloudformation deploy \
    --template-file "${PACKAGED_TEMPLATE}" \
    --stack-name "${STACK_NAME}" \
    --region "${AWS_REGION}" \
    --profile "${AWS_PROFILE}" \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameter-overrides \
        Environment="${ENVIRONMENT}" \
        ProjectName="${PROJECT_NAME}" \
    --tags \
        Project="${PROJECT_NAME}" \
        Environment="${ENVIRONMENT}" \
        ManagedBy=CloudFormation

log_info "Stack deployed successfully!"
echo ""

# =========================================================================
# STEP 2: Fetch stack outputs
# =========================================================================
log_info "Fetching stack outputs..."

get_output() {
    aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}" \
        --region "${AWS_REGION}" \
        --profile "${AWS_PROFILE}" \
        --query "Stacks[0].Outputs[?OutputKey==\`$1\`].OutputValue" \
        --output text
}

API_ENDPOINT=$(get_output ApiEndpoint)
USER_POOL_ID=$(get_output UserPoolId)
USER_POOL_CLIENT_ID=$(get_output UserPoolClientId)
FRONTEND_BUCKET=$(get_output FrontendBucket)
CLOUDFRONT_DIST_ID=$(get_output CloudFrontDistributionId)
WEBSITE_URL=$(get_output WebsiteURL)

aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${AWS_REGION}" \
    --profile "${AWS_PROFILE}" \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

# =========================================================================
# STEP 3: Update frontend config
# =========================================================================
log_info "Updating frontend configuration..."

cat > "${FRONTEND_DIR}/config.json" << EOF
{
  "apiEndpoint": "${API_ENDPOINT}",
  "cognitoUserPoolId": "${USER_POOL_ID}",
  "cognitoClientId": "${USER_POOL_CLIENT_ID}",
  "region": "${AWS_REGION}"
}
EOF

cat > "${FRONTEND_DIR}/src/config.js" << EOF
export const config = {
  apiEndpoint: '${API_ENDPOINT}',

  cognito: {
    region: '${AWS_REGION}',
    userPoolId: '${USER_POOL_ID}',
    clientId: '${USER_POOL_CLIENT_ID}',
  }
}
EOF

log_info "Frontend config.json and src/config.js updated"

# =========================================================================
# STEP 4: Build & deploy frontend
# =========================================================================
if [ "$SKIP_FRONTEND" = true ]; then
    log_warn "Skipping frontend build & deploy (-s flag)"
else
    log_info "Installing frontend dependencies..."
    cd "${FRONTEND_DIR}"
    npm install --silent

    log_info "Building frontend..."
    npm run build

    log_info "Uploading frontend to S3: ${FRONTEND_BUCKET}..."
    aws s3 sync dist/ "s3://${FRONTEND_BUCKET}" --delete --profile "${AWS_PROFILE}"

    log_info "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --profile "${AWS_PROFILE}" \
        --distribution-id "${CLOUDFRONT_DIST_ID}" \
        --paths "/*" > /dev/null

    log_info "Frontend deployed and CloudFront cache invalidated!"
fi

# =========================================================================
# DONE
# =========================================================================
echo ""
log_info "=== Deployment Complete ==="
echo "Website URL:  ${WEBSITE_URL}"
echo "API Endpoint: ${API_ENDPOINT}"
echo "User Pool ID: ${USER_POOL_ID}"
echo "Client ID:    ${USER_POOL_CLIENT_ID}"
echo "S3 Bucket:    ${FRONTEND_BUCKET}"
echo "CloudFront:   ${CLOUDFRONT_DIST_ID}"
echo ""
log_info "To create an admin user:"
echo "  aws cognito-idp admin-create-user --profile ${AWS_PROFILE} \\"
echo "    --user-pool-id ${USER_POOL_ID} --username YOUR_EMAIL \\"
echo "    --user-attributes Name=email,Value=YOUR_EMAIL Name=email_verified,Value=true \\"
echo "    --temporary-password 'TempPass123!'"
echo ""
echo "  aws cognito-idp admin-set-user-password --profile ${AWS_PROFILE} \\"
echo "    --user-pool-id ${USER_POOL_ID} --username YOUR_EMAIL \\"
echo "    --password 'YourPassword123!' --permanent"
