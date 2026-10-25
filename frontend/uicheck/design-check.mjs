/*
 * The design checks of todo 56A.10, run in a real browser against a running app.
 *
 * Usage: DEMO_PASSWORD=<the demo accounts' password> node uicheck/design-check.mjs [baseURL]
 *
 * The admin signs in from the repo-root .env. The REVIEWER and USER checks sign in as
 * demo_reviewer and demo_user1 (backend demo-data.sql) with DEMO_PASSWORD from the
 * environment, so no password is written into this file; without it those checks are
 * skipped and say so. Desktop only: every check runs at 1280, 1440 and/or 1920 px.
 *
 * Checks:
 *   - sign-in pages: one centred 400px card with one primary button, at all three widths;
 *   - the navbar fits on one line at 1280px for each role, and each role sees only its links;
 *   - no page scrolls sideways at 1280, 1440 or 1920, and no page throws;
 *   - no version label in the footer, and the document title carries the full product name;
 *   - REVIEW is cyan: badge, result card, donut slice and legend, score bar;
 *   - medium-severity chips are grey;
 *   - reduced motion makes transitions instant and stops the spinner;
 *   - no raw email, phone, card number or key in History or the Review queue.
 * It makes no change to any data: it only reads pages and opens expandable rows.
 */
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const baseURL = process.argv[2] ?? 'http://localhost:5174'
const env = Object.fromEntries(
  readFileSync(join(here, '..', '..', '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const WIDTHS = [1280, 1440, 1920]
const CYAN = 'rgb(34, 211, 238)'      // --review #22D3EE
const GREY = 'rgb(173, 176, 184)'     // --sev-medium #ADB0B8
const PRODUCT = 'Enterprise AI Prompt Screener'

const failures = []
const notes = []
const check = (ok, label, detail = '') => {
  if (ok) console.log(`  ok    ${label}`)
  else { console.log(`  FAIL  ${label}${detail ? ` (${detail})` : ''}`); failures.push(label) }
}

const browser = await chromium.launch({ args: ['--disable-web-security'] })
const pageErrors = []
const newPage = async (ctx) => {
  const p = await ctx.newPage()
  p.on('pageerror', (e) => pageErrors.push(e.message))
  return p
}

async function signIn(username, password, width = 1280) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } })
  const page = await newPage(ctx)
  await page.goto(baseURL + '/login', { waitUntil: 'domcontentloaded' })
  await page.fill('#username', username)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForSelector('.ps-appbar', { timeout: 30000 })
  return { ctx, page }
}

const noSideScroll = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

