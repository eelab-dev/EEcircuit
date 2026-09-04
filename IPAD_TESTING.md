# Physical iPad Safari testing

EEcircuit's physical-iPad suite opens the production application in Safari on a connected iPad. It is separate from Playwright's emulated `ipad-webkit` project and is never run by `npm test`, `npm run test:all`, or CI.

## One-time host and device setup

1. Install full Xcode, open it once, install the matching iPadOS platform, and select it with `xcode-select`.
2. Add the Apple account/team used to sign WebDriverAgent in Xcode and ensure an Apple Development certificate is available.
3. Run `/usr/bin/safaridriver --enable` once and approve the macOS prompt.
4. Connect and trust the physical iPad. Enable Developer Mode, Safari Web Inspector, Safari Remote Automation, and UI Automation when that setting is present.
5. Keep the iPad connected, unlocked, awake, and on a network that can reach the Mac.

Do not install Appium globally. The suite uses the repository-local Appium and XCUITest driver versions from `package-lock.json`.

## Private configuration

Copy `.ipad-testing.env.example` to `.ipad-testing.env` and replace the placeholders. The local file is ignored by Git and parsed as `NAME=value` data; it is never sourced or executed.

Required for XCUITest unless a preinstalled WebDriverAgent is selected:

```text
SAFARI_DEVICE_UDID=<physical iPad UDID>
APPIUM_XCODE_ORG_ID=<10-character Apple team ID>
APPIUM_XCODE_SIGNING_ID=Apple Development
APPIUM_WDA_BUNDLE_ID=<unique provisionable reverse-DNS bundle ID>
APPIUM_ALLOW_PROVISIONING_UPDATES=1
```

Optional settings:

- `SAFARI_IPAD_BASE_URL=http://<mac-lan-address>:4177` overrides automatic LAN-address selection.
- `APPIUM_XCODE_CONFIG_FILE=/absolute/path/to/local.xcconfig` supplies custom signing settings.
- `APPIUM_USE_PREINSTALLED_WDA=1` reuses an already signed WebDriverAgent.
- `APPIUM_SHOW_XCODE_LOG=1` includes full Xcode output in the Appium log.
- `SAFARI_IPAD_CONFIG_FILE=/absolute/path/to/private.env` selects another private configuration file.

## Running on demand

Run both transports:

```bash
npm run test:safari:ipad
```

Run only trusted SafariDriver single-touch tests:

```bash
npm run test:safari:ipad:single-touch
```

Run only Appium/XCUITest native keyboard, orientation, and multi-touch tests:

```bash
npm run test:safari:ipad:multitouch
```

The runner builds EEcircuit, checks the production chunk graph, adds a calibration page only to ignored `dist/`, starts the preview server on all interfaces, and tears down SafariDriver/Appium sessions after the run.

## Coverage and diagnostics

The suite verifies trusted shell/control taps, component placement and property editing, the default demo's real transient simulation, Plot cursor snapping, physical pinch/pan/double-tap gestures, and portrait/landscape layout. Exhaustive schematic wiring geometry remains owned by `EEcircuit-schematic`'s physical-iPad suite.

Failures attach device and browser metadata, orientation and calibration, captured trusted input events, browser errors, DOM state, Appium logs, and an iPad screenshot under the normal Playwright results directory.
