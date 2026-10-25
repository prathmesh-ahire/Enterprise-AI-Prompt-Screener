/*
 * Quick page captures while the V2 design work is in progress (todo 56A.7).
 *
 * Usage: node uicheck/pages.mjs <outDir> [baseURL] [path...]
 * Logs in once with the seeded admin from the repo-root .env, then captures each path
 * full-page at 1440x1000. If a path's first table has an expander, the first row is opened
 * and captured again as <name>-open.png. Desktop only, dark only.
 */
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const [outDir = 'uicheck/out', baseURL = 'http://localhost:5174', ...paths] = process.argv.slice(2)
const env = Object.fromEntries(
  readFileSync(join(here, '..', '..', '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ args: ['--disable-web-security'] })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.goto(baseURL + '/login')
await page.fill('#username', env.ADMIN_USERNAME)
await page.fill('#password', env.ADMIN_PASSWORD)
await page.click('button[type="submit"]')
await page.waitForSelector('.ps-appbar', { timeout: 30000 })

for (const path of paths.length ? paths : ['/prompt', '/history', '/review', '/admin', '/admin/policy', '/admin/models']) {
  const name = path.replace(/^\//, '').replace(/\//g, '-') || 'root'
  await page.goto(baseURL + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true })
  const expander = page.locator('.ps-expander').first()
  if (await expander.count()) {
    await expander.click()
    await page.waitForTimeout(1200)
    await page.screenshot({ path: join(outDir, `${name}-open.png`), fullPage: true })
  }
}
await browser.close()
console.log(errors.length ? `page errors:\n  ${errors.join('\n  ')}` : 'no page errors')
