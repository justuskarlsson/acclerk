# Test Infrastructure

This directory contains the test infrastructure for AI Revisor.

## Setup

1. **Generate Prisma Client** (required before running tests):
   ```bash
   pnpm prisma generate
   ```

2. **Set up test database**:
   - Ensure `TEST_DATABASE_URL` is set in your `.env.local`
   - Test database should be named `acclerk_test` (separate from dev DB)
   - Run migrations on test database:
     ```bash
     DATABASE_URL=$TEST_DATABASE_URL pnpm prisma migrate deploy
     ```

3. **Install Playwright browsers** (first time only):
   ```bash
   pnpm exec playwright install
   ```

## Test Structure

- `e2e/` - E2E integration tests (Playwright)
- `fixtures/` - Test data (PDFs, CSVs, user definitions)
- `helpers/` - Test utility functions
- `components/` - Component tests (structure only, minimal)

## Running Tests

See main README.md for test commands.

## Test Philosophy

- **Focus on use cases**: Tests verify user workflows work end-to-end
- **Fuzzy testing**: Verify outcomes, not exact UI elements
- **Maintainability**: Update tests when use cases change, not for UI tweaks
- **Coverage goal**: ~95% of errors, not 99.9%

