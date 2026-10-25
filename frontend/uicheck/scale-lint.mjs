/*
 * Design-scale lint. Zero dependencies; run with `node uicheck/scale-lint.mjs`.
 *
 * Every font, radius and spacing value in the stylesheets sits on the design's named
 * scale (design.md sections 4b, 5 and 6; tokens in src/index.css). Nothing else enforces
 * that, and the failure mode is silent: one `padding: 7px` added in a hurry does not break
 * a build, it just puts one component half a pixel off every other component, and after
 * twenty of those the UI looks hand-tuned again.
 *
 * Checks (todo 56A.9, decision C9), over index.css, styles/components.css and
 * styles/site.css when it exists:
 *   1. every font-size and every `font:` shorthand is a var(--text-*) (or inherit), with
 *      no raw px size in either
 *   2. every border-radius is a var(--radius-*), 0, 1px, 2px or 50%
 *   3. every padding/margin/gap length is a var(--space-*), a calc() of them, 0, auto, a
 *      percentage, or ±1px / ±2px
 *   4. no font-weight outside the faces main.tsx actually imports
 * Custom-property definitions are skipped - that is where the raw values belong.
 */
import { existsSync, readFileSync } from 'node:fs'

const FILES = ['src/index.css', 'src/styles/components.css', 'src/styles/site.css'].filter(existsSync)
/* Only 400/500/600/700 faces are imported, and `font-synthesis: none` is set, so anything
 * else silently falls back. */
const ALLOWED_WEIGHTS = new Set(['400', '500', '600', '700', 'normal', 'bold', 'inherit'])
/* Hairlines and tiny nudges stay raw (design.md section 6, "What may stay raw"). */
const RAW_OK = new Set(['0', '0px', '1px', '2px', '-1px', '-2px'])

let problems = 0
const report = (file, line, msg) => {
  console.log(`  ${file}:${line}  ${msg}`)
  problems++
}

// A calc() is on the scale when every length inside it is a --space-* var or a raw-OK value.
const calcOnScale = (v) => {
  const vars = [...v.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1])
  const lengths = v.replace(/var\([^)]*\)/g, '').match(/-?\d*\.?\d+(px|rem|em)\b/g) ?? []
  return vars.every((n) => n.startsWith('--space-')) && lengths.every((l) => RAW_OK.has(l))
}

// Splits a value into top-level tokens, keeping var(...) and calc(...) whole.
const tokens = (v) => {
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of v.trim()) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (/\s/.test(ch) && depth === 0) {
      if (cur) out.push(cur)
      cur = ''
    } else cur += ch
  }
  if (cur) out.push(cur)
  return out
}

for (const file of FILES) {
  const src = readFileSync(file, 'utf8')
  // Blank out comments but keep their newlines, so offsets still map to the right line.
  const css = src.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
  const lineOf = (offset) => css.slice(0, offset).split('\n').length
  const lines = src.split('\n')

  // A declaration is `name: value` that follows a `{` or `;` and ends at `;` or `}`. That
  // excludes selectors such as `a:hover {`, and catches values split over several lines.
  for (const m of css.matchAll(/(?<=[{;])\s*([\w-]+)\s*:\s*([^;{}]+?)\s*(?=[;}])/g)) {
    const [, prop, value] = m
    if (prop.startsWith('--')) continue // a token definition
    const n = lineOf(m.index + m[0].indexOf(prop))
    /* An explicit, in-file opt-out for a value that genuinely is not a scale step. It has
     * to be written on the declaration's own line, so the reason is visible at the point
     * of the exception rather than buried in this script. */
    if (lines[n - 1].includes('scale-lint-ignore')) continue
    const v = value.replace(/\s*!important$/, '')

    if (prop === 'font-size' || prop === 'font') {
      if (v !== 'inherit' && !/^var\(--text-[\w-]+\)$/.test(v)) {
        report(file, n, `${prop} is not a var(--text-*): ${v}`)
      }
    }

    if (prop === 'border-radius' || /^border-(top|bottom|start|end)-(left|right|start|end)-radius$/.test(prop)) {
      for (const tok of tokens(v)) {
        if (!/^var\(--radius-[\w-]+\)$/.test(tok) && !['0', '1px', '2px', '50%', 'inherit'].includes(tok)) {
          report(file, n, `${prop} off the scale: ${tok}`)
        }
      }
    }

    if (/^(padding|margin|gap|row-gap|column-gap)(-(top|bottom|left|right|inline|block)(-(start|end))?)?$/.test(prop)) {
      for (const tok of tokens(v)) {
        const ok = RAW_OK.has(tok)
          || /^var\(--space-[\w-]+\)$/.test(tok)
          || (tok.startsWith('calc(') && calcOnScale(tok))
          || /^-?\d*\.?\d+%$/.test(tok)
          || ['auto', 'inherit', 'normal'].includes(tok)
        if (!ok) report(file, n, `${prop} off the scale: ${tok}`)
      }
    }

    if (prop === 'font-weight' && !ALLOWED_WEIGHTS.has(v)) {
      report(file, n, `font-weight ${v} is not an imported face (400/500/600/700)`)
    }
  }
}

if (problems) {
  console.log(`\n${problems} scale violation(s).`)
  process.exit(1)
}
console.log(`Scale lint clean over ${FILES.join(', ')}: every font, radius, spacing value and weight is on the scale.`)
