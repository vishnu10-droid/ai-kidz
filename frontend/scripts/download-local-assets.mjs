import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDirectory = path.join(projectRoot, "src", "assets");
const publicDirectory = path.join(projectRoot, "public");
const previewOrigin = "https://id-preview--aef32305-de59-4967-a508-814466332176.lovable.app";
const assetPathPrefix = "/__l5e/assets-v1/";

async function findAssetPointers(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return findAssetPointers(entryPath);
      return entry.name.endsWith(".asset.json") ? [entryPath] : [];
    }),
  );
  return nested.flat();
}

async function downloadAsset(pointerPath) {
  const pointer = JSON.parse(await readFile(pointerPath, "utf8"));
  if (typeof pointer.url !== "string" || !pointer.url.startsWith(assetPathPrefix)) {
    throw new Error(`${pointerPath}: expected an asset URL starting with ${assetPathPrefix}`);
  }

  const outputPath = path.resolve(publicDirectory, `.${pointer.url}`);
  if (!outputPath.startsWith(`${publicDirectory}${path.sep}`)) {
    throw new Error(`${pointerPath}: asset URL resolves outside public/`);
  }

  const response = await fetch(`${previewOrigin}${pointer.url}`);
  if (!response.ok) throw new Error(`${pointer.url}: HTTP ${response.status}`);

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) throw new Error(`${pointer.url}: received an empty response`);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, bytes);
  return { url: pointer.url, outputPath, bytes: bytes.length };
}

const pointers = await findAssetPointers(assetsDirectory);
const results = [];
const failures = [];

const concurrency = 8;
for (let offset = 0; offset < pointers.length; offset += concurrency) {
  const batch = await Promise.allSettled(
    pointers.slice(offset, offset + concurrency).map(downloadAsset),
  );
  for (const item of batch) {
    if (item.status === "fulfilled") results.push(item.value);
    else {
      failures.push(item.reason);
      console.error(item.reason.message);
    }
  }
}

console.log(`Downloaded ${results.length}/${pointers.length} assets into public/.`);
if (failures.length > 0) process.exitCode = 1;
