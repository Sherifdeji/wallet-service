# HNG Stage 8 - Wallet Service

**Production-grade wallet service** built with **NestJS**, **PostgreSQL**, **Paystack**, supporting **JWT & API Key authentication**.

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Paystack](https://img.shields.io/badge/Paystack-00C3F7?style=flat&logo=paystack&logoColor=white)](https://paystack.com/)

---

## 🚀 Features

### ✅ **Authentication**

- 🔐 **Google OAuth 2.0** - Seamless user login
- 🎟️ **JWT Tokens** - Secure session management
- 🔑 **API Keys** - Service-to-service authentication
- 🔀 **Dual Auth** - Endpoints accept JWT OR API keys

### ✅ **API Key Management**

- 📊 **5 Active Keys Max** - Per-user limit enforced
- ⏰ **Flexible Expiry** - 1H, 1D, 1M, 1Y (auto-converts to datetime)
- 🛡️ **Permission System** - Granular access control (`deposit`, `transfer`, `read`)
- 🔄 **Key Rollover** - Seamless expired key renewal
- 🔒 **SHA-256 Hashing** - Secure key storage

### ✅ **Wallet Operations**

- 💰 **Auto-Creation** - Wallet created on first login
- 🔢 **Unique Numbers** - 10-digit wallet identifiers
- 💳 **Paystack Deposits** - Secure payment processing
- 🔄 **Wallet Transfers** - Atomic peer-to-peer transfers
- 📊 **Transaction History** - Complete audit trail
- 💵 **KOBO Storage** - All amounts in smallest denomination

### ✅ **Security**

- ✅ Webhook signature verification
- ✅ Idempotent payment processing
- ✅ Atomic database transactions
- ✅ Rate limiting (100 req/min)
- ✅ Input validation with `class-validator`
- ✅ Environment-based configuration

---

## 📋 Tech Stack

| Technology          | Purpose                   |
| ------------------- | ------------------------- |
| **NestJS**          | Backend framework         |
| **TypeScript**      | Type-safe development     |
| **PostgreSQL**      | Relational database       |
| **TypeORM**         | Database ORM              |
| **Passport.js**     | Authentication strategies |
| **Paystack**        | Payment gateway           |
| **Swagger**         | API documentation         |
| **class-validator** | Input validation          |
| **crypto**          | Hashing & signatures      |

---

## 🏗️ Architecture

```
src/
├── auth/                  # Authentication (Google OAuth, JWT)
│   ├── strategies/        # Passport strategies (Google, JWT)
│   ├── guards/            # Auth guards (JWT, API Key, Dual, Permissions)
│   └── decorators/        # Custom decorators (@RequirePermissions)
├── api-keys/              # API Key management
│   ├── dto/               # Data transfer objects
│   └── entities/          # TypeORM entities
├── wallet/                # Wallet operations & Paystack
│   ├── dto/               # Request/response DTOs
│   ├── entities/          # Wallet & Transaction entities
│   ├── paystack.service.ts # Paystack API integration
│   └── wallet.service.ts  # Wallet business logic
├── users/                 # User management
│   └── entities/          # User entity
├── app.controller.ts      # Health check endpoint
└── main.ts                # Application bootstrap
```

---

## 🛠️ Setup Instructions

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))
- **npm** or **yarn**
- **Google OAuth Credentials** ([Get here](https://console.cloud.google.com/))
- **Paystack Account** ([Sign up](https://dashboard.paystack.com/))

---

### Step 1: Clone Repository

```bash
git clone https://github.com/your-username/hng-stage8-wallet-service.git
cd hng-stage8-wallet-service/wallet-service-paystack
```

---

### Step 2: Install Dependencies

```bash
npm install
```

---

### Step 3: Setup PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE wallet_db;

# Exit
\q
```

---

### Step 4: Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

**Complete `.env` Configuration:**

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=wallet_db

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_generate_with_openssl
JWT_EXPIRES_IN=7d

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Paystack Payment Gateway
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
PAYSTACK_CALLBACK_URL=http://localhost:3000/wallet/paystack/webhook

# Application Settings
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
```

**Generate JWT Secret:**

```bash
# Use OpenSSL to generate secure random secret
openssl rand -base64 64
```

### Step 5: Setup Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. Application type: **Web application**
7. Add **Authorized redirect URI**: `http://localhost:3000/auth/google/callback`
8. Copy **Client ID** and **Client Secret** to `.env`

---

### Step 6: Setup Paystack

1. Sign up at [Paystack](https://dashboard.paystack.com/)
2. Go to **Settings** → **API Keys**
3. Copy **Secret Key** and **Public Key** to `.env`
4. For production: Set webhook URL in **Settings** → **Webhooks**
   - URL: `https://yourdomain.com/wallet/paystack/webhook`

---

### Step 7: Run Database Migrations

```bash
# Auto-sync database schema (development only)
npm run start:dev

# Database tables will be created automatically
```

---

### Step 8: Start Development Server

```bash
npm run start:dev
```

**Expected Output:**

```
🚀 Application is running on: http://localhost:3000
📚 Swagger documentation: http://localhost:3000/api/docs
```

---

## 📖 API Documentation

### Swagger UI

Open [http://localhost:3000/api/docs](http://localhost:3000/api/docs) for interactive API documentation.

---

### Authentication Endpoints

#### 1. **Initiate Google Login**

```http
GET /auth/google
```

Redirects to Google OAuth consent screen.

---

#### 2. **Google Callback**

```http
GET /auth/google/callback
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### API Key Management

#### 3. **Create API Key**

```http
POST /keys/create
Authorization: Bearer <jwt_token>

{
  "name": "wallet-service",
  "permissions": ["deposit", "transfer", "read"],
  "expiry": "1D"
}
```

**Validations:**

- Maximum 5 active keys per user
- Permissions must be subset of: `["deposit", "transfer", "read"]`
- Expiry: `1H`, `1D`, `1M`, `1Y`

**Response:**

```json
{
  "api_key": "sk_live_abc123def456...",
  "expires_at": "2025-12-11T10:30:00Z"
}
```

**⚠️ IMPORTANT**: API key is shown only once. Store it securely!

---

#### 4. **Rollover Expired API Key**

```http
POST /keys/rollover
Authorization: Bearer <jwt_token>

{
  "expired_key_id": "uuid-of-expired-key",
  "expiry": "1M"
}
```

**Response:**

```json
{
  "api_key": "sk_live_xyz789...",
  "expires_at": "2026-01-11T10:30:00Z"
}
```

---

### Wallet Operations

#### 5. **Initialize Deposit**

```http
POST /wallet/deposit
Authorization: Bearer <jwt_token>
# OR
x-api-key: sk_live_...

{
  "amount": 5000
}
```

**Note**: Amount must be in **KOBO** (1 Naira = 100 Kobo)

**Response:**

```json
{
  "reference": "TXN_1702201234567_abc123",
  "authorization_url": "https://checkout.paystack.com/abc123def456",
  "access_code": "abc123def456"
}
```

**Flow:**

1. API returns Paystack payment URL
2. User completes payment on Paystack
3. Paystack sends webhook to credit wallet
4. Check status with `/wallet/deposit/:reference/status`

---

#### 6. **Paystack Webhook** (Internal - Called by Paystack)

```http
POST /wallet/paystack/webhook
x-paystack-signature: <hmac_sha512_signature>

{
  "event": "charge.success",
  "data": { ... }
}
```

**CRITICAL NOTES:**

- ✅ Only this endpoint credits wallets (following copilot instructions)
- ✅ Verifies Paystack signature using HMAC SHA512
- ✅ Idempotent (no double-crediting)
- ✅ Atomic wallet updates
- ❌ Do NOT call this endpoint manually

---

#### 7. **Check Deposit Status**

```http
GET /wallet/deposit/:reference/status
Authorization: Bearer <jwt_token>
# OR
x-api-key: sk_live_...
```

**Response:**

```json
{
  "reference": "TXN_1702201234567_abc123",
  "status": "success",
  "amount": 5000,
  "created_at": "2025-12-10T10:00:00.000Z",
  "updated_at": "2025-12-10T10:01:00.000Z"
}
```

**Note**: This is read-only. Does NOT credit wallet.

---

#### 8. **Get Wallet Balance**

```http
GET /wallet/balance
Authorization: Bearer <jwt_token>
# OR
x-api-key: sk_live_...
```

**Response:**

```json
{
  "balance": 15000,
  "wallet_number": "4512345678"
}
```

**Note**: Balance is in **KOBO**. Divide by 100 for Naira.

---

#### 9. **Get Wallet Information**

```http
GET /wallet/info
Authorization: Bearer <jwt_token>
# OR
x-api-key: sk_live_...
```

**Response:**

```json
{
  "id": "uuid",
  "wallet_number": "4512345678",
  "balance": 15000,
  "created_at": "2025-12-10T10:00:00.000Z",
  "updated_at": "2025-12-10T10:01:00.000Z"
}
```

---

#### 10. **Transfer Funds**

```http
POST /wallet/transfer
Authorization: Bearer <jwt_token>
# OR
x-api-key: sk_live_...

{
  "wallet_number": "4512345678",
  "amount": 3000
}
```

**Validations:**

- ✅ Amount > 0
- ✅ Recipient wallet exists
- ✅ Sufficient balance
- ❌ Cannot transfer to self

**Response:**

```json
{
  "status": "success",
  "message": "Transfer completed successfully",
  "transaction_id": "uuid"
}
```

**Note**: Transfer is atomic (both wallets updated or none).

---

#### 11. **Transaction History**

```http
GET /wallet/transactions?page=1&limit=20
Authorization: Bearer <jwt_token>
# OR
x-api-key: sk_live_...
```

**Response:**

```json
[
  {
    "id": "uuid",
    "type": "deposit",
    "amount": 5000,
    "status": "success",
    "reference": "TXN_123",
    "metadata": {},
    "created_at": "2025-12-10T10:00:00.000Z"
  },
  {
    "id": "uuid",
    "type": "transfer_out",
    "amount": 3000,
    "status": "success",
    "reference": "TXN_456",
    "metadata": { "recipient": "4512345678" },
    "created_at": "2025-12-10T11:00:00.000Z"
  }
]
```

---

### Health Check Endpoints

#### 12. **Health Check (Root)**

```http
GET /
```

**Response:**

```json
{
  "status": "ok",
  "service": "HNG Stage 8 - Wallet Service",
  "version": "1.0.0",
  "endpoints": {
    "swagger": "/api/docs",
    "googleLogin": "/auth/google",
    "paystackWebhook": "/wallet/paystack/webhook"
  },
  "timestamp": "2025-12-11T06:30:00.000Z"
}
```

---

#### 13. **Health Check (Alternative)**

```http
GET /health
```

**Response:**

```json
{
  "status": "ok"
}
```

---

### Manual Testing with Swagger

1. **Login with Google**: `http://localhost:3000/auth/google`
2. **Copy JWT token** from response
3. **Open Swagger**: `http://localhost:3000/api/docs`
4. **Click "Authorize"** (top right)
5. **Paste JWT token** (without "Bearer" prefix)
6. **Test endpoints** interactively

---

## 🚀 Production Deployment

### Environment Setup

```bash
# Set production environment variables
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:port/database
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
PAYSTACK_CALLBACK_URL=https://yourdomain.com/wallet/paystack/webhook
```

### Build for Production

```bash
npm run build
npm run start:prod
```

### Webhook Configuration

1. Deploy to server with HTTPS
2. Go to Paystack Dashboard → Settings → Webhooks
3. Set webhook URL: `https://yourdomain.com/wallet/paystack/webhook`
4. Test webhook with Paystack test mode

---

## 🛠️ Development Commands

```bash
# Start development server
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Run tests
npm run test

# Run E2E tests
npm run test:e2e

# Lint code
npm run lint

# Format code
npm run format
```

---

## 📝 Project Structure

```
wallet-service-paystack/
├── src/
│   ├── auth/               # Authentication module
│   │   ├── strategies/     # Passport strategies
│   │   ├── guards/         # Auth guards
│   │   └── decorators/     # Custom decorators
│   ├── api-keys/           # API key management
│   ├── wallet/             # Wallet operations
│   ├── users/              # User management
│   └── common/             # Shared utilities
├── test/                   # E2E tests
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
├── nest-cli.json           # NestJS configuration
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
└── README.md               # This file
```

---

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

This project is part of HNG Stage 8 internship.

---

## 🙏 Acknowledgments

- [HNG Internship](https://hng.tech/) - Training program

---

**Built with ❤️ by Sherif Ibrahim**
