import { defineConfig, devices } from '@playwright/test';

const e2eDatabaseUrl = 'mysql://ddc_e2e:ddc_e2e_password@127.0.0.1:13306/ddc_e2e';
const serverEnvironment = {
    MODE: 'development',
    NODE_ENV: 'test',
    PORT: '18081',
    DATABASE_URL: e2eDatabaseUrl,
    CLIENT_URL: 'http://127.0.0.1:13001',
    COOKIE_NAME: 'ddc_e2e_session',
    // Test-only key: keep the isolated server independent of local .env secrets.
    SESSION_TOKEN_SECRET: 'e2e-only-session-token-secret',
    CSRF_SECRET: 'e2e-csrf-secret',
};

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://127.0.0.1:13001',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
        },
        {
            name: 'anonymous',
            testMatch: /app\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'chromium',
            dependencies: ['setup'],
            testIgnore: /.*(\.setup|app\.spec)\.ts/,
            use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/admin.json' },
        },
    ],
    webServer: [
        {
            command: 'npm --prefix server start',
            url: 'http://127.0.0.1:18081/api/v1/health',
            reuseExistingServer: false,
            env: serverEnvironment,
        },
        {
            command: 'npm --prefix client run start:e2e',
            url: 'http://127.0.0.1:13001',
            reuseExistingServer: false,
            env: { CLIENT_API_URL: 'http://127.0.0.1:18081', E2E: 'true' },
        },
    ],
});
