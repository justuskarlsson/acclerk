import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright configuration for E2E integration tests
 * 
 * Environment: .env.test (port 3002)
 * Database: DATABASE_URL from .env.test
 * 
 * Run with: pnpm test:e2e (loads .env.test via dotenv-cli)
 */
export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: "html",
    globalSetup: "./tests/global-setup.ts",
    use: {
        baseURL: "http://localhost:3002",
        trace: "on-first-retry",
    },

    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
                // Use storage state saved by globalSetup
                storageState: "playwright/.auth/user.json",
            },
        },
    ],

    webServer: {
        command: "next dev -p 3002",
        url: "http://localhost:3002",
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
        // Show server-side console.log output
        stdout: "pipe",
        stderr: "pipe",
    },
})
