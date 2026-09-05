// Genera le icone PWA (pixel-art Blob su schermo LCD) a partire da sprites/blob.js.
// Produce icons/icon.svg e, tramite rsvg-convert, i PNG nelle taglie richieste.
// Uso: node tools/make-icons.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "icons");

const COLORS = {
    dark: "#1f2a08",
    mid: "#526333",
    screen: "#879864",
    screenBorder: "#526333",
    shellTop: "#475569",
    shellBottom: "#334155",
};

function loadSprite() {
    const src = readFileSync(join(root, "sprites", "blob.js"), "utf8");
    const match = src.match(/window\.TAMA_ART\.BLOB\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) throw new Error("Sprite BLOB non trovato");
    const arr = eval(match[1]);
    if (!Array.isArray(arr)) throw new Error("Formato sprite non valido");
    return arr;
}

// Crea un rect per ogni pixel della sprite (viewBox quadrato, size 512).
function pixels(sprite, cx, cy, scale) {
    const px = cx - 8 * scale;
    const py = cy - 8 * scale;
    let rects = [];
    for (let r = 0; r < sprite.length; r++) {
        const row = sprite[r];
        for (let c = 0; c < row.length; c++) {
            const ch = row[c];
            if (ch === ".") continue;
            const fill = ch === "#" ? COLORS.dark : COLORS.mid;
            rects.push(
                `<rect x="${(px + c * scale).toFixed(1)}" y="${(py + r * scale).toFixed(1)}" width="${scale}" height="${scale}" fill="${fill}"/>`
            );
        }
    }
    return rects.join("");
}

function buildRegular(sprite) {
    const px = 512;
    const cx = px / 2;
    const cy = px / 2;
    const screenInset = 56;
    const screenRadius = 40;
    const screenSize = px - screenInset * 2;
    const scale = Math.floor(screenSize * 0.62 / 16);
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
  <defs>
    <linearGradient id="shell" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${COLORS.shellTop}"/>
      <stop offset="1" stop-color="${COLORS.shellBottom}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${px}" height="${px}" rx="110" fill="url(#shell)"/>
  <rect x="${screenInset}" y="${screenInset}" width="${screenSize}" height="${screenSize}" rx="${screenRadius}" fill="${COLORS.screen}"/>
  <rect x="${screenInset}" y="${screenInset}" width="${screenSize}" height="${screenSize}" rx="${screenRadius}" fill="none" stroke="${COLORS.screenBorder}" stroke-width="8"/>
  ${pixels(sprite, cx, cy, scale)}
</svg>`;
}

function buildMaskable(sprite) {
    const px = 512;
    const cx = px / 2;
    const cy = px / 2;
    // Safe zone: il contenuto sta dentro ~80% del centro.
    const safe = px * 0.5;
    const scale = Math.floor(safe / 16);
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
  <defs>
    <linearGradient id="shell" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${COLORS.shellTop}"/>
      <stop offset="1" stop-color="${COLORS.shellBottom}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${px}" height="${px}" fill="url(#shell)"/>
  <rect x="${px * 0.12}" y="${px * 0.12}" width="${px * 0.76}" height="${px * 0.76}" rx="36" fill="${COLORS.screen}"/>
  <rect x="${px * 0.12}" y="${px * 0.12}" width="${px * 0.76}" height="${px * 0.76}" rx="36" fill="none" stroke="${COLORS.screenBorder}" stroke-width="7"/>
  ${pixels(sprite, cx, cy, scale)}
</svg>`;
}

function rasterize(svgPath, outPath, size) {
    execFileSync("rsvg-convert", ["-w", String(size), "-h", String(size), "-o", outPath, svgPath], { stdio: "inherit" });
}

const sprite = loadSprite();
const regular = buildRegular(sprite);
const maskable = buildMaskable(sprite);

writeFileSync(join(iconsDir, "icon.svg"), regular);
writeFileSync(join(iconsDir, "icon-maskable.svg"), maskable);

const regularSvg = join(iconsDir, "icon.svg");
const maskableSvg = join(iconsDir, "icon-maskable.svg");

rasterize(regularSvg, join(iconsDir, "icon-512.png"), 512);
rasterize(regularSvg, join(iconsDir, "icon-192.png"), 192);
rasterize(regularSvg, join(iconsDir, "icon-180.png"), 180);
rasterize(regularSvg, join(iconsDir, "favicon-32.png"), 32);
rasterize(maskableSvg, join(iconsDir, "icon-maskable-512.png"), 512);

console.log("Icone generate in icons/");
