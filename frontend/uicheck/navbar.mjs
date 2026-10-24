/* Close-up of the navbar's account cluster, at rest and hovered, in both themes. */
import { chromium } from '@playwright/test'
import { readFileSync, mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:5174'
const out = 'uicheck/navbar'
mkdirSync(out, { recursive: true })
const env = Object.fromEntries(
  readFileSync('../.env', 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))

const browser = await chromium.launch({ args: ['--disable-web-security'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
await page.goto(base + '/login', { waitUntil: 'domcontentloaded' })
await page.fill('#username', env.ADMIN_USERNAME)
await page.fill('#password', env.ADMIN_PASSWORD)
await page.click('button[type="submit"]')
await page.waitForSelector('.navbar-logout', { timeout: 30000 })

for (const theme of ['dark', 'light']) {
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
  await page.waitForTimeout(250)
  const bar = page.locator('.navbar').first()
  await bar.screenshot({ path: `${out}/${theme}-rest.png` })
  await page.hover('.navbar-logout')
  await page.waitForTimeout(350)
  await bar.screenshot({ path: `${out}/${theme}-hover.png` })
  await page.mouse.move(0, 0)
  await page.waitForTimeout(250)
}
await browser.close()
console.log('navbar close-ups written to ' + out)
