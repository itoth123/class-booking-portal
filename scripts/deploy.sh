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
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  PROJECT_NAME        Project name. Default: class-booking"
    echo "  ENVIRONMENT         Environment name. Default: dev"
    echo "  AWS_REGION          AWS region. Default: us-east-1"
    echo "  AWS_PROFILE         AWS profile. Default: sit"
    echo ""
    echo "Examples:"
    echo "  $0 -e dev"
    echo "  $0 -e prod -r us-east-1 -p production"
    echo "  $0 -e dev -d  # Delete dev stack"
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
TEMPLATE_FILE="${SCRIPT_DIR}/../infrastructure/standalone.yaml"

# Validate template
log_info "Validating CloudFormation template..."
aws cloudformation validate-template \
    --template-body "file://${TEMPLATE_FILE}" \
    --region "${AWS_REGION}" \
    --profile "${AWS_PROFILE}" > /dev/null

# Deploy stack
log_info "Deploying stack: ${STACK_NAME}"

aws cloudformation deploy \
    --template-file "${TEMPLATE_FILE}" \
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

# Get outputs
log_info "Deployment completed! Stack outputs:"
echo ""
aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${AWS_REGION}" \
    --profile "${AWS_PROFILE}" \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

# Create frontend config
log_info "Creating frontend configuration..."
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${AWS_REGION}" \
    --profile "${AWS_PROFILE}" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text)

USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${AWS_REGION}" \
    --profile "${AWS_PROFILE}" \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text)

USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${AWS_REGION}" \
    --profile "${AWS_PROFILE}" \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
    --output text)

CONFIG_DIR="${SCRIPT_DIR}/../frontend"
mkdir -p "${CONFIG_DIR}"

cat > "${CONFIG_DIR}/config.json" << EOF
{
  "apiEndpoint": "${API_ENDPOINT}",
  "cognitoUserPoolId": "${USER_POOL_ID}",
  "cognitoClientId": "${USER_POOL_CLIENT_ID}",
  "region": "${AWS_REGION}"
}
EOF

log_info "Frontend config saved to: ${CONFIG_DIR}/config.json"

echo ""
log_info "=== Deployment Summary ==="
echo "AWS Profile: ${AWS_PROFILE}"
echo "API Endpoint: ${API_ENDPOINT}"
echo "User Pool ID: ${USER_POOL_ID}"
echo "Client ID: ${USER_POOL_CLIENT_ID}"
echo ""
log_info "Next steps:"
echo "1. Create an admin user in Cognito:"
echo "   aws cognito-idp admin-create-user --profile ${AWS_PROFILE} --user-pool-id ${USER_POOL_ID} --username YOUR_EMAIL --user-attributes Name=email,Value=YOUR_EMAIL Name=email_verified,Value=true"
echo ""
echo "2. Set permanent password:"
echo "   aws cognito-idp admin-set-user-password --profile ${AWS_PROFILE} --user-pool-id ${USER_POOL_ID} --username YOUR_EMAIL --password 'YourPassword123!' --permanent"
echo ""
echo "3. Upload frontend to S3 (after building):"
echo "   aws s3 sync ./frontend/dist s3://\$(aws cloudformation describe-stacks --profile ${AWS_PROFILE} --stack-name ${STACK_NAME} --query 'Stacks[0].Outputs[?OutputKey==\`FrontendBucket\`].OutputValue' --output text)"
