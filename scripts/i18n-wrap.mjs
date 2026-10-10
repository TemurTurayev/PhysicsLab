// Codemod: wrap every Russian string in src with tr() (gettext style: the Russian text is the key).
// Run once; re-running is safe (already wrapped strings are skipped). Writes src/i18n/keys.json.
//   node scripts/i18n-wrap.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import ts from 'typescript'

const ROOT = new URL('..', import.meta.url).pathname
const SRC = join(ROOT, 'src')
const CYR = /[А-Яа-яЁё]/
const SKIP_DIRS = ['i18n']
const keys = new Set()

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) return SKIP_DIRS.includes(f) ? [] : walk(p)
    return /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.endsWith('.d.ts') ? [p] : []
  })
}

function skip(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isTaggedTemplateExpression(p) || ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isLiteralTypeNode(p) || ts.isTypeNode(p)) return true
    if (ts.isCallExpression(p) && p.expression.getText().startsWith('console.')) return true
    if (ts.isBlock(p) || ts.isSourceFile(p)) break
  }
  const parent = node.parent
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true
  if (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) return true
  if (ts.isCallExpression(parent) && ['t', 'tr'].includes(parent.expression.getText()) && parent.arguments[0] === node) return true
  return false
}

for (const file of walk(SRC)) {
  const text = readFileSync(file, 'utf8')
  if (!CYR.test(text)) continue
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const edits = [] // [start, end, replacement]
  const visit = (node) => {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && CYR.test(node.text) && !skip(node)) {
      keys.add(node.text)
      const src = node.getText(sf)
      if (ts.isJsxAttribute(node.parent)) edits.push([node.getStart(sf), node.getEnd(), `{tr(${src})}`])
      else edits.push([node.getStart(sf), node.getEnd(), `tr(${src})`])
      return
    }
    if (ts.isTemplateExpression(node) && CYR.test(node.getText(sf)) && !skip(node)) {
      let key = node.head.text
      let raw = node.head.rawText ?? ''
      const args = []
      node.templateSpans.forEach((span, i) => {
        key += `{${i}}` + span.literal.text
        raw += `{${i}}` + (span.literal.rawText ?? '')
        args.push(span.expression.getText(sf))
      })
      if (CYR.test(key)) {
        keys.add(key)
        edits.push([node.getStart(sf), node.getEnd(), `tr(\`${raw}\`, [${args.join(', ')}])`])
        // Russian strings nested inside the substitutions are handled by later passes.
        return
      }
    }
    if (ts.isJsxText(node) && CYR.test(node.text)) {
      const full = node.text
      const lead = full.match(/^\s*/)[0]
      const trail = full.match(/\s*$/)[0]
      const body = full.trim().replace(/\s+/g, ' ')
      keys.add(body)
      // JSX collapses whitespace around text; keep a single space where there was one on the same line.
      const keepLead = lead && !lead.includes('\n') ? ' ' : ''
      const keepTrail = trail && !trail.includes('\n') ? ' ' : ''
      edits.push([node.getStart(sf), node.getEnd(), `${lead.includes('\n') ? lead : ''}{${keepLead ? "' ' + " : ''}tr(${JSON.stringify(body)})${keepTrail ? " + ' '" : ''}}${trail.includes('\n') ? trail : ''}`])
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  if (!edits.length) continue
  let out = text
  for (const [s, e, r] of edits.sort((a, b) => b[0] - a[0])) out = out.slice(0, s) + r + out.slice(e)
  if (!/import \{[^}]*\btr\b[^}]*\} from '[^']*i18n'/.test(out)) {
    let rel = relative(dirname(file), join(SRC, 'i18n')).replace(/\\/g, '/')
    if (!rel.startsWith('.')) rel = './' + rel
    const imp = `import { tr } from '${rel}'\n`
    const firstImport = out.search(/^import /m)
    out = firstImport >= 0 ? out.slice(0, firstImport) + imp + out.slice(firstImport) : imp + out
  }
  writeFileSync(file, out)
  console.log('wrapped', relative(ROOT, file), edits.length)
}
writeFileSync(join(SRC, 'i18n', 'keys.json'), JSON.stringify([...keys].sort(), null, 1) + '\n')
console.log('keys:', keys.size)
