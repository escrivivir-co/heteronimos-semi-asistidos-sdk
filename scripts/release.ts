#!/usr/bin/env bun
/**
 * Release script — bumps version in package.json, creates git tag, pushes.
 *
 * Usage:
 *   bun run release patch   # 0.0.0 → 0.0.1
 *   bun run release minor   # 0.0.1 → 0.1.0
 *   bun run release major   # 0.1.0 → 1.0.0
 */
import * as fs from "fs";
import * as path from "path";
import { $ } from "bun";

const BUMP = (process.argv[2] || "").toLowerCase();
if (!["patch", "minor", "major"].includes(BUMP)) {
  console.error("Usage: bun run release <patch|minor|major>");
  process.exit(1);
}

const pkgPath = path.join(import.meta.dir, "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

const [major, minor, patch] = pkg.version.split(".").map(Number);
const next =
  BUMP === "major" ? `${major + 1}.0.0` :
  BUMP === "minor" ? `${major}.${minor + 1}.0` :
                     `${major}.${minor}.${patch + 1}`;

pkg.version = next;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
console.log(`📦 ${pkg.version.replace(next, '')}${major}.${minor}.${patch} → ${next}`);

const tag = `v${next}`;
await $`git add package.json`;
await $`git commit -m "release: ${tag}"`;
await $`git tag ${tag}`;

console.log(`\n🏷  Tagged ${tag}`);
console.log(`   Push with: git push && git push --tags`);
