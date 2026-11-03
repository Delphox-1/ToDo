import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

export async function buildPages(output = path.join(root, "docs")) {
  await mkdir(output, { recursive: true });
  await cp(path.join(root, "public", "planner"), path.join(output, "planner"), { recursive: true });
  const source = await readFile(path.join(root, "public", "planner", "index.html"), "utf8");
  const html = source.replaceAll('"/planner/', '"./planner/').replaceAll('"/manifest.webmanifest"', '"./manifest.webmanifest"');
  await writeFile(path.join(output, "index.html"), html);
  // Keep only the root entry point: the nested source page uses root-relative paths.
  await writeFile(path.join(output, "planner", "index.html"), '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=../"><a href="../">Open ToDo</a>\n');
  const manifest = JSON.parse(await readFile(path.join(root, "public", "manifest.webmanifest"), "utf8"));
  manifest.id = "./";
  manifest.start_url = "./#today";
  manifest.scope = "./";
  manifest.icons = manifest.icons.map(icon => ({ ...icon, src: icon.src.replace(/^\//, "./") }));
  await writeFile(path.join(output, "manifest.webmanifest"), JSON.stringify(manifest, null, 2) + "\n");
  await writeFile(path.join(output, ".nojekyll"), "");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await buildPages();
  console.log("GitHub Pages files are ready in docs/. Select main /docs in Settings > Pages.");
}
