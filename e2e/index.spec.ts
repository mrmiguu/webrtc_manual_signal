import { it, expect } from "@playwright/test"

it("can connect to our web app", async ({ page }) => {
  const response = await page.goto("http://localhost:1234/")
  expect(response.status()).toBe(200)
})
