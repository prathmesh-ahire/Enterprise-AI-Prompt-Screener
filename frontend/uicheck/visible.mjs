/*
 * Guards the entrance animation (components.css, "ENTRANCE").
 *
 * shots.mjs disables animation before every capture, so a screenshot can never catch
 * an element left stuck at `opacity: 0` by a `both`-filled keyframe. This loads each
 * page with animation ENABLED, waits for it to finish, and asserts that every direct
 * child of the animated containers really did settle at full opacity.
 */
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

const baseURL = process.argv[2] ?? 'http://localhost:5174'
const env = Object.fromEntries(
  readFileSync('../.env', 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const browser = await chromium.launch({ args: ['--disable-web-security'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
const failures = []

async function assertVisible(path, label) {
  await page.goto(baseURL + path, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)          // longer than dur-slow + the largest delay
  const bad = await page.evaluate(() => {
    const out = []
    for (const parent of document.querySelectorAll('.page-content, .auth-split')) {
      for (const el of parent.children) {
        const cs = getComputedStyle(el)
        if (parseFloat(cs.opacity) < 0.99) {
          out.push(`${el.className || el.tagName} opacity=${cs.opacity}`)
        }
      }
    }
    return out
  })
  if (bad.length) failures.push(`${label}: ${bad.join(', ')}`)
  else console.log(`  ok  ${label}`)
}

await assertVisible('/login', 'login (auth-split)')
await page.goto(baseURL + '/login', { waitUntil: 'domcontentloaded' })
await page.fill('#username', env.ADMIN_USERNAME)
await page.fill('#password', env.ADMIN_PASSWORD)
await page.click('button[type="submit"]')
await page.waitForSelector('.navbar-inner, .navbar, nav', { timeout: 30000 })
for (const [p, l] of [['/prompt', 'prompt'], ['/history', 'history'], ['/review', 'review'],
                      ['/admin', 'admin'], ['/admin/policy', 'policy'], ['/admin/models', 'models']]) {
  await assertVisible(p, l)
}
await browser.close()

if (failures.length) {
  console.log('\nFAILURES — content left invisible:')
  for (const f of failures) console.log('  ' + f)
  process.exit(1)
}
console.log('\nAll animated children settled at full opacity.')
