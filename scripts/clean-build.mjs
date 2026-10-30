// Removes previous build output before a fresh build.
//
// Vite 8.2.1 (rolldown) does not currently honour `build.emptyOutDir`, and
// `tsc -p tsconfig.sdk.json` never removes output for source files that were
// deleted. Without this step a branch-based GitHub Pages deploy would keep
// uploading superseded hashed bundles, and a stale file could survive into the
// published npm package. See docs/deployment.md.
import { rmSync } from 'node:fs'

for (const target of ['dist', 'dist-sdk']) {
  rmSync(target, { recursive: true, force: true })
}
