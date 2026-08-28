import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('.');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const allowedProductionDependencies = new Set(['lucide-react', 'react', 'react-dom', 'three']);
const unexpectedDependencies = Object.keys(packageJson.dependencies ?? {}).filter((name) => !allowedProductionDependencies.has(name));
if (unexpectedDependencies.length) throw new Error(`Unexpected production dependencies: ${unexpectedDependencies.join(', ')}.`);
if (!packageJson.dependencies?.three) throw new Error('The production 3D renderer dependency is missing.');
if (Object.keys(packageJson.dependencies ?? {}).some((name) => name.includes('react-three') || name.includes('fiber'))) {
  throw new Error('R3F dependencies are not authorized for the lazy Three.js renderer.');
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const children = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }));
  return children.flat();
}

const sourceFiles = await filesUnder(resolve(root, 'src'));
const source = await Promise.all(sourceFiles.map(async (path) => ({ path, text: await readFile(path, 'utf8') })));
const remoteFontOrAsset = /(?:@import\s+url|https?:\/\/[^\s'"`)]+\.(?:woff2?|ttf|otf)|fonts\.(?:googleapis|gstatic)\.com)/i;
const remoteReference = source.find((file) => remoteFontOrAsset.test(file.text));
if (remoteReference) throw new Error(`Remote font or asset reference found in ${remoteReference.path}.`);

const threeImports = source.filter((file) => /from ['"]three['"]/.test(file.text));
if (threeImports.length !== 1 || !threeImports[0].path.endsWith('src\\renderer\\three-board.tsx')) {
  throw new Error('Three.js must be imported only by the lazy 3D renderer.');
}

console.log('Release hygiene: production dependency allowlist, lazy Three.js boundary, and local-font policy passed.');
