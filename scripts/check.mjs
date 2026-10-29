/**
 * 校验本仓库能否被 `trellis init --registry` 正确消费。
 *
 * 关键点：index.json 的 path 相对**仓库根**，不是相对 index.json。
 * 写错了会静默装错目录，所以这里断言它真的落在仓库内。
 *
 * 模板内容会原样复制到 .trellis/spec/ 下，因此多个模板之间不能有同名路径；
 * 需要命名空间的模板把自己的文件放进子目录（如 npm-publish/）。
 */
import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function walk(dir, base = dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full, base)))
    else if (entry.isFile()) out.push(path.relative(base, full))
  }
  return out
}

const index = JSON.parse(await readFile(path.join(repoRoot, 'index.json'), 'utf8'))
assert.equal(index.version, 1, 'index.json version must be 1')
assert.ok(Array.isArray(index.templates) && index.templates.length > 0, 'templates must be a non-empty array')

const seen = new Set()
const installPaths = new Map()

for (const template of index.templates) {
  assert.match(template.id, /^[a-z0-9][a-z0-9-]*$/, `invalid template id: ${template.id}`)
  assert.ok(!seen.has(template.id), `duplicate template id: ${template.id}`)
  seen.add(template.id)
  assert.equal(template.type, 'spec', `${template.id}: type must be "spec"`)
  assert.ok(template.name?.trim(), `${template.id}: name is required`)
  assert.ok(template.description === undefined || typeof template.description === 'string')
  assert.ok(template.tags === undefined || Array.isArray(template.tags))

  assert.ok(!path.isAbsolute(template.path), `${template.id}: path must be repo-root relative`)
  assert.ok(!template.path.split('/').includes('..'), `${template.id}: path must stay inside the repo`)

  const directory = path.join(repoRoot, template.path)
  const info = await stat(directory).catch(() => null)
  assert.ok(info?.isDirectory(), `${template.id}: path does not resolve to a directory: ${template.path}`)

  const files = await walk(directory)
  assert.ok(
    files.some((file) => path.basename(file) === 'index.md'),
    `${template.id}: template needs an index.md (root or nested)`,
  )

  // Two templates install into the same .trellis/spec/, so a shared relative
  // path means the second install silently skips that file.
  for (const file of files) {
    const posix = file.split(path.sep).join('/')
    const owner = installPaths.get(posix)
    assert.ok(!owner, `${template.id}: installs over ${posix}, already provided by ${owner}`)
    installPaths.set(posix, template.id)
  }

  for (const file of files.filter((name) => name.endsWith('.md'))) {
    const absolute = path.join(directory, file)
    const text = await readFile(absolute, 'utf8')
    assert.doesNotMatch(text, /\{\{[a-zA-Z]/, `${template.path}/${file} still contains a template placeholder`)
    for (const [, target] of text.matchAll(/\]\(\.\/([^)#]+\.md)\)/g)) {
      const linked = await stat(path.join(path.dirname(absolute), target)).catch(() => null)
      assert.ok(linked?.isFile(), `${template.path}/${file}: broken link -> ${target}`)
    }
  }

  console.log(`ok  ${template.id} -> ${template.path} (${files.length} files)`)
}

console.log(`marketplace index valid: ${index.templates.length} template(s), ${installPaths.size} install path(s)`)
