#!/usr/bin/env node
// scripts/build-dmg.js
//
// Wraps the dmg pipeline so the project's existing env-var naming (the
// same shape used by cocos-cli's release.js) Just Works without having
// to remember electron-builder's internal var names.
//
//   APPLE_DEVELOPER_ID  →  CSC_NAME       (codesign identity, e.g.
//                                          "Developer ID Application: Foo (TEAMID)")
//   CODESIGN_IDENTITY   →  CSC_NAME       (fallback)
//   APPLE_PASSWORD      →  APPLE_APP_SPECIFIC_PASSWORD  (notarytool)
//
// APPLE_ID / APPLE_TEAM_ID share the same names across the two
// conventions and are passed through unchanged.
//
// Usage:
//   APPLE_DEVELOPER_ID="Developer ID Application: …" \
//   APPLE_ID="you@apple.com" APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx" \
//   APPLE_TEAM_ID="ABC123" \
//   npm run package:dmg
//
// If signing env is missing the app is still built and DMG'd, just
// unsigned. If notarize env is missing the notarize hook no-ops.

const { spawnSync } = require('node:child_process')

const env = { ...process.env }

// Identity mapping
if (!env.CSC_NAME && env.APPLE_DEVELOPER_ID) env.CSC_NAME = env.APPLE_DEVELOPER_ID
if (!env.CSC_NAME && env.CODESIGN_IDENTITY) env.CSC_NAME = env.CODESIGN_IDENTITY

// Notarize password mapping
if (!env.APPLE_APP_SPECIFIC_PASSWORD && env.APPLE_PASSWORD) {
  env.APPLE_APP_SPECIFIC_PASSWORD = env.APPLE_PASSWORD
}

const haveSigning = Boolean(env.CSC_NAME)
const haveNotarize = Boolean(env.APPLE_ID && env.APPLE_APP_SPECIFIC_PASSWORD && env.APPLE_TEAM_ID)

console.log('─── build-dmg ───────────────────────────────────────────')
console.log(`signing  : ${haveSigning ? `ON   identity="${env.CSC_NAME}"` : 'OFF (no CSC_NAME / APPLE_DEVELOPER_ID)'}`)
console.log(`notarize : ${haveNotarize ? `ON   team="${env.APPLE_TEAM_ID}" user="${env.APPLE_ID}"` : 'OFF (APPLE_ID/APP_PASSWORD/TEAM not all set)'}`)
console.log('─────────────────────────────────────────────────────────')

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env })
  if (r.status !== 0) {
    console.error(`\n${cmd} exited with status ${r.status}`)
    process.exit(r.status ?? 1)
  }
}

run('npx', ['electron-vite', 'build'])
run('npx', ['electron-builder', '--mac', 'dmg'])
