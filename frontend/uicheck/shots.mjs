/*
 * UI screenshot harness.
 *
 * Replaces the deleted `docs/ui-checks-46.mjs` / `ui-checks-49.mjs`, which the CSS
 * still refers to in two places. Kept in the repo this time rather than deleted after
 * use: the same "apparatus thrown away once it had been used" habit is what later left
 * the detection work with no benign corpus to validate a change against (docs/NOTE.md).
 *
 * Usage:
 *   node uicheck/shots.mjs <outDir> [baseURL]
 *
 * Logs in with the seeded admin (both ADMIN and USER roles, so every route is
 * reachable from one session), then captures every page in both themes at desktop and
 * phone widths. Run it once before a restyle and once after, then diff the directories.
 */
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = process.argv[2] ?? 'uicheck/out'
const baseURL = process.argv[3] ?? 'http://localhost:5174'

// The seeded admin's credentials live in the repo-root .env, the same file Vite reads.
const env = Object.fromEntries(
  readFileSync(join(here, '..', '..', '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

/* Every route the app serves, with the widths worth capturing. The prompt result and
 * the review detail are states rather than routes, so they are driven below. */
const ROUTES = [
  ['login', '/login', 'anon'],
  ['register', '/register', 'anon'],
  ['forgot-password', '/forgot-password', 'anon'],
  ['prompt', '/prompt', 'auth'],
  ['history', '/history', 'auth'],
  ['review', '/review', 'auth'],
  ['admin', '/admin', 'auth'],
  ['admin-policy', '/admin/policy', 'auth'],
  ['admin-models', '/admin/models', 'auth'],
]

const VIEWPORTS = [
  ['desktop', { width: 1440, height: 1000 }],
  ['phone', { width: 390, height: 844 }],
]

const consoleErrors = []

async function shoot(page, name) {
  // Let fonts settle before capturing, so a screenshot is not a picture of a font swap.
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.evaluate(() => document.fonts?.ready)
  await page.waitForTimeout(200)
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true })
}

/* Animation and transition are killed before every capture so two runs of this script
 * are comparable pixel for pixel - otherwise a hover sheen or an entrance reveal makes
 * every diff look like a change. */
const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important}'

/* `--disable-web-security` so this harness can run against a Vite dev server on any
 * port. The backend's CORS allow-list is a single origin (`app.cors.frontend-origin`,
 * http://localhost:5173, which the Docker frontend occupies), and a screenshot tool has
 * no business editing that. Turning the check off in THIS browser changes nothing about
 * the app or about how the page lays out, which is all these captures measure. */
const browser = await chromium.launch({
  args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'],
})
mkdirSync(outDir, { recursive: true })

try {
  /* Log in ONCE and reuse the session for every viewport/theme combination. Two
   * reasons: `RateLimitFilter` shares one 5-requests-per-minute bucket across all four
   * auth routes per IP (docs/NOTE.md, Phase 6), so four logins in a row would start
   * returning 429 and the run would fail for environmental reasons; and it is faster. */
  const loginContext = await browser.newContext({ viewport: VIEWPORTS[0][1] })
  const loginPage = await loginContext.newPage()
  await loginPage.goto(baseURL + '/login', { waitUntil: 'domcontentloaded' })
  await loginPage.fill('#username', env.ADMIN_USERNAME)
  await loginPage.fill('#password', env.ADMIN_PASSWORD)
  await loginPage.click('button[type="submit"]')
  /* Wait for the authenticated shell to render rather than for a navigation event:
   * react-router changes the URL client-side, so there is no document load to await. */
  await loginPage.waitForSelector('.navbar-inner, .navbar, nav', { timeout: 30000 })
  const storageState = await loginContext.storageState()
  await loginContext.close()

  for (const [vpName, viewport] of VIEWPORTS) {
    for (const theme of ['dark', 'light']) {
      // --- signed-out pages: a fresh context with no token ---
      const anon = await browser.newContext({ viewport, deviceScaleFactor: 1 })
      await anon.addInitScript((t) => {
        try { localStorage.setItem('theme', t) } catch { /* private mode */ }
      }, theme)
      const anonPage = await anon.newPage()
      anonPage.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(`[${vpName}/${theme}] ${m.text()}`)
      })
      anonPage.on('pageerror', (e) => consoleErrors.push(`[${vpName}/${theme}] ${e.message}`))

      for (const [name, path] of ROUTES.filter((r) => r[2] === 'anon')) {
        await anonPage.goto(baseURL + path, { waitUntil: 'domcontentloaded' })
        await anonPage.addStyleTag({ content: FREEZE })
        await shoot(anonPage, `${vpName}-${theme}-${name}`)
      }
      await anon.close()

      // --- signed-in pages: the saved session, with the theme forced ---
      const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, storageState })
      await ctx.addInitScript((t) => {
        try { localStorage.setItem('theme', t) } catch { /* private mode */ }
      }, theme)
      const page = await ctx.newPage()
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(`[${vpName}/${theme}] ${m.text()}`)
      })
      page.on('pageerror', (e) => consoleErrors.push(`[${vpName}/${theme}] ${e.message}`))

      for (const [name, path] of ROUTES.filter((r) => r[2] === 'auth')) {
        await page.goto(baseURL + path, { waitUntil: 'domcontentloaded' })
        await page.addStyleTag({ content: FREEZE })
        await shoot(page, `${vpName}-${theme}-${name}`)
      }

      /* The prompt result is a state, not a route: submit something that masks so the
       * result card, the entity chips and the risk bar are all on screen at once. */
      await page.goto(baseURL + '/prompt', { waitUntil: 'domcontentloaded' })
      const box = page.locator('textarea').first()
      if (await box.count()) {
        await box.fill('Contact me at uicheck.user@example.com or 9876543210 about ProjectAtlas')
        await page.click('button[type="submit"]')
        await page.waitForSelector('.result-card', { timeout: 90000 }).catch(() => {})
        await page.addStyleTag({ content: FREEZE })
        await shoot(page, `${vpName}-${theme}-prompt-result`)
      }
      await ctx.close()
    }
  }
} finally {
  await browser.close()
}

if (consoleErrors.length) {
  console.log(`\n${consoleErrors.length} console error(s):`)
  for (const e of [...new Set(consoleErrors)]) console.log('  ' + e)
} else {
  console.log('\nNo console errors.')
}
console.log(`Screenshots written to ${outDir}`)
