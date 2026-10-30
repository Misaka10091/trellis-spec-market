/**
 * 校验本仓库能否被 `trellis init --registry` 正确消费。
 *
 * 模型：每个模板是 specs/<id>/ 一个“包”；CLI 会把该目录的**内容**原样拷进
 * .trellis/spec/。因此包里每个顶层目录就是一个“安装命名空间”，会落到
 * .trellis/spec/<命名空间>/。
 *
 * 由此推出三条硬规则：
 * 1. 模板目录里不能直接放文件——所有文件必须在某个顶层命名空间目录下，
 *    否则会落到 .trellis/spec/ 根，覆盖别的模板或 Trellis 自带文件。
 * 2. 命名空间名就是安装后的目录名，必须全局唯一：这样“单独装任意一个 /
 *    叠加装任意多个”都不会互相覆盖（--append 只补缺失文件）。
 * 3. 每个命名空间至少要有 index.md，作为 agent 的入口。
 *
 * index.json 的 path 相对**仓库根**，不是相对 index.json；写错会静默装错目录。
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
const installPaths = new Map() // install-relative path (e.g. plugin/index.md) -> template id
const namespaces = new Map() // namespace dir -> template id

for (const template of index.templates) {
  assert.match(template.id, /^[a-z0-9][a-z0-9-]*$/, `invalid template id: ${template.id}`)
  assert.ok(!seen.has(template.id), `duplicate template id: ${template.id}`)
  seen.add(template.id)
  assert.equal(template.type, 'spec', `${template.id}: type must be "spec"`)
  assert.ok(template.name?.trim(), `${template.id}: name is required`)
  assert.ok(template.description === undefined || typeof template.description === 'string')
  assert.ok(
    template.tags === undefined ||
      (Array.isArray(template.tags) && template.tags.every((tag) => typeof tag === 'string' && tag.trim())),
    `${template.id}: tags must be an array of non-empty strings`,
  )

  assert.ok(!path.isAbsolute(template.path), `${template.id}: path must be repo-root relative`)
  assert.ok(!template.path.includes('\\'), `${template.id}: path must use forward slashes`)
  assert.ok(!template.path.split('/').includes('..'), `${template.id}: path must stay inside the repo`)
  assert.equal(
    path.basename(template.path),
    template.id,
    `${template.id}: index.json path must end with /${template.id}`,
  )

  const directory = path.join(repoRoot, template.path)
  const info = await stat(directory).catch(() => null)
  assert.ok(info?.isDirectory(), `${template.id}: path does not resolve to a directory: ${template.path}`)

  // 顶层条目 = 安装命名空间。必须是目录；不能直接放文件。
  const topEntries = await readdir(directory, { withFileTypes: true })
  assert.ok(topEntries.length > 0, `${template.id}: template has no namespace directory`)
  for (const entry of topEntries) {
    assert.ok(entry.isDirectory(), `${template.id}: "${entry.name}" must be a namespace directory, not a file`)
    assert.match(entry.name, /^[a-z0-9][a-z0-9-]*$/, `${template.id}: invalid namespace name: ${entry.name}`)
    const owner = namespaces.get(entry.name)
    assert.ok(
      !owner,
      `${template.id}: namespace "${entry.name}" already used by ${owner}; namespaces must be globally unique so any combination of templates installs without collisions`,
    )
    namespaces.set(entry.name, template.id)
  }

  const files = (await walk(directory)).map((file) => file.split(path.sep).join('/'))
  for (const entry of topEntries) {
    assert.ok(
      files.includes(`${entry.name}/index.md`),
      `${template.id}: namespace ${entry.name} needs ${entry.name}/index.md`,
    )
  }

  // 安装后的相对路径 = 模板内的相对路径（含命名空间）。共享路径会让叠加安装静默跳过。
  for (const file of files) {
    const owner = installPaths.get(file)
    assert.ok(!owner, `${template.id}: installs over ${file}, already provided by ${owner}`)
    installPaths.set(file, template.id)
  }

  const rootPrefix = path.resolve(directory) + path.sep
  for (const file of files.filter((name) => name.endsWith('.md'))) {
    const absolute = path.join(directory, ...file.split('/'))
    const text = await readFile(absolute, 'utf8')
    assert.doesNotMatch(text, /\{\{[a-zA-Z]/, `${template.path}/${file} still contains a template placeholder`)
    // 只查相对链接：允许 #anchor，并防止 ../ 逃出模板目录。
    for (const [, target] of text.matchAll(/\]\(((?:\.\.?\/)[^)#\n]*\.md)(?:#[^)\n]*)?\)/g)) {
      const resolved = path.resolve(path.dirname(absolute), target)
      assert.ok(resolved.startsWith(rootPrefix), `${template.path}/${file}: link escapes template -> ${target}`)
      const linked = await stat(resolved).catch(() => null)
      assert.ok(linked?.isFile(), `${template.path}/${file}: broken link -> ${target}`)
    }
  }

  console.log(
    `ok  ${template.id} -> ${template.path} (namespace: ${topEntries.map((entry) => entry.name).join(', ')}, ${files.length} files)`,
  )
}

console.log(
  `marketplace index valid: ${index.templates.length} template(s), ${namespaces.size} namespace(s), ${installPaths.size} install path(s)`,
)
