import * as fs from 'fs';
import * as path from 'path';

const SPEC = /\.spec\.ts$/;
const PLACEHOLDER = /\btest\.fixme\s*\(/;
const REAL_TEST = /(^|[^.\w])test\s*\(/m;

// A screen with no specs yet keeps a file holding a single test.fixme, so the
// backlog stays visible in the tree. Those are not results: counting them made a
// clean run read 76 of 93, and the re-run then reported them as passes.
export function unwrittenSpecs(testDir: string): string[] {
  const found: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (SPEC.test(entry.name)) {
        const source = fs.readFileSync(full, 'utf8');
        // Only whole-placeholder files: a spec holding real tests as well stays in.
        if (PLACEHOLDER.test(source) && !REAL_TEST.test(source)) {
          found.push(full.replace(/\\/g, '/'));
        }
      }
    }
  };

  walk(testDir);
  return found;
}
