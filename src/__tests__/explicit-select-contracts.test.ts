import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx'])

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    const extension = entry.name.slice(entry.name.lastIndexOf('.'))
    return SOURCE_EXTENSIONS.has(extension) ? [path] : []
  })
}

describe('Supabase projection contracts', () => {
  it('does not use response-facing wildcard projections', () => {
    const root = process.cwd()
    const wildcardSelect = /\.select\(\s*['"`]\s*\*/m
    const offenders = sourceFiles(join(root, 'src'))
      .filter(path => wildcardSelect.test(readFileSync(path, 'utf8')))
      .map(path => relative(root, path).replaceAll('\\', '/'))

    expect(offenders).toEqual([])
  })
})