try {
  console.log('Sign-in pages')
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await newPage(ctx)
    for (const path of ['/login', '/register', '/forgot-password']) {
      await page.goto(baseURL + path, { waitUntil: 'networkidle' })
      const shape = await page.evaluate(() => {
        const col = document.querySelector('.auth-column')
        const r = col?.getBoundingClientRect()
        return {
          width: r ? Math.round(r.width) : null,
          centred: r ? Math.abs(r.left + r.width / 2 - window.innerWidth / 2) <= 1 : false,
          cards: document.querySelectorAll('.auth-column .ps-card').length,
          primaries: document.querySelectorAll('.auth-column .ps-btn--primary').length,
          name: document.querySelector('.auth-name')?.textContent?.trim(),
        }
      })
      check(shape.width === 400 && shape.centred && shape.cards === 1 && shape.primaries === 1 && shape.name === PRODUCT,
        `${path} at ${width}: one centred 400px card, one primary button, full name above`, JSON.stringify(shape))
      check(await noSideScroll(page), `${path} at ${width}: no sideways scroll`)
    }
    await ctx.close()
  }

  const roles = [
    ['ADMIN', env.ADMIN_USERNAME, env.ADMIN_PASSWORD,
      ['Prompt', 'History', 'Review queue', 'Admin dashboard', 'Policy', 'Models']],
    ['REVIEWER', 'demo_reviewer', process.env.DEMO_PASSWORD, ['Prompt', 'History', 'Review queue']],
    ['USER', 'demo_user1', process.env.DEMO_PASSWORD, ['Prompt', 'History']],
  ]
  const ROUTE_LABELS = [
    ['/prompt', 'Prompt'], ['/history', 'History'], ['/review', 'Review queue'],
    ['/admin', 'Admin dashboard'], ['/admin/policy', 'Policy'], ['/admin/models', 'Models'],
  ]
  console.log('\nNavbar and pages, per role, at 1280px')
  for (const [role, username, password, expected] of roles) {
    if (!password) { notes.push(`${role} navbar check skipped: DEMO_PASSWORD not set`); continue }
    const { ctx, page } = await signIn(username, password, 1280)
    const bar = await page.evaluate(() => {
      const appbar = document.querySelector('.ps-appbar')
      const tops = [...appbar.querySelectorAll('.ps-wordmark, .ps-appnav a, .ps-appbar__user > *')]
        .map((el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2 })
      return {
        links: [...appbar.querySelectorAll('.ps-appnav a')].map((a) => a.textContent.trim()),
        oneLine: Math.max(...tops) - Math.min(...tops) <= 2,
        fits: appbar.scrollWidth <= appbar.clientWidth,
      }
    })
    check(JSON.stringify(bar.links) === JSON.stringify(expected), `${role} sees only its links`, bar.links.join(', '))
    check(bar.oneLine && bar.fits, `${role} navbar on one line at 1280px`, JSON.stringify(bar))

    // Walk the role's pages: each of its own renders a page head; every other one sends it
    // away (RoleProtectedRoute redirects rather than rendering a forbidden page).
    for (const [path, label] of ROUTE_LABELS) {
      await page.goto(baseURL + path, { waitUntil: 'networkidle' })
      const landed = new URL(page.url()).pathname
      if (expected.includes(label)) {
        const head = await page.locator('.ps-page-head').count()
        check(landed === path && head > 0 && await noSideScroll(page), `${role} opens ${path}`, landed)
      } else {
        check(landed !== path, `${role} is kept out of ${path}`, landed)
      }
    }
    await ctx.close()
  }

  console.log('\nApp pages as ADMIN at 1280, 1440 and 1920')
  const appPaths = ['/prompt', '/history', '/review', '/admin', '/admin/policy', '/admin/models']
  const { ctx: adminCtx, page } = await signIn(env.ADMIN_USERNAME, env.ADMIN_PASSWORD, 1440)
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of appPaths) {
      await page.goto(baseURL + path, { waitUntil: 'networkidle' })
      check(await noSideScroll(page), `${path} at ${width}: no sideways scroll`)
    }
  }
  const shell = await page.evaluate(() => ({
    footer: document.querySelector('.app-footer')?.textContent ?? '',
    title: document.title,
  }))
  check(!/\bv\d/i.test(shell.footer), 'footer shows no version label', shell.footer)
  check(shell.title.includes(PRODUCT), 'document title carries the full product name', shell.title)

  console.log('\nREVIEW is cyan, medium severity is grey')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(baseURL + '/history', { waitUntil: 'networkidle' })
  const historyBadge = await page.evaluate(() => {
    const b = document.querySelector('.ps-badge--review')
    return b ? getComputedStyle(b).color : null
  })
  if (historyBadge === null) notes.push('No REVIEW row on the first History page; badge checked on the dashboard legend instead')
  else check(historyBadge === CYAN, 'History REVIEW badge is cyan', historyBadge)

  await page.goto(baseURL + '/admin', { waitUntil: 'networkidle' })
  const donut = await page.evaluate(() => ({
    slice: [...document.querySelectorAll('.chart-card path')].some((p) => (p.getAttribute('fill') ?? '').toUpperCase() === '#22D3EE'),
    legend: (() => { const b = document.querySelector('.chart-legend .ps-badge--review'); return b ? getComputedStyle(b).color : null })(),
  }))
  if (donut.legend === null) notes.push('No REVIEW decisions in the last 7 days, so the donut has no REVIEW slice to check')
  else {
    check(donut.slice, 'donut REVIEW slice is #22D3EE')
    check(donut.legend === CYAN, 'donut legend REVIEW badge is cyan', donut.legend)
  }

  await page.goto(baseURL + '/review', { waitUntil: 'networkidle' })
  const expander = page.locator('.ps-expander').first()
  if (await expander.count()) {
    await expander.click()
    await page.waitForSelector('.ps-score', { timeout: 10000 }).catch(() => {})
    const bar = await page.evaluate(() => {
      const fill = document.querySelector('.ps-score [class*="bg-"]')
      return fill ? { cls: fill.className, bg: getComputedStyle(fill).backgroundColor } : null
    })
    if (!bar) check(false, 'Review queue score bar renders')
    else if (bar.cls.includes('bg-review')) check(bar.bg === CYAN, 'REVIEW-band score bar is cyan', bar.bg)
    else notes.push(`The first queued item's band is not review (${bar.cls}); the score bar follows the API band (C11)`)
  } else notes.push('Review queue empty; score bar not checked')

  // The result card and the chips are states of the Prompt page; reaching them means
  // screening a new prompt, which writes a record. Render the same classes in place instead.
  const rendered = await page.evaluate(() => {
    const host = document.createElement('div')
    host.innerHTML = '<div class="ps-alert ps-alert--review"><span class="ps-badge ps-badge--review">REVIEW</span></div>'
      + '<span class="ps-chip ps-chip--medium"><span class="ps-chip__sev">Medium</span>Email address</span>'
    document.querySelector('.app-main').appendChild(host)
    const out = {
      alertAccent: getComputedStyle(host.querySelector('.ps-alert')).getPropertyValue('--c').trim(),
      alertBadge: getComputedStyle(host.querySelector('.ps-badge')).color,
      // The chip's label stays text-primary; severity colours its border, dot and word.
      chipBorder: getComputedStyle(host.querySelector('.ps-chip')).borderTopColor,
      chipDot: getComputedStyle(host.querySelector('.ps-chip'), '::before').backgroundColor,
      chipWord: getComputedStyle(host.querySelector('.ps-chip__sev')).color,
    }
    host.remove()
    return out
  })
  check(rendered.alertAccent.toUpperCase() === '#22D3EE' || rendered.alertAccent === 'var(--review)',
    'REVIEW result card accent is the review token', rendered.alertAccent)
  check(rendered.alertBadge === CYAN, 'REVIEW result card badge is cyan', rendered.alertBadge)
  check([rendered.chipBorder, rendered.chipDot, rendered.chipWord].every((c) => c === GREY),
    'medium-severity chip border, dot and word are grey', JSON.stringify(rendered))

  console.log('\nNo raw sensitive values in History or the Review queue')
  const SENSITIVE = [
    ['email', /[\w.+-]+@[\w-]+\.[\w.]+/],
    ['phone', /(?<!\d)[6-9]\d{9}(?!\d)/],
    ['card', /(?<!\d)(?:\d[ -]?){13,16}(?!\d)/],
    ['key', /\b(?:sk-[A-Za-z0-9]{10,}|AKIA[A-Z0-9]{12,}|ghp_[A-Za-z0-9]{20,})/],
  ]
  for (const path of ['/history', '/review']) {
    await page.goto(baseURL + path, { waitUntil: 'networkidle' })
    const ex = page.locator('.ps-expander')
    const n = Math.min(await ex.count(), 5)
    for (let i = 0; i < n; i++) await ex.nth(i).click()
    await page.waitForTimeout(300)
    const text = await page.locator('.app-main').innerText()
    const hits = SENSITIVE.filter(([, re]) => re.test(text)).map(([name]) => name)
    check(hits.length === 0, `${path}: no raw sensitive value in the first ${n} opened rows`, hits.join(', '))
  }
  await adminCtx.close()

  console.log('\nReduced motion')
  const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const rmPage = await newPage(rm)
  await rmPage.goto(baseURL + '/login', { waitUntil: 'networkidle' })
  const motion = await rmPage.evaluate(() => {
    const btn = document.querySelector('.ps-btn')
    const spin = document.createElement('span')
    spin.className = 'ps-spinner'
    document.body.appendChild(spin)
    const out = {
      transition: getComputedStyle(btn).transitionDuration,
      spinner: getComputedStyle(spin).animationName,
    }
    spin.remove()
    return out
  })
  check(motion.transition.split(',').every((d) => parseFloat(d) === 0), 'reduced motion: transitions are instant', motion.transition)
  check(motion.spinner === 'none', 'reduced motion: the spinner stops', motion.spinner)
  await rm.close()
} finally {
  await browser.close()
}

check(pageErrors.length === 0, 'no page threw an error', [...new Set(pageErrors)].join(' | '))
for (const n of notes) console.log(`  note  ${n}`)
if (failures.length) {
  console.log(`\n${failures.length} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll design checks passed.')
