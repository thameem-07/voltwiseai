import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const srcDir = path.join(projectRoot, "node_modules", "maplibre-gl", "dist");
const destDir = path.join(projectRoot, "public", "maplibre");

if (!fs.existsSync(srcDir)) {
  console.warn("[VoltWise AI] MapLibre dist not found in node_modules yet. Skipping worker asset copy.");
  process.exit(0);
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const filesToCopy = [
  "maplibre-gl-worker.mjs",
  "maplibre-gl-worker.mjs.map",
  "maplibre-gl-shared.mjs",
  "maplibre-gl-shared.mjs.map",
  "maplibre-gl-worker-dev.mjs",
  "maplibre-gl-worker-dev.mjs.map",
  "maplibre-gl-shared-dev.mjs",
  "maplibre-gl-shared-dev.mjs.map",
];

let copied = 0;
for (const file of filesToCopy) {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    copied++;
  }
}

console.log(`[VoltWise AI] Successfully copied ${copied} MapLibre worker assets to public/maplibre/`);
