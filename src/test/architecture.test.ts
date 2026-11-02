import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
function files(folder: string): string[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
    ? files(join(folder, entry.name)) : /\.[cm]?tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [join(folder, entry.name)] : []);
}
function dependencies(file: string): string[] {
  const tree = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const imports: string[] = [];
  const visit = (node: ts.Node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) imports.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  };
  visit(tree); return imports;
}
describe('用户约定的依赖边界', () => {
  it('store 不直接依赖其他模块的 store', () => {
    const stores = files(join(root, 'modules')).filter((file) => /[/\\]store\.ts$/.test(file));
    expect(stores.length).toBeGreaterThan(0);
    for (const file of stores) for (const dependency of dependencies(file)) {
      expect(/(?:^|\/)store(?:\.tsx?)?$/.test(dependency), `${file} → ${dependency}`).toBe(false);
    }
  });
  it('domain 及其本地依赖不能引入 React、Zustand、store 或浏览器全局', () => {
    const seen = new Set<string>();
    const inspect = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      const source = readFileSync(file, 'utf8');
      expect(/\b(?:window|document|localStorage|indexedDB|navigator)\s*[.[]/.test(source), file).toBe(false);
      for (const dependency of dependencies(file)) {
        expect(/^(?:react(?:-dom)?|zustand)(?:\/|$)|(?:^|\/)store(?:\.tsx?)?$/.test(dependency), `${file} → ${dependency}`).toBe(false);
        if (dependency.startsWith('.')) {
          const base = resolve(dirname(file), dependency);
          const target = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find((name) => existsSync(name) && /\.[cm]?tsx?$/.test(name));
          if (target) inspect(target);
        }
      }
    };
    files(join(root, 'domain')).forEach(inspect);
  });
});
