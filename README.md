# AI Revisor - Next.js Application

This is the Next.js full-stack application for AI Revisor, migrated from Python FastAPI backend + React frontend.

## Project Structure

```
/next
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (login, register)
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Root redirect
├── components/            # React components
│   ├── pdf/              # PDF viewing components
│   ├── verify/           # Verification components
│   ├── overview/         # Overview components
│   └── plan/             # Tax planning components
├── lib/                  # Utilities & configs
│   ├── db.ts             # Prisma client
│   ├── auth.ts           # NextAuth config
│   ├── openai.ts         # OpenAI client
│   ├── storage.ts        # File storage utilities
│   └── validations/      # Zod schemas
├── server/               # Server-side logic
│   ├── actions/          # Server Actions
│   └── services/         # Business logic
├── stores/               # Zustand stores
├── prisma/               # Prisma schema and migrations
└── types/                # TypeScript type definitions
```

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Setup environment files:**
   Create three environment files for different environments:

   | File | Port | Database | Storage | Usage |
   |------|------|----------|---------|-------|
   | `.env` | 3000 | acclerk_prod | storage | Production: `pnpm start`, `pnpm dev:prod` |
   | `.env.dev` | 3001 | acclerk_dev | storage-dev | Development: `pnpm dev` |
   | `.env.test` | 3002 | acclerk_test | storage-test | Testing: `pnpm test:e2e` |

   Each file should contain:
   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/<database>"
   NEXTAUTH_URL="http://localhost:<port>"
   NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
   PORT=<port>
   STORAGE_DIR=<storage-dir>
   OPENAI_API_KEY="sk-..."
   EMAIL_SERVER="smtp://user:pass@smtp.example.com:587"
   EMAIL_FROM="noreply@example.com"
   ```
   
   **Note:** All three servers can run simultaneously on different ports with isolated storage.

3. **Setup PostgreSQL database:**
   ```bash
   docker run --name ai-revisor-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=airevisor -p 5432:5432 -d postgres:16
   ```

4. **Run Prisma migrations:**
   ```bash
   pnpm prisma migrate dev --name init
   ```

5. **Generate Prisma client:**
   ```bash
   pnpm prisma generate
   ```

6. **Run development server:**
   ```bash
   pnpm dev
   ```

## Features Implemented

- ✅ Next.js 16 with App Router
- ✅ TypeScript configuration
- ✅ Prisma schema with all models (User, Invoice, Transaction, Match, AccountingEntry)
- ✅ NextAuth configuration (email provider)
- ✅ API routes for:
  - Upload invoices
  - Analyze invoices
  - Upload transactions
  - Connect transactions to invoices
  - Create accounting entries
- ✅ Server services:
  - Invoice extraction (OpenAI o4-mini)
  - Transaction matching
  - Accounting generation
- ✅ Zustand stores for state management
- ✅ Validation schemas with Zod
- ✅ File storage utilities

## Next Steps

1. **Setup shadcn/ui components:**
   ```bash
   pnpm dlx shadcn@latest init
   pnpm dlx shadcn@latest add button input form table card dialog sheet upload progress
   ```

2. **Implement UI components:**
   - PDF table view and preview
   - Verify split view
   - Overview dashboard
   - Tax planning form

3. **Complete authentication:**
   - Implement login/register pages
   - Add session management
   - Add protected routes middleware

4. **Note on OpenAI API:**
   The code uses `openai.responses.parse()` which is a newer API. Verify that your OpenAI SDK version supports this method. If not, you may need to use an alternative approach or update the SDK.

## Development

| Command | Description | Port |
|---------|-------------|------|
| `pnpm dev` | Development server (.env.dev) | 3001 |
| `pnpm dev:prod` | Development with prod config (.env) | 3000 |
| `pnpm dev:seed` | Reset dev DB and create default user | - |
| `pnpm build` | Production build | - |
| `pnpm start` | Production server | 3000 |
| `pnpm lint` | Run ESLint | - |
| `pnpm prisma studio` | Database GUI | - |

### Quick Start for Development

1. Seed the dev database with a default user:
   ```bash
   pnpm dev:seed
   ```

2. Start the dev server:
   ```bash
   pnpm dev
   ```

3. Log in at `http://localhost:3001/login` with:
   - **Email:** `dev@example.com`
   - **Password:** `dev123`

## Testing

We use a pragmatic 3-tier testing strategy focused on catching ~95% of errors with minimal maintenance overhead. Tests validate use cases, not exact UI output.

### Test Philosophy
- **Focus on use cases**: Tests verify that user workflows work end-to-end
- **Fuzzy testing**: Verify outcomes, not exact UI elements or text
- **Maintainability**: If a test breaks due to UI changes but the use case still works, update the test
- **Coverage goal**: ~95% of errors, not 99.9%

### Test Tiers

1. **Smoke Tests** (~50% error catch rate)
   - TypeScript compilation
   - Build process validation
   - Linting checks
   - Basic sanity checks

2. **Component Tests** (Structure only, minimal maintenance)
   - Framework for future component tests
   - Not actively maintained

3. **E2E Integration Tests** (Primary focus)
   - Complete use case testing with Playwright
   - Fuzzy assertions: verify use case fulfillment
   - Less brittle than component tests
   - Uses separate test database (`acclerk_test`)

### Running Tests

```bash
# Run smoke tests (quick validation)
pnpm test:smoke

# Run E2E integration tests (uses .env.test, port 3002)
pnpm test:e2e

# Run all tests
pnpm test

# Run E2E tests in watch mode
pnpm test:e2e:watch

# Reset test database
pnpm db:reset

# Seed test database with fixtures
pnpm db:seed
```

### Test Environment

Tests run on port 3002 using `.env.test` configuration. This allows running tests simultaneously with development (port 3001) or production (port 3000) servers.

The test database is specified via `DATABASE_URL` in `.env.test` and is isolated from other environments.
