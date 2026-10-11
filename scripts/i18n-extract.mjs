// Collect every tr('…') key in src into src/i18n/keys.json — the list the translations must cover.
//   node scripts/i18n-extract.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

const SRC = new URL('../src', import.meta.url).pathname
const keys = new Set()
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : /\.tsx?$/.test(f) && !/\.test\./.test(f) ? [join(d, f)] : []))
for (const file of walk(SRC)) {
  const text = readFileSync(file, 'utf8')
  if (!text.includes('tr(')) continue
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const visit = (n) => {
    if (ts.isCallExpression(n) && n.expression.getText(sf) === 'tr' && n.arguments[0]) {
      const a = n.arguments[0]
      if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) keys.add(a.text)
      else console.warn('non-literal tr() key in', file, a.getText(sf).slice(0, 60))
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
}
writeFileSync(join(SRC, 'i18n', 'keys.json'), JSON.stringify([...keys].sort(), null, 1) + '\n')
console.log('keys:', keys.size)
