# Class Booking Portal

A minimal-cost serverless class booking portal on AWS. Public visitors can browse available classes and book seats by filling in their personal data. Administrators log in to manage classes and view bookings.

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│    CloudFront   │────▶│ API Gateway  │────▶│   Lambda    │────▶│  DynamoDB   │
│   + S3 (SPA)    │     │  (REST API)  │     │  (Python)   │     │  (NoSQL)    │
└─────────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │   Cognito   │
                        │ (Admin Auth)│
                        └─────────────┘
```

## How It Works

- **Public visitors** see a list of available classes with seat counts, dates, locations, and instructors. They can book a seat by filling in their name, email, and phone. Each booking atomically decrements the available seat counter.
- **Administrators** log in via Cognito, manage classes (create/edit/delete), and view the list of people who booked each class.

## Cost Estimate

| Service | Free Tier | After Free Tier |
|---------|-----------|-----------------|
| DynamoDB | 25GB + 25 RCU/WCU | ~$1.25/million requests |
| Lambda | 1M requests/month | ~$0.20/million |
| API Gateway | 1M calls/month (12mo) | ~$3.50/million |
| S3 | 5GB storage | ~$0.023/GB |
| CloudFront | 1TB transfer/month | ~$0.085/GB |
| Cognito | 50K MAU | ~$0.0055/MAU |

**Estimated monthly cost for low traffic: $0 - $5/month**

## Project Structure

```
class-booking-portal/
├── infrastructure/
│   └── standalone.yaml       # CloudFormation template
├── scripts/
│   └── deploy.sh             # Deployment script
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            # Routes & layout
│       ├── config.js          # API & Cognito config
│       ├── context/
│       │   └── AuthContext.jsx # Admin auth context
│       ├── services/
│       │   ├── api.js         # Public + Admin API services
│       │   └── auth.js        # Cognito auth service
│       └── pages/
│           ├── ClassList.jsx        # Public: browse classes
│           ├── BookingForm.jsx      # Public: book a seat
│           ├── BookingSuccess.jsx   # Public: confirmation
│           ├── AdminLogin.jsx       # Admin: login
│           ├── AdminDashboard.jsx   # Admin: class list
│           ├── AdminClassForm.jsx   # Admin: create/edit class
│           └── AdminClassDetail.jsx # Admin: view bookings
└── README.md
```

## Quick Start

### Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 18+
- Bash shell

### Deploy

```bash
# Deploy to dev environment
./scripts/deploy.sh -e dev

# Deploy to production
./scripts/deploy.sh -e prod

# Deploy with custom region/profile
./scripts/deploy.sh -e prod -r us-east-1 -p production
```

### Options

```
-e, --environment   Environment (dev|staging|prod). Default: dev
-r, --region        AWS region. Default: us-east-1
-p, --profile       AWS profile. Default: sit
-d, --delete        Delete the stack
-h, --help          Show help
```

### Build & Deploy Frontend

After the CloudFormation stack is deployed:

```bash
cd frontend

# Install dependencies
npm install

# Test locally (optional)
npm run dev

# Build & deploy to S3
npm run deploy
```

Then invalidate CloudFront cache for immediate updates:

```bash
aws cloudfront create-invalidation \
    --distribution-id DISTRIBUTION_ID \
    --paths "/*" \
    --profile sit
```

## API Endpoints

### Public (no authentication required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /classes | List available classes |
| GET | /classes/{id} | Get class details |
| POST | /classes/{id}/book | Book a seat |

### Admin (Cognito Bearer token required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/classes | List all classes (full details) |
| GET | /admin/classes/{id} | Get class with bookings list |
| POST | /admin/classes | Create a new class |
| PUT | /admin/classes/{id} | Update a class |
| DELETE | /admin/classes/{id} | Delete class and its bookings |
| DELETE | /admin/bookings/{id} | Cancel a single booking |

### Request/Response Examples

**Book a seat (public):**
```bash
curl -X POST https://API_ENDPOINT/dev/classes/CLASS_ID/book \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ivan",
    "lastName": "Horvat",
    "email": "ivan@example.com",
    "phone": "+385911234567"
  }'
```

**Response:**
```json
{
  "message": "Booking confirmed",
  "bookingId": "uuid-here",
  "className": "Osnove zaštite na radu"
}
```

**Create class (admin):**
```bash
curl -X POST https://API_ENDPOINT/dev/admin/classes \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Osnove zaštite na radu",
    "description": "Tečaj za nove zaposlenike",
    "instructor": "Ana Kovač",
    "dateTime": "2026-03-15T09:00:00",
    "duration": "4 sata",
    "location": "Dvorana A, Karlovac",
    "totalSeats": 20
  }'
```

## Authentication

Only administrators need to log in. Create an admin user via AWS CLI:

```bash
USER_POOL_ID="your-user-pool-id"
EMAIL="admin@example.com"

# Create user
aws cognito-idp admin-create-user \
    --profile sit \
    --user-pool-id $USER_POOL_ID \
    --username $EMAIL \
    --user-attributes Name=email,Value=$EMAIL Name=email_verified,Value=true \
    --temporary-password "TempPass123!"

# Set permanent password
aws cognito-idp admin-set-user-password \
    --profile sit \
    --user-pool-id $USER_POOL_ID \
    --username $EMAIL \
    --password "YourSecurePassword123!" \
    --permanent
```

## Cleanup

```bash
# Using deploy script
./scripts/deploy.sh -e dev -d

# Or manually
aws cloudformation delete-stack --stack-name class-booking-dev --profile sit
```

S3 buckets and DynamoDB tables have `DeletionPolicy: Retain`. To fully clean up:

```bash
# Delete DynamoDB tables
aws dynamodb delete-table --table-name class-booking-dev-classes --profile sit
aws dynamodb delete-table --table-name class-booking-dev-bookings --profile sit

# Delete S3 bucket
aws s3 rm s3://sit-class-booking-dev-frontend --recursive --profile sit
aws s3 rb s3://sit-class-booking-dev-frontend --profile sit
```

## License

MIT
