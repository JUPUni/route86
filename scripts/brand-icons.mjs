#!/usr/bin/env node
/**
 * Rasterise the FetePass brand SVGs in brand/ into the PNGs the app serves.
 *
 *   node scripts/brand-icons.mjs [--font-file=/path/to/Rubik-ExtraBold.ttf]
 *
 * The lockup's wordmark is live text in Rubik 800. A rasteriser does not fetch the
 * @import in that file -- librsvg has no network -- so this script registers a Rubik
 * ExtraBold TTF with fontconfig before sharp is loaded, and refuses to write anything
 * if the family does not actually resolve. That guard is the point of the script: an
 * unregistered Rubik silently renders as DejaVu Sans, which looks like a wordmark and
 * is the wrong one. Measured here: "FETEPASS" is 501px of ink in Rubik and 516px in
 * the fallback, with no error raised either way.
 *
 * Note that @fontsource/rubik cannot be used for this. It ships woff/woff2 only, and
 * when fontconfig ingests its woff2 the family registers as "Rubik Light" -- so
 * fc-match "Rubik:weight=extrabold" resolves to DejaVu Sans Bold. The static TTF in
 * brand/fonts/ is the real thing (OFL-1.1, see the licence beside it).
 */
import { mkdir, copyFile, readFile, writeFile, access } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = path.join(ROOT, "brand");
const ICONS_OUT = path.join(ROOT, "public", "icons");
const BRAND_OUT = path.join(ROOT, "public", "brand");
const APP_DIR = path.join(ROOT, "src", "app");

const INK = "#04080A";
const MINT = { r: 0xe8, g: 0xf1, b: 0xee };
const ACCENT = { r: 0x1f, g: 0xbf, b: 0x8f };

/** Android guarantees only a circle of 80% of the icon's width on a maskable icon. */
const MASKABLE_SAFE_FRACTION = 0.8;
/**
 * The icon SVG draws its mark at 76% of the width, which is right for `purpose: any`
 * and too big for the safe circle. The ground is a flat ink field, so scaling the whole
 * icon down and padding with the same ink is indistinguishable from redrawing the mark
 * smaller: 76% * 0.8203 = 62.3%, which fits. One source file, two honest renders.
 */
const MASKABLE_SCALE = 0.8203;

const RUBIK_TTF = path.join(BRAND, "fonts", "Rubik-ExtraBold.ttf");
const RUBIK_CSS = "https://fonts.googleapis.com/css2?family=Rubik:wght@800";

const exists = (p) => access(p).then(() => true, () => false);

/**
 * Google serves TTF rather than woff2 when the request carries no browser User-Agent.
 * Only reached when brand/fonts/Rubik-ExtraBold.ttf is missing; the committed copy is
 * what makes a build offline-reproducible.
 */
async function fetchRubik(dest) {
  console.log("  brand/fonts/Rubik-ExtraBold.ttf missing, fetching from Google Fonts");
  const css = await fetch(RUBIK_CSS, { headers: { "user-agent": "" } }).then((r) => r.text());
  const url = css.match(/https:\/\/[^)]+\.ttf/)?.[0];
  if (!url) throw new Error(`no .ttf url in the Google Fonts css for Rubik 800:\n${css.slice(0, 400)}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetching ${url} answered ${res.status}`);
  await mkdir(path.dirname(dest), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

/**
 * Make brand/fonts/ visible to the fontconfig inside sharp's prebuilt libvips, for this
 * process only.
 *
 * Measured against a control (the same probe with no font anywhere): sharp honours
 * XDG_DATA_HOME and ignores both FONTCONFIG_FILE and FONTCONFIG_PATH -- and setting
 * FONTCONFIG_FILE is worse than useless, because it replaces the default config and
 * breaks resolution that would otherwise have worked. The default config includes
 * <dir prefix="xdg">fonts</dir>, so a copy under $XDG_DATA_HOME/fonts is found.
 *
 * Writing to ~/.fonts also works and leaves the machine changed behind us, which makes
 * one run's result depend on the last one's.
 */
async function registerFont(fontFile) {
  const xdg = path.join(ROOT, "node_modules", ".cache", "brand-icons", "xdg");
  const fontsDir = path.join(xdg, "fonts");
  await mkdir(fontsDir, { recursive: true });
  await copyFile(fontFile, path.join(fontsDir, path.basename(fontFile)));
  process.env.XDG_DATA_HOME = xdg;
}

/**
 * Measured metrics of Rubik ExtraBold over the string "FETEPASS", used to identify the
 * face positively rather than by elimination. See assertRubikRenders.
 */
const RUBIK_WIDTH_PER_EM = 5.23;

/**
 * Check the file itself is the face we mean, before anything tries to draw with it.
 *
 * This exists because the render probe below cannot tell "the right font" from "a broken
 * font": a corrupt file still matches the family, then pango fails to build a scaled font
 * and draws almost nothing, which differs from the fallback and so passes a difference
 * test. Controlled by replacing the TTF with ten bytes of text.
 */
async function assertFontFileIsRubik(file) {
  const b = await readFile(file);
  if (b.length < 12) throw new Error(`${file} is ${b.length} bytes, not a font`);
  const tag = b.readUInt32BE(0);
  if (tag !== 0x00010000 && tag !== 0x4f54544f) {
    throw new Error(`${file} is not a TrueType or OpenType font (sfnt tag 0x${tag.toString(16)})`);
  }
  const tables = new Map();
  for (let i = 0; i < b.readUInt16BE(4); i++) {
    const r = 12 + i * 16;
    tables.set(b.toString("ascii", r, r + 4), { off: b.readUInt32BE(r + 8), len: b.readUInt32BE(r + 12) });
  }

  const os2 = tables.get("OS/2");
  if (!os2) throw new Error(`${file} has no OS/2 table`);
  const weight = b.readUInt16BE(os2.off + 4);
  if (weight !== 800) throw new Error(`${file} is weight ${weight}, not 800 (ExtraBold)`);

  const name = tables.get("name");
  if (!name) throw new Error(`${file} has no name table`);
  const count = b.readUInt16BE(name.off + 2);
  const strOff = name.off + b.readUInt16BE(name.off + 4);
  let family = "";
  for (let i = 0; i < count; i++) {
    const r = name.off + 6 + i * 12;
    if (b.readUInt16BE(r + 6) !== 1) continue; // name ID 1, family
    const len = b.readUInt16BE(r + 8), off = b.readUInt16BE(r + 10);
    const raw = b.subarray(strOff + off, strOff + off + len);
    family = b.readUInt16BE(r) === 3 ? Buffer.from(raw).swap16().toString("utf16le") : raw.toString("latin1");
    break;
  }
  if (!/^Rubik\b/.test(family)) throw new Error(`${file} declares family "${family}", not Rubik`);
}

/**
 * Prove fontconfig actually handed Rubik to the rasteriser, rather than trusting it.
 *
 * Two questions, because either alone has a hole. Is it the fallback? -- fontconfig always
 * answers with something, so an unregistered Rubik renders as DejaVu Sans with no error
 * raised (measured: 501px of ink against Rubik's 516px at the same size). And are the
 * metrics right? -- which catches a face that is neither Rubik nor the fallback. The
 * tolerance here is deliberately loose: near-miss faces are what the fallback comparison
 * is for, and this check is for gross failures.
 */
async function assertRubikRenders(sharp) {
  const SIZE = 120;
  const probe = (family) => Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="240"><rect width="900" height="240" fill="#000"/>` +
    `<text x="450" y="170" text-anchor="middle" font-family="${family}" font-weight="800" font-size="${SIZE}" fill="#fff">FETEPASS</text></svg>`,
  );
  const [rubik, fallback] = await Promise.all([
    sharp(probe("Rubik")).png().toBuffer(),
    sharp(probe("NoSuchFontXYZ")).png().toBuffer(),
  ]);
  if (rubik.equals(fallback)) {
    throw new Error(
      "Rubik did not resolve: the wordmark would rasterise in the fallback font and look " +
      "plausibly wrong. Check brand/fonts/Rubik-ExtraBold.ttf, or pass --font-file=<path>.",
    );
  }

  const { data, info } = await sharp(rubik).greyscale().raw().toBuffer({ resolveWithObject: true });
  let min = info.width, max = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) if (data[y * info.width + x] > 40) { if (x < min) min = x; if (x > max) max = x; }
  }
  if (max < 0) {
    throw new Error(
      "the wordmark rasterised blank. The family matched a file that could not be loaded " +
      "-- pango logs 'failed to create cairo scaled font' for this -- so check the font is intact.",
    );
  }
  const perEm = (max - min + 1) / SIZE;
  if (Math.abs(perEm - RUBIK_WIDTH_PER_EM) / RUBIK_WIDTH_PER_EM > 0.05) {
    throw new Error(
      `the wordmark rasterised ${perEm.toFixed(2)} em wide, not Rubik ExtraBold's ${RUBIK_WIDTH_PER_EM}. ` +
      "The family resolved to something that is not this face, or failed to load at all.",
    );
  }
}

/** Every pixel of a channel-separated raw buffer, as {x, y, r, g, b, a}. */
function* pixels({ data, info }) {
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      yield { x, y, r: data[i], g: data[i + 1], b: data[i + 2], a: info.channels === 4 ? data[i + 3] : 255 };
    }
  }
}
const near = (p, c, tol = 12) =>
  Math.abs(p.r - c.r) <= tol && Math.abs(p.g - c.g) <= tol && Math.abs(p.b - c.b) <= tol;
const isInk = (p) => near(p, { r: 0x04, g: 0x08, b: 0x0a }, 14);

/**
 * Pack rendered PNGs into a multi-size .ico.
 *
 * The payloads are PNGs rather than BMPs. PNG-in-ICO is the Vista-era addition to the
 * format and every browser in use reads it at any size; a BMP payload needs its own
 * bottom-up DIB plus a separate 1-bit AND mask, which is a second thing to get wrong for
 * no gain on a web favicon.
 */
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2); // 1 = icon
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, buf }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e);
    head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt8(0, e + 2); // palette size: none
    head.writeUInt8(0, e + 3); // reserved
    head.writeUInt16LE(1, e + 4); // colour planes
    head.writeUInt16LE(32, e + 6); // bits per pixel
    head.writeUInt32LE(buf.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += buf.length;
  });
  return Buffer.concat([head, ...images.map((i) => i.buf)]);
}

async function raw(sharp, file) {
  return sharp(file).raw().toBuffer({ resolveWithObject: true });
}

async function main() {
  const fontArg = process.argv.find((a) => a.startsWith("--font-file="))?.slice("--font-file=".length);
  const fontFile = fontArg ?? process.env.RUBIK_TTF ?? RUBIK_TTF;

  if (!(await exists(fontFile))) {
    if (fontArg || process.env.RUBIK_TTF) throw new Error(`no font file at ${fontFile}`);
    await fetchRubik(fontFile);
  }
  await assertFontFileIsRubik(fontFile);
  await registerFont(fontFile);

  // sharp initialises fontconfig on load, so it must be imported after FONTCONFIG_FILE is set.
  const sharp = (await import("sharp")).default;
  await assertRubikRenders(sharp);
  console.log(`  Rubik resolved from ${path.relative(ROOT, fontFile)}`);

  await mkdir(ICONS_OUT, { recursive: true });
  await mkdir(BRAND_OUT, { recursive: true });

  const icon = path.join(BRAND, "fetepass-icon-ink.svg");
  const favicon = path.join(BRAND, "fetepass-favicon.svg");
  const lockup = path.join(BRAND, "fetepass-lockup-stacked.svg");

  const written = [];
  const png = async (src, size, out) => {
    await sharp(src, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
    written.push(out);
  };

  // App icons, purpose `any`.
  for (const size of [512, 192, 180]) {
    await png(icon, size, path.join(ICONS_OUT, `icon-${size}.png`));
  }

  // Purpose `maskable`: the same icon, inset so the mark clears Android's safe circle.
  const maskableInner = Math.round(512 * MASKABLE_SCALE);
  const pad = Math.round((512 - maskableInner) / 2);
  await sharp(icon, { density: 384 })
    .resize(maskableInner, maskableInner)
    .extend({ top: pad, bottom: 512 - maskableInner - pad, left: pad, right: 512 - maskableInner - pad, background: INK })
    .png({ compressionLevel: 9 })
    .toFile(path.join(ICONS_OUT, "icon-maskable-512.png"));
  written.push(path.join(ICONS_OUT, "icon-maskable-512.png"));

  // <=32px: the simplified mark, no slot.
  for (const size of [32, 16]) {
    await png(favicon, size, path.join(ICONS_OUT, `icon-${size}.png`));
  }
  await copyFile(favicon, path.join(ICONS_OUT, "icon.svg"));
  written.push(path.join(ICONS_OUT, "icon.svg"));

  /*
   * src/app/favicon.ico is the one that is easy to miss: Next serves it at /favicon.ico
   * from the file convention alone, so nothing in layout.tsx names it and a grep of the
   * `icons` block does not find it -- and it is emitted FIRST in the head, ahead of the
   * icons that block does declare. Before this it was still Next's default mark.
   */
  const frames = [];
  for (const size of [16, 32, 48]) {
    frames.push({ size, buf: await sharp(favicon, { density: 512 }).resize(size, size).png().toBuffer() });
  }
  const icoPath = path.join(APP_DIR, "favicon.ico");
  await writeFile(icoPath, ico(frames));
  written.push(icoPath);

  // Link preview.
  await png(lockup, 1200, path.join(BRAND_OUT, "og-square.png"));

  /*
   * The 1200x630 card. LOCKUP_H is the size the square lockup is rendered at, which is
   * taller than the card -- the lockup's own art fills 59% of its square, so a lockup
   * scaled to fit inside 630 leaves the mark small and adrift. At 675 the art lands at
   * 400px, 64% of the card's height, which was picked by rendering 560 / 675 / 767 and
   * looking: 560 is lost in the space and 767 puts the wordmark against the bottom edge.
   *
   * Overflow is cropped rather than scaled away, which is only safe because the lockup's
   * ground is the same flat ink as the card's, so the seam is invisible.
   */
  const OG_W = 1200, OG_H = 630, LOCKUP_H = 675;
  let scaled = await sharp(lockup, { density: 384 }).resize(LOCKUP_H, LOCKUP_H).png().toBuffer();
  if (LOCKUP_H > OG_H) {
    scaled = await sharp(scaled)
      .extract({ left: 0, top: Math.round((LOCKUP_H - OG_H) / 2), width: LOCKUP_H, height: OG_H })
      .png()
      .toBuffer();
  }
  const pastedH = Math.min(LOCKUP_H, OG_H);
  await sharp({ create: { width: OG_W, height: OG_H, channels: 4, background: INK } })
    .composite([{ input: scaled, left: Math.round((OG_W - LOCKUP_H) / 2), top: Math.round((OG_H - pastedH) / 2) }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(BRAND_OUT, "og.png"));
  written.push(path.join(BRAND_OUT, "og.png"));

  // --- checks on what was actually written, not on what was intended ---

  // The maskable icon must have nothing but ground outside the safe circle, or Android
  // crops the mark. This is the whole reason it is a separate file.
  const mask = await raw(sharp, path.join(ICONS_OUT, "icon-maskable-512.png"));
  const cx = mask.info.width / 2, cy = mask.info.height / 2;
  const safeR = (mask.info.width * MASKABLE_SAFE_FRACTION) / 2;
  let outside = 0;
  for (const p of pixels(mask)) {
    if (isInk(p)) continue;
    if (Math.hypot(p.x - cx, p.y - cy) > safeR) outside++;
  }
  if (outside > 0) {
    throw new Error(`${outside} px of the maskable icon's mark fall outside the ${MASKABLE_SAFE_FRACTION * 100}% safe circle`);
  }

  // The `any` icon is allowed past the safe circle -- if it is not, it was drawn too small.
  const any = await raw(sharp, path.join(ICONS_OUT, "icon-512.png"));
  let anyOutside = 0;
  for (const p of pixels(any)) {
    if (!isInk(p) && Math.hypot(p.x - cx, p.y - cy) > safeR) anyOutside++;
  }
  if (anyOutside === 0) {
    throw new Error("the `any` icon fits inside the maskable safe circle, so it is drawn too small to be worth a separate file");
  }

  // Corners must be opaque ink: a transparent icon corner shows as white on iOS.
  for (const name of ["icon-512.png", "icon-192.png", "icon-180.png", "icon-maskable-512.png", "icon-32.png", "icon-16.png"]) {
    const img = await raw(sharp, path.join(ICONS_OUT, name));
    const w = img.info.width, h = img.info.height;
    for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) {
      const i = (y * w + x) * img.info.channels;
      const p = { r: img.data[i], g: img.data[i + 1], b: img.data[i + 2], a: img.info.channels === 4 ? img.data[i + 3] : 255 };
      if (p.a !== 255 || !isInk(p)) throw new Error(`${name} corner ${x},${y} is not opaque ink (${p.r},${p.g},${p.b},${p.a})`);
    }
  }

  // At 16px the stub is the only detail left. If it stopped surviving the downscale the
  // favicon would be a plain mint rectangle.
  const tiny = await raw(sharp, path.join(ICONS_OUT, "icon-16.png"));
  let mint = 0, accent = 0;
  for (const p of pixels(tiny)) {
    if (near(p, MINT, 40)) mint++;
    if (near(p, ACCENT, 40)) accent++;
  }
  if (mint === 0) throw new Error("icon-16.png has no mint pixels");
  if (accent === 0) throw new Error("icon-16.png has no accent pixels: the stub did not survive the downscale");

  // The favicon's geometry is snapped so the mark lands on whole pixels at 16, 24 and 32.
  // Only the four rounded corners should blend; anything more means the alignment was lost
  // and the icon rasterises soft, which reads as blurred rather than small. Measured: the
  // earlier unaligned geometry blended 50 of the 256 pixels here, this one blends 4.
  const solid = [{ r: 0x04, g: 0x08, b: 0x0a }, MINT, ACCENT];
  let soft = 0;
  for (const p of pixels(tiny)) if (!solid.some((c) => near(p, c, 6))) soft++;
  if (soft > 8) {
    throw new Error(`icon-16.png blends ${soft} px; the mark is off the pixel grid (expected the 4 rounded corners)`);
  }

  // The card must be the size the meta tags claim, and the art must not run off it --
  // the lockup is rendered larger than the card and cropped, so an overshoot here shows
  // as a wordmark with its descenders sliced off in every link preview.
  const og = await raw(sharp, path.join(BRAND_OUT, "og.png"));
  if (og.info.width !== OG_W || og.info.height !== OG_H) {
    throw new Error(`og.png is ${og.info.width}x${og.info.height}, not ${OG_W}x${OG_H}`);
  }
  let ogTop = og.info.height, ogBottom = -1, ogLeft = og.info.width, ogRight = -1;
  for (const p of pixels(og)) {
    if (isInk(p)) continue;
    if (p.y < ogTop) ogTop = p.y;
    if (p.y > ogBottom) ogBottom = p.y;
    if (p.x < ogLeft) ogLeft = p.x;
    if (p.x > ogRight) ogRight = p.x;
  }
  if (ogTop < 8 || ogBottom > OG_H - 9 || ogLeft < 8 || ogRight > OG_W - 9) {
    throw new Error(`og.png art runs to the edge (top ${ogTop}, bottom ${OG_H - 1 - ogBottom}, left ${ogLeft}, right ${OG_W - 1 - ogRight})`);
  }

  // The .ico must be well formed and carry the sizes a tab and a bookmark ask for, and
  // each entry must really be the mark rather than a zero-length stub.
  const icoBytes = await readFile(icoPath);
  if (icoBytes.readUInt16LE(0) !== 0 || icoBytes.readUInt16LE(2) !== 1) throw new Error("favicon.ico has a bad header");
  const entries = icoBytes.readUInt16LE(4);
  if (entries !== 3) throw new Error(`favicon.ico holds ${entries} images, expected 3`);
  for (let i = 0; i < entries; i++) {
    const e = 6 + 16 * i;
    const size = icoBytes[e] || 256;
    const len = icoBytes.readUInt32LE(e + 8), off = icoBytes.readUInt32LE(e + 12);
    if (off + len > icoBytes.length) throw new Error(`favicon.ico entry ${size} runs past the end of the file`);
    const frame = icoBytes.subarray(off, off + len);
    if (!(frame[0] === 0x89 && frame.toString("ascii", 1, 4) === "PNG")) {
      throw new Error(`favicon.ico entry ${size} is not a PNG payload`);
    }
    const meta = await sharp(frame).metadata();
    if (meta.width !== size || meta.height !== size) {
      throw new Error(`favicon.ico entry declares ${size} and holds ${meta.width}x${meta.height}`);
    }
  }

  for (const f of written.sort()) console.log(`  ${path.relative(ROOT, f)}`);
  console.log(`\n  checks passed: maskable safe circle clear, ${anyOutside} px of the \`any\` icon outside it, corners opaque ink, 16px keeps ${mint} mint / ${accent} accent px and blends only ${soft}`);
}

await main();
