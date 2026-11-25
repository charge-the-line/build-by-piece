// Regenerates the PNG icons from public/icons/icon.svg.
// Run with: node scripts/make-icons.mjs   (needs Playwright's Chromium; not part of the build)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Playwright is not a project dependency; resolve whichever copy is installed globally.
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH ?? 'playwright');

const svg = readFileSync('public/icons/icon.svg', 'utf8');
const targets = [
  ['favicon-32.png', 32, 1],
  ['apple-touch-icon.png', 180, 1],
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.72], // artwork shrunk into the maskable safe zone
];

const browser = await chromium.launch();
for (const [name, size, scale] of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<body style="margin:0;background:#14213d;display:grid;place-items:center;height:100vh">
       <div style="width:${size * scale}px;height:${size * scale}px">${svg}</div></body>`,
  );
  await page.screenshot({ path: `public/icons/${name}` });
  await page.close();
}
await browser.close();
