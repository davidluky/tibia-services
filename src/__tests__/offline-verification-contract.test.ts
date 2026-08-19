import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('offline verification command', () => {
  it('aggregates every local gate and forces the audit offline', () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> }

    expect(packageJson.scripts['audit:offline']).toContain('npm audit --offline')
    for (const gate of ['lint', 'typecheck', 'test', 'build', 'audit:offline']) {
      expect(packageJson.scripts['quality:offline']).toContain(gate)
    }
    expect(packageJson.scripts['verify:offline']).toContain('quality:offline')
    expect(packageJson.scripts['verify:offline']).toContain('package')
  })
})
