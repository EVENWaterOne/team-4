/**
 * Offline scene build helper. Prefer esbuild when installed; otherwise bundle
 * the bundled Three.js pair with a restricted local ESM transform.
 * Usage: node scripts/build-scene.cjs
 * No dependency installation or network request is performed.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sceneRoot = root;
const entry = path.join(sceneRoot, 'scene-source.mjs');
const outfile = path.join(sceneRoot, 'dist', 'scene.bundle.js');
const runtimeModules = 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';

function findEsbuild() {
  for (const candidate of [path.join(runtimeModules, 'esbuild'), 'esbuild']) {
    try { return require(candidate); } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  return null;
}

function specifiers(text) {
  return text.split(',').map(value => value.trim()).filter(Boolean).map(value => {
    const match = /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(value);
    if (!match) throw new Error(`Unsupported module specifier: ${value}`);
    return { local: match[1], public: match[2] || match[1] };
  });
}

function objectProperties(items) {
  return items.map(item => `${JSON.stringify(item.public)}: ${item.local}`).join(',\n');
}

function knownModule(source, dependency) {
  const exports = [];
  source = source.replace(/^import\s*\{([^}]+)\}\s*from\s*['"]\.\/three\.core\.js['"]\s*;[ \t\r]*$/gm, (_, list) => {
    if (!dependency) throw new Error('Unexpected core dependency');
    return `const { ${specifiers(list).map(item => item.local === item.public ? item.local : `${item.local}: ${item.public}`).join(', ')} } = ${dependency};`;
  });
  source = source.replace(/^export\s*\{([^}]+)\}\s*from\s*['"]\.\/three\.core\.js['"]\s*;[ \t\r]*$/gm, (_, list) => {
    if (!dependency) throw new Error('Unexpected core re-export');
    exports.push(...specifiers(list).map(item => ({ public: item.public, expression: `${dependency}[${JSON.stringify(item.local)}]` })));
    return '';
  });
  source = source.replace(/^export\s*\{([^}]+)\}\s*;[ \t\r]*$/gm, (_, list) => {
    exports.push(...specifiers(list).map(item => ({ public: item.public, expression: item.local })));
    return '';
  });
  if (/^(?:import|export)\s/m.test(source)) throw new Error('Unsupported module syntax in bundled Three.js');
  if (!exports.length) throw new Error('No exports found in bundled Three.js');
  const properties = exports.map(item => `${JSON.stringify(item.public)}: ${item.expression}`).join(',\n');
  return `(function () {\n${source}\nreturn {\n${properties}\n};\n})();`;
}

function classicScene(source) {
  const sceneExports = [];
  source = source.replace(/^import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s*['"]\.\/vendor\/three\.module\.js['"]\s*;[ \t\r]*$/gm, (_, alias) => `const ${alias} = __threeModule;`);
  source = source.replace(/^import\s*\{([^}]+)\}\s*from\s*['"]\.\/vendor\/three\.module\.js['"]\s*;[ \t\r]*$/gm, (_, list) => `const { ${specifiers(list).map(item => item.local === item.public ? item.local : `${item.local}: ${item.public}`).join(', ')} } = __threeModule;`);
  source = source.replace(/^export\s+(async\s+)?(function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm, (_, asyncPrefix, declaration, name) => {
    sceneExports.push({ local: name, public: name });
    return `${asyncPrefix || ''}${declaration} ${name}`;
  });
  source = source.replace(/^export\s*\{([^}]+)\}\s*;[ \t\r]*$/gm, (_, list) => {
    sceneExports.push(...specifiers(list));
    return '';
  });
  if (/^(?:import|export)\s/m.test(source)) throw new Error('Scene uses unsupported module syntax. Use the local THREE namespace import and window interface.');
  return `${source}\n${sceneExports.length ? `window.DownstairsSceneModule = { ${objectProperties(sceneExports)} };` : ''}`;
}

const esbuild = findEsbuild();
if (esbuild) {
  esbuild.buildSync({ entryPoints: [entry], bundle: true, outfile, format: 'iife', platform: 'browser', target: ['es2020'], legalComments: 'inline' });
  console.log(`Built classic scene with esbuild: ${outfile}`);
} else {
  const core = fs.readFileSync(path.join(sceneRoot, 'vendor', 'three.core.js'), 'utf8');
  const module = fs.readFileSync(path.join(sceneRoot, 'vendor', 'three.module.js'), 'utf8');
  const scene = fs.readFileSync(entry, 'utf8');
  const bundle = `/* Offline Three.js scene bundle. Three.js MIT license: vendor/LICENSE. */\n(function () {\n'use strict';\nconst __threeCore = ${knownModule(core, null)}\nconst __threeModule = ${knownModule(module, '__threeCore')}\n${classicScene(scene)}\n})();\n`;
  // Parse without executing so a failed transform never replaces a valid build.
  new Function(bundle);
  fs.writeFileSync(outfile, bundle, 'utf8');
  console.log(`Built classic scene with local offline transform: ${outfile} (${Buffer.byteLength(bundle)} bytes)`);
}


