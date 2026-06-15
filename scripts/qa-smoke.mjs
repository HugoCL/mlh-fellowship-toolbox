import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { chromium } from "playwright"

const BASE = "http://localhost:3000"
const OUT = path.join(process.cwd(), "qa-screenshots")

const routes = [
  { name: "home", path: "/", expectRedirect: "/sign-in" },
  { name: "sign-in", path: "/sign-in" },
  { name: "sign-up", path: "/sign-up" },
  { name: "dashboard", path: "/dashboard", expectRedirect: "/sign-in" },
  { name: "cohorts", path: "/cohorts", expectRedirect: "/sign-in" },
  { name: "me", path: "/me", expectRedirect: "/sign-in" },
]

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()
  const results = []

  const consoleErrors = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })
  page.on("pageerror", (err) => consoleErrors.push(err.message))

  for (const route of routes) {
    const url = `${BASE}${route.path}`
    const entry = { route: route.name, url, status: "unknown", notes: [] }

    try {
      const response = await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000,
      })
      entry.httpStatus = response?.status() ?? null
      entry.finalUrl = page.url()

      if (route.expectRedirect) {
        if (page.url().includes(route.expectRedirect)) {
          entry.status = "pass"
          entry.notes.push(`Redirected to ${route.expectRedirect}`)
        } else {
          entry.status = "fail"
          entry.notes.push(
            `Expected redirect to ${route.expectRedirect}, got ${page.url()}`,
          )
        }
      } else {
        entry.status = response?.ok() ? "pass" : "fail"
        if (!response?.ok()) entry.notes.push(`HTTP ${response?.status()}`)
      }

      const bodyText = await page.locator("body").innerText()
      if (bodyText.includes("Missing publishableKey")) {
        entry.status = "fail"
        entry.notes.push("Clerk Missing publishableKey error visible")
      }
      if (
        route.name === "sign-in" &&
        !bodyText.match(/sign in|continue|email/i)
      ) {
        entry.status = "fail"
        entry.notes.push("Sign-in UI not detected in page text")
      }

      await page.screenshot({
        path: path.join(OUT, `${route.name}.png`),
        fullPage: true,
      })
    } catch (error) {
      entry.status = "fail"
      entry.notes.push(error instanceof Error ? error.message : String(error))
    }

    results.push(entry)
  }

  await browser.close()

  const report = { timestamp: new Date().toISOString(), results, consoleErrors }
  await writeFile(
    path.join(OUT, "report.json"),
    JSON.stringify(report, null, 2),
  )
  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
