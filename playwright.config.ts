import { defineConfig, devices } from "@playwright/test";

// Runs against a production build (`npm run build` first). Fresh database on
// every run so the first visit really is the /setup flow.
const PORT = 3711;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    // Mobile first: the phone project runs first and is the reference.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATA_DIR: ".e2e-data",
      API_TOKEN: "e2e-token",
      DEFAULT_LOCALE: "nl",
    },
  },
});
