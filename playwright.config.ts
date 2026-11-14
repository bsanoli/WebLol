import { defineConfig, devices } from "@playwright/test"

const baseURL = "http://127.0.0.1:5180"

export default defineConfig({
  testDir: "./tests",
  use: { ...devices["Desktop Chrome"], baseURL, trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev -- --port 5180",
    url: baseURL,
  },
})
