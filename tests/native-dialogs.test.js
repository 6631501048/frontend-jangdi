import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parse: parseVue } = require('@vue/compiler-sfc');
const { parse } = require('@babel/parser');

test('application scripts contain no browser-native alert, confirm or prompt calls', async () => {
  const failures = [], names = new Set(['alert', 'confirm', 'prompt']);
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      if (entry.isDirectory()) { await inspect(file); continue; }
      if (!/\.(vue|js|ts)$/.test(entry.name)) continue;
      const source = await readFile(file, 'utf8');
      const parts = entry.name.endsWith('.vue') ? (() => { const { descriptor } = parseVue(source); return [descriptor.script?.content, descriptor.scriptSetup?.content].filter(Boolean); })() : [source];
      for (const code of parts) {
        const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
        function walk(node) {
          if (!node || typeof node !== 'object') return;
          if (['CallExpression', 'OptionalCallExpression'].includes(node.type)) {
            const callee = node.callee;
            const nativeIdentifier = callee?.type === 'Identifier' && names.has(callee.name);
            const property = callee?.computed ? callee.property?.value : callee?.property?.name;
            const nativeMember = ['MemberExpression', 'OptionalMemberExpression'].includes(callee?.type) && ['window', 'globalThis', 'self'].includes(callee.object?.name) && names.has(property);
            if (nativeIdentifier || nativeMember) failures.push(`${file.pathname}:${node.loc.start.line}`);
          }
          for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value);
        }
        walk(ast.program);
      }
    }
  }
  await inspect(new URL('../src/', import.meta.url));
  assert.deepEqual(failures, []);
});
