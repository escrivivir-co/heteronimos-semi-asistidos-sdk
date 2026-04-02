import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT_DIR = path.join(import.meta.dir, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const DIST_ENTRY_DTS = path.join(DIST_DIR, "index.d.ts");

function listDeclarationFiles(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listDeclarationFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("published package", () => {
  test("emits dist/index.d.ts after build", () => {
    expect(fs.existsSync(DIST_ENTRY_DTS)).toBe(true);
  });

  test("does not leak bun references in generated declarations", () => {
    const declarationFiles = listDeclarationFiles(DIST_DIR);
    expect(declarationFiles.length).toBeGreaterThan(0);

    for (const filePath of declarationFiles) {
      const contents = fs.readFileSync(filePath, "utf8");
      expect(contents).not.toContain("bun");
      expect(contents).not.toContain("Bun.");
    }
  });
});