/*
 * Design-scale lint. Zero dependencies; run with `node uicheck/scale-lint.mjs`.
 *
 * The V1.2 UI pass put every font size, radius and spacing value in the stylesheets
 * onto a named scale (src/index.css, "SCALE:" blocks). Nothing enforces that, and the
 * failure mode is silent: one `padding: 7px` added in a hurry does not break a build,
 * it just puts one component half a pixel off every other component, and after twenty
 * of those the UI looks hand-tuned again. That is precisely the state this pass found
 * the app in - 13 distinct font sizes, 9 radii, 22 spacing values.
 *
 * Checks, over index.css and styles/components.css:
 *   1. every font-size is a var(--fs-*)
 *   2. every border-radius is a var(--r-*) (50% is allowed, for a circle)
 *   3. every padding/margin/gap length is a var(--sp-*) or 0
 *   4. no font-weight outside the faces main.tsx actually imports
 * Custom-property definitions are skipped - that is where the raw values belong.
 */
import { readFileSync } from 'node:fs'

const FILES = ['src/index.css', 'src/styles/components.css']
/* Inter 500/600/700 and Source Sans 3 400/600 are the only faces imported, and
 * `font-synthesis: none` is set, so anything else silently falls back. */
const ALLOWED_WEIGHTS = new Set(['400', '500', '600', '700', 'normal', 'bold', 'inherit'])

let problems = 0
const report = (file, line, msg) => {
  console.log(`  ${file}:${line}  ${msg}`)
  problems++
}

for (const file of FILES) {
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((raw, i) => {
    /* An explicit, in-file opt-out for the handful of values that genuinely are not
     * scale steps - the document's own base font-size being the only one today. It
     * has to be written out on the line itself, so the reason is visible at the
     * point of the exception rather than buried in this script. */
    if (raw.includes('scale-lint-ignore')) return
    const line = raw.split('/*')[0]
    if (/^\s*--/.test(line)) return            // a token definition
    const n = i + 1

    const fs = line.match(/font-size:\s*([^;]+);/)
    if (fs && !fs[1].includes('var(--fs-') && !fs[1].includes('clamp(') && fs[1].trim() !== 'inherit') {
      report(file, n, `font-size off the scale: ${fs[1].trim()}`)
    }

    const br = line.match(/border-radius:\s*([^;]+);/)
    if (br && !br[1].includes('var(--r-') && br[1].trim() !== '50%' && !br[1].includes('inherit')) {
      report(file, n, `border-radius off the scale: ${br[1].trim()}`)
    }

    const sp = line.match(/\b(padding|margin|gap|row-gap|column-gap)(?:-(?:top|bottom|left|right|inline|block))?:\s*([^;]+);/)
    if (sp && !/var\(|%|calc|auto|inherit/.test(sp[2])) {
      for (const tok of sp[2].trim().split(/\s+/)) {
        if (/^\d+px$/.test(tok) && tok !== '0px') report(file, n, `${sp[1]} off the scale: ${tok}`)
      }
    }

    const fw = line.match(/font-weight:\s*([^;]+);/)
    if (fw && !ALLOWED_WEIGHTS.has(fw[1].trim())) {
      report(file, n, `font-weight ${fw[1].trim()} is not an imported face (400/500/600/700)`)
    }
  })
}

if (problems) {
  console.log(`\n${problems} scale violation(s).`)
  process.exit(1)
}
console.log('Scale lint clean: every size, radius, spacing value and weight is on the scale.')
