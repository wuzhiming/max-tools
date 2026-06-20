// scripts/notarize.js
//
// electron-builder afterSign hook. Sends the signed .app to Apple's
// notarization service via notarytool. Skips when the env vars aren't
// all present so unsigned dev builds still complete.
//
// Reads:
//   APPLE_ID                          Apple account email
//   APPLE_APP_SPECIFIC_PASSWORD       app-specific password
//   APPLE_TEAM_ID                     team id
//
// The companion script scripts/build-dmg.js also accepts the project's
// other-convention names (APPLE_PASSWORD → APPLE_APP_SPECIFIC_PASSWORD)
// and exports the mapped variants before invoking electron-builder.

const { notarize } = require('@electron/notarize')

exports.default = async function notarizeApp(context) {
  const { electronPlatformName, appOutDir, packager } = context
  if (electronPlatformName !== 'darwin') return

  const appleId = process.env.APPLE_ID
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD
  const teamId = process.env.APPLE_TEAM_ID

  if (!appleId || !appleIdPassword || !teamId) {
    console.log(
      '[notarize] skipping — APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID not all set',
    )
    return
  }

  const appName = packager.appInfo.productFilename
  const appPath = `${appOutDir}/${appName}.app`
  console.log(`[notarize] submitting ${appPath} (teamId=${teamId})…`)
  const start = Date.now()
  await notarize({
    tool: 'notarytool',
    appPath,
    appleId,
    appleIdPassword,
    teamId,
  })
  console.log(`[notarize] done in ${Math.round((Date.now() - start) / 1000)}s`)
}
