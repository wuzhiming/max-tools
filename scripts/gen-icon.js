#!/usr/bin/env node
// scripts/gen-icon.js
//
// Renders build/icon.svg into:
//   build/icon.iconset/{icon_16x16.png ... icon_512x512@2x.png}
//   build/icon.icns       (packed via iconutil; what electron-builder picks up)
//   build/icon.png        (1024 fallback for non-mac use)
//
// Run after editing build/icon.svg:   npm run icon:gen

const sharp = require('sharp')
const fs = require('node:fs/promises')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const ROOT = path.resolve(__dirname, '..')
const SVG = path.join(ROOT, 'build/icon.svg')
const SET = path.join(ROOT, 'build/icon.iconset')
const ICNS = path.join(ROOT, 'build/icon.icns')
const PNG1024 = path.join(ROOT, 'build/icon.png')

// Apple's required .iconset entries: (pixel size, filename)
const ENTRIES = [
  [16, 'icon_16x16.png'],
  [32, 'icon_16x16@2x.png'],
  [32, 'icon_32x32.png'],
  [64, 'icon_32x32@2x.png'],
  [128, 'icon_128x128.png'],
  [256, 'icon_128x128@2x.png'],
  [256, 'icon_256x256.png'],
  [512, 'icon_256x256@2x.png'],
  [512, 'icon_512x512.png'],
  [1024, 'icon_512x512@2x.png'],
]

async function main() {
  const svg = await fs.readFile(SVG)

  // Rasterize the SVG once at 4× the largest icon (4096px) so every
  // downsample is clean. density=288 with our 1024 viewBox → 4096 px.
  const master = await sharp(svg, { density: 288 }).png().toBuffer()

  await fs.rm(SET, { recursive: true, force: true })
  await fs.mkdir(SET, { recursive: true })

  for (const [size, name] of ENTRIES) {
    await sharp(master).resize(size, size).png().toFile(path.join(SET, name))
  }
  await sharp(master).resize(1024, 1024).png().toFile(PNG1024)

  if (process.platform !== 'darwin') {
    console.log('iconutil only exists on macOS — skipping .icns')
    return
  }
  execFileSync('iconutil', ['-c', 'icns', SET, '-o', ICNS], { stdio: 'inherit' })
  console.log(`✓ build/icon.icns (${ENTRIES.length} sizes) + build/icon.png written`)
}

main().catch((e) => { console.error(e); process.exit(1) })
