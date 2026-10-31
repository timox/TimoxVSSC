# TimoxVSSC

Next development candidate: **0.2.0-alpha.1**, paired with engine
**1.3.0-alpha.1** (API **1.1**, MIDI backend enabled). The external ASIO driver
remains **1.2.7**. See [RELEASE.md](RELEASE.md) and `artifacts.lock.json` for the
assembly, source revisions and outstanding binary/runtime validation.

Portable control preview extracted from TimoxVasio. The technical engine API and driver identity remain unchanged. See [MIGRATION.md](MIGRATION.md) for provenance and validation.

With the versions in `package-lock.json` installed, run `npm run react-build`, `npm run contract-test`, and `npm run electron-test`. `npm start` launches the UI and may launch its pinned engine; do not use it just to verify a build.

For packaging, place the separately built engine and PWAR client under `artifacts/backend/`, pin their source revision and SHA-256 in `artifacts.lock.json`, then run `npm run dist`. Missing or changed inputs fail packaging. API schema snapshots are included so rendering and unit tests do not require engine binaries. There is no driver installer in this preview.

The application deliberately retains `%APPDATA%/timox-vsounddealer` for preferences, browser storage and the existing single-instance lock. Existing `%APPDATA%/vasio-control` and preview-specific profiles are not merged or deleted. API authentication and engine discovery remain unchanged.
