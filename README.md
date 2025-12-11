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

| Technology | Purpose |
|-----------|---------|
| **NestJS** | Backend framework |
| **TypeScript** | Type-safe development |
| **PostgreSQL** | Relational database |
| **TypeORM** | Database ORM |
| **Passport.js** | Authentication strategies |
| **Paystack** | Payment gateway |
| **Swagger** | API documentation |
| **class-validator** | Input validation |
| **crypto** | Hashing & signatures |

---

## 🏗️ Architecture

```
src/
├── auth/                  # Authentication (Google OAuth, JWT)
│   ├── strategies/        # Passport strategies
│   ├── guards/            # Auth guards (JWT, API Key, Dual)
│   └── decorators/        # Custom decorators
├── api-keys/              # API Key management
├── wallet/                # Wallet operations & Paystack
├── users/                 # User management
└── common/                # Shared utilities
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
# Copy example env file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required Variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_HOST` | PostgreSQL host | `localhost` |
| `DATABASE_PORT` | PostgreSQL port | `5432` |
| `DATABASE_USER` | Database username | `postgres` |
| `DATABASE_PASSWORD` | Database password | `your_password` |
| `DATABASE_NAME` | Database name | `wallet_db` |
| `JWT_SECRET` | JWT signing key | Generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | From Google Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | From Google Console |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | From Paystack Dashboard |

---

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

**Response:**
```json
{
  "api_key": "sk_live_abc123...",
  "expires_at": "2025-12-11T10:30:00Z"
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

#### 8. **Get Balance**
```http
GET /wallet/balance
Authorization: Bearer <jwt_token>
```

#### 9. **Transfer Funds**
```http
POST /wallet/transfer
Authorization: Bearer <jwt_token>

{
  "wallet_number": "4512345678",
  "amount": 3000
}
```

---

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Manual Testing with Swagger

1. **Login with Google**: `http://localhost:3000/auth/google`
2. **Copy JWT token** from response
3. **Open Swagger**: `http://localhost:3000/api/docs`
4. **Click "Authorize"** (top right)
5. **Paste JWT token** (without "Bearer" prefix)
6. **Test endpoints** interactively

---

## 🔒 Security Best Practices

- ✅ **Never commit `.env`** - Always in `.gitignore`
- ✅ **Use environment variables** for all secrets
- ✅ **Hash API keys** before storage (SHA-256)
- ✅ **Verify Paystack webhooks** with signature
- ✅ **Validate all inputs** with DTOs
- ✅ **Use HTTPS in production**
- ✅ **Enable rate limiting**
- ✅ **Rotate JWT secrets regularly**

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

## 📊 Database Schema

### Users Table
```sql
id          UUID PRIMARY KEY
email       VARCHAR UNIQUE NOT NULL
google_id   VARCHAR UNIQUE NOT NULL
created_at  TIMESTAMP DEFAULT NOW()
updated_at  TIMESTAMP DEFAULT NOW()
```

### Wallets Table
```sql
id             UUID PRIMARY KEY
user_id        UUID UNIQUE REFERENCES users(id)
wallet_number  VARCHAR(10) UNIQUE NOT NULL
balance        BIGINT DEFAULT 0
created_at     TIMESTAMP DEFAULT NOW()
updated_at     TIMESTAMP DEFAULT NOW()
```

### Transactions Table
```sql
id          UUID PRIMARY KEY
wallet_id   UUID REFERENCES wallets(id)
type        ENUM('deposit', 'transfer_in', 'transfer_out')
amount      BIGINT NOT NULL
status      ENUM('pending', 'success', 'failed')
reference   VARCHAR UNIQUE NOT NULL
metadata    JSONB
created_at  TIMESTAMP DEFAULT NOW()
updated_at  TIMESTAMP DEFAULT NOW()
```

### API Keys Table
```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES users(id)
name        VARCHAR NOT NULL
key_hash    VARCHAR NOT NULL
permissions VARCHAR[] NOT NULL
expires_at  TIMESTAMP NOT NULL
revoked     BOOLEAN DEFAULT FALSE
created_at  TIMESTAMP DEFAULT NOW()
updated_at  TIMESTAMP DEFAULT NOW()
```

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
- [NestJS](https://nestjs.com/) - Framework
- [Paystack](https://paystack.com/) - Payment gateway

---

## 📧 Contact

For questions or support, contact: [your-email@example.com](mailto:your-email@example.com)

---

**Built with ❤️ for HNG Stage 8**