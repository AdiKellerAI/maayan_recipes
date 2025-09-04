#!/usr/bin/env node
// Generate PWA icons from a source image using sharp
// Usage: node scripts/generate-icons.js [sourcePath]

const fs = require('fs');
const path = require('path');

async function ensureSharp() {
  try {
    return require('sharp');
  } catch (e) {
    console.error('Sharp is required. Run: npm i -D sharp');
    process.exit(1);
  }
}

async function main() {
  const sharp = await ensureSharp();
  const projectRoot = path.resolve(__dirname, '..');
  const publicDir = path.join(projectRoot, 'public');
  const iconsDir = path.join(publicDir, 'icons');

  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

  // Prefer an SVG/PNG logo from public
  const candidateFiles = [
    'logo_new.svg',
    'Maayan_HD.svg',
    'MaayansKitchen_logo.svg',
    'image.png',
    'image copy.png'
  ];

  const argSrc = process.argv[2];
  let sourcePath = argSrc
    ? path.resolve(process.cwd(), argSrc)
    : candidateFiles
        .map(f => path.join(publicDir, f))
        .find(p => fs.existsSync(p));

  if (!sourcePath) {
    console.error('No source image found. Provide a path or add a logo in /public.');
    process.exit(1);
  }

  const rasterizeIfSvg = async (input) => {
    if (path.extname(input).toLowerCase() === '.svg') {
      return sharp(input).png();
    }
    return sharp(input);
  };

  const sizes = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-192-maskable.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'icon-512-maskable.png', size: 512 },
    { name: 'apple-touch-icon-180.png', size: 180 },
    { name: 'apple-touch-icon-152.png', size: 152 },
    { name: 'apple-touch-icon-120.png', size: 120 }
  ];

  const base = await rasterizeIfSvg(sourcePath);

  await Promise.all(
    sizes.map(async ({ name, size }) => {
      const outPath = path.join(iconsDir, name);
      await base
        .clone()
        .resize(size, size, { fit: 'cover', withoutEnlargement: false })
        .png({ quality: 90 })
        .toFile(outPath);
      console.log('Wrote', path.relative(projectRoot, outPath));
    })
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


