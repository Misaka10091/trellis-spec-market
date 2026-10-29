/**
 * 校验本仓库能否被 `trellis init --registry` 正确消费。
 *
 * 关键点：index.json 的 path 相对**仓库根**，不是相对 index.json。
 * 写错了会静默装错目录，所以这里断言它真的落在仓库内。
 */
import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const index = JSON.parse(await readFile(path.join(repoRoot, 'index.json'), 'utf8'))
assert.equal(index.version, 1, 'index.json version must be 1')
assert.ok(Array.isArray(index.templates) && index.templates.length > 0, 'templates must be a non-empty array')

const seen = new Set()
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

  const files = await readdir(directory)
  assert.ok(files.includes('index.md'), `${template.id}: template needs an index.md`)

  for (const file of files.filter((name) => name.endsWith('.md'))) {
    const text = await readFile(path.join(directory, file), 'utf8')
    assert.doesNotMatch(text, /\{\{[a-zA-Z]/, `${template.path}/${file} still contains a template placeholder`)
    for (const [, target] of text.matchAll(/\]\(\.\/([^)#]+\.md)\)/g)) {
      const linked = await stat(path.join(directory, target)).catch(() => null)
      assert.ok(linked?.isFile(), `${template.path}/${file}: broken link -> ${target}`)
    }
  }

  console.log(`ok  ${template.id} -> ${template.path} (${files.length} files)`)
}

console.log(`marketplace index valid: ${index.templates.length} template(s)`)
