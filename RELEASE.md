# Version and assembly tracking

This repository's next candidate is **TimoxVSSC 0.2.0-alpha.1**, not the old
combined TimoxVasio 1.2.7 package. It requires engine **1.3.0-alpha.1**, API **1.1**,
and a Windows MIDI Services enabled build for its MIDI workspace. The external
ASIO driver remains **1.2.7** and is not installed or bundled by this portable app.
PWAR is tracked by source revision and control protocol v1, not a fabricated
product version. Its audio continuity remains unqualified.

## Verified Windows engine candidate

The MIDI-enabled engine has now been built on Windows with Visual Studio 2026:
[run 41239505040](https://github.com/timox/TimoxVAudioEngine/actions/runs/41239505040),
source commit `3b511dda58d09e03683d5135fb3b98ec01ef80b7`. All **34 CTest tests** and
the build-provenance test passed. The SDK archive was verified against Microsoft's
published SHA-256. The matching executable and receipt are pinned in
artifacts.lock.json; `npm run pin-engine` and the engine-specific checks pass.

Executable SHA-256:
`16d730afd3ebbdac0e24c73278f764de8d7016fea7d257d87ecefa66cbdcd0dc`.

This validates compilation and isolated tests, not the preview runtime, physical
MIDI devices or audio timing. The complete GUI package still requires its pinned
PwarAsioClient.exe; it is absent from this cloud checkout. The old October 26
engine must not be substituted for this candidate.

`artifacts.lock.json` is the single assembly manifest: independent component
versions, exact expected source revisions, feature flags, binary/schema hashes
and explicit qualification gaps. `package.json` owns the GUI product version;
`package-lock.json` must agree. API version is a compatibility contract and does
not imply that the optional MIDI backend is present.

## From source candidate to package

1. Integrate the paired engine and GUI PRs. Update the engine revision in the
   manifest if the final source commit changes. Keep historical extraction
   provenance in import-manifest.json; do not confuse that manifest's original
   sourceCommit with the current component revision.
2. Build the engine from that clean commit on Windows using its RELEASE.md,
   with TIMOX_ENABLE_WINDOWS_MIDI_SERVICES=ON and the verified MIDI metadata.
   Run the Windows suite and qualify the real MIDI backend separately. Copy
   TimoxVirtualAsioEngine.exe and engine-build.json together to artifacts/backend.
3. Run `npm run pin-engine`. This validates the receipt against the expected
   source commit, version, API, MIDI option and actual binary SHA-256, then updates
   only the engine artifact pin. The previous October 26 binary cannot satisfy
   this MIDI candidate; the current pin identifies the verified build above.
4. Supply the existing pinned PwarAsioClient.exe. A rebuilt/different PWAR client
   needs its own verified provenance and a coordinated engine supervisor hash
   update; do not simply overwrite its hash. Refresh schema snapshots/pins only
   from the selected engine source revision.
5. Run `npm ci`, `npm run release-metadata`, `npm run contract-test`,
   `npm run electron-test`, `CI=true npm run react-test -- --watchAll=false --runInBand`
   and `npm run react-build`. Record failures honestly: four existing React suites
   currently fail; successful focused MIDI tests do not make the full suite green.
6. Commit manifest/version/source changes. Run `npm run release-preflight` and
   `npm run dist` on the coordinated Windows packaging environment. beforePack
   refuses dirty GUI sources and emits build/release-manifest.json with the exact
   GUI Git revision, component pins and engine receipt. It is included both in
   the renderer build and as resources/release-manifest.json. Postflight checks
   the packaged binary/schema copies and metadata.

Expected filename: `TimoxVSSC-0.2.0-alpha.1-preview.exe`. This is an unsigned
candidate name, not a claim of publication or successful runtime qualification.
Keep the release manifest alongside any distributed file and record the final
distributable's SHA-256 externally after packaging (a file cannot contain its
own final hash).

## What comes after 1.2.7

| Stage | Implemented scope | Qualification |
|---|---|---|
| Public combined 1.2.7 | ASIO driver, routing engine, Control GUI, API 1.0 | Historical published release |
| Extracted audio baseline | Software clock, WASAPI bridges, PWAR supervisor, API 1.1 | Existing bounded tests/hardware observations; no blanket qualification |
| Supervision baseline | Engine-owned adherents/nodes/links, observations and corresponding GUI | Focused tests; freshness limits remain |
| This paired MIDI candidate | MIDI 1.0 ports/routes, BPM, reclocking to the audio reference, separate GUI workspace | Portable/fake-backend tests; Windows backend and hardware remain to validate |

Native Windows audio is experimental; the shared transport and ASIO driver are
owned by TimoxVasio, WASAPI remains inside TimoxVAudioEngine, and PWAR transport
and Linux backends are owned by Timox-Pwar. The original repository retaining
historical source copies does not make it the current owner of every component.
