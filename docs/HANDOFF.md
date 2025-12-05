# Handoff Document: Invoice Processing E2E Tests

## Current Status

The invoice processing pipeline is partially implemented. Core flows work but **e2e tests have not been run/validated**.

## What Works

1. **Authentication** - Login/logout via NextAuth (`dev@example.com` / `dev123`)
2. **PDF Upload** - `/upload` route, saves files with relative paths
3. **Invoice Analysis** - Auto-triggered after upload, uses OpenAI to extract data
4. **Transaction Upload** - `/transactions` route, CSV upload
5. **Connect Action** - Matches invoices to transactions
6. **Verify/Unverify** - Toggle invoice verification status
7. **File Serving** - `/api/files/[...path]` serves PDFs from storage

## What Needs Testing (E2E)

The test file exists at `tests/e2e/invoice-flow.spec.ts` but has **not been validated**.

### Test Phases (Sequential, No DB Reset Between)

| Phase | Description | Status |
|-------|-------------|--------|
| 1.1 | Upload PDF → status=`uploaded` | Untested |
| 1.2 | Wait for analysis → status=`analyzed` | Untested |
| 2 | Upload CSV transactions | Untested |
| 3 | Connect invoices → status=`to-verify` | Untested |
| 4.1 | Verify invoice → status=`verified` | Untested |
| 4.2 | Unverify invoice → status=`to-verify` | Untested |
| 4.3 | Delete invoice | Untested |

### Test Fixtures

```
tests/fixtures/
├── invoices/
│   ├── onyx_ink_moms.pdf
│   └── anthropic_ex_moms_1.pdf
└── transactions/
    └── 2025-12-05.csv
```

## Key Files

### API Routes
- `app/api/upload-invoices/route.ts` - PDF upload + triggers analysis
- `app/api/upload-transactions/route.ts` - CSV upload
- `app/api/invoices/route.ts` - List invoices
- `app/api/invoices/[id]/route.ts` - GET/DELETE single invoice
- `app/api/invoices/[id]/verify/route.ts` - POST to verify/unverify
- `app/api/invoices/connect/route.ts` - Trigger transaction matching
- `app/api/files/[...path]/route.ts` - Serve files from storage

### Server Actions
- `server/actions/invoices.ts` - `analyzeInvoices()` with debug logging
- `server/actions/transactions.ts` - `connectTransactions()`

### Frontend
- `components/verify/VerifySplitView.tsx` - Main verification UI
- `components/pdf/PDFTableView.tsx` - Invoice list table
- `components/upload/UploadView.tsx` - PDF upload dropzone
- `components/transactions/TransactionUploadView.tsx` - CSV upload

### Storage
- `lib/storage.ts` - File operations, **stores relative paths** (e.g., `invoices/userId/file.pdf`)
- Files stored in `$STORAGE_DIR/` (defaults to `storage/`, dev uses `storage-dev/`)

### Tests
- `tests/e2e/invoice-flow.spec.ts` - Main e2e test file
- `tests/helpers/file-helpers.ts` - Test fixture utilities
- `tests/helpers/db-helpers.ts` - Database reset utilities

## Known Issues / Gotchas

1. **Session Mismatch** - If you run `pnpm dev:seed`, existing sessions become invalid (user ID changes). Log out and log back in.

2. **File Paths** - DB stores relative paths. Old invoices may have absolute paths - delete and re-upload.

3. **Analysis Failures** - Check server logs for `[analyzeInvoices]` debug output. Requires valid `OPENAI_API_KEY`.

4. **Test DB** - Uses `.env.test` with separate `DATABASE_URL` and `STORAGE_DIR=storage-test`.

## Commands

```bash
pnpm dev:seed     # Reset dev DB + create test user
pnpm dev          # Start dev server (port 3001)
pnpm test:smoke   # TypeScript compilation check
pnpm test:e2e     # Run Playwright e2e tests (needs server running)
```

## Next Steps

1. Start test server: `pnpm dev` (or dedicated test server on different port)
2. Run e2e tests: `pnpm test:e2e`
3. Debug failures - check server logs for API errors
4. Ensure test fixtures match expected invoice data for connection matching

