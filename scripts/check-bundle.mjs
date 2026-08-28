import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputDirectory = resolve('dist');
const manifestPath = resolve(outputDirectory, '.vite', 'manifest.json');
const entryLimitBytes = 350 * 1024;
const lazyChunkLimitBytes = 700 * 1024;

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const entry = Object.values(manifest).find((item) => item.isEntry && item.src === 'index.html');

if (!entry) {
  throw new Error('No index.html entry was found in the Vite build manifest.');
}

const entryFiles = new Set();
const collectImports = (item) => {
  entryFiles.add(item.file);
  for (const importedName of item.imports ?? []) {
    collectImports(manifest[importedName]);
  }
};
collectImports(entry);

const byteSize = async (file) => (await stat(resolve(outputDirectory, file))).size;
const entryBytes = (await Promise.all([...entryFiles].map(byteSize))).reduce((sum, bytes) => sum + bytes, 0);
const chunks = await Promise.all(Object.values(manifest).map(async (item) => ({
  file: item.file,
  bytes: await byteSize(item.file),
})));
const largestLazyChunk = chunks
  .filter((chunk) => !entryFiles.has(chunk.file))
  .sort((left, right) => right.bytes - left.bytes)[0];
const threeEntry = manifest['src/renderer/three-board.tsx'];
if (!threeEntry?.isDynamicEntry || entryFiles.has(threeEntry.file)) {
  throw new Error('The 3D renderer must remain a separate lazy production chunk.');
}
const threeChunk = chunks.find((chunk) => chunk.file === threeEntry.file);
if (!threeChunk) throw new Error('The lazy 3D renderer chunk is missing from the production manifest.');

if (entryBytes > entryLimitBytes) {
  throw new Error(`Initial route is ${(entryBytes / 1024).toFixed(1)} KiB; limit is ${entryLimitBytes / 1024} KiB.`);
}
if (largestLazyChunk && largestLazyChunk.bytes > lazyChunkLimitBytes) {
  throw new Error(`Largest lazy chunk (${largestLazyChunk.file}) is ${(largestLazyChunk.bytes / 1024).toFixed(1)} KiB; limit is ${lazyChunkLimitBytes / 1024} KiB.`);
}

console.log(`Initial route: ${(entryBytes / 1024).toFixed(1)} KiB / ${entryLimitBytes / 1024} KiB`);
console.log(largestLazyChunk
  ? `Largest lazy chunk: ${(largestLazyChunk.bytes / 1024).toFixed(1)} KiB / ${lazyChunkLimitBytes / 1024} KiB (${largestLazyChunk.file})`
  : 'Largest lazy chunk: none');
console.log(`3D renderer chunk: ${(threeChunk.bytes / 1024).toFixed(1)} KiB (${threeChunk.file})`);
