# Portable Overlay on Stable 1.2.7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an unpublished portable TimoxVSSC metapackage that reuses the installed stable TimoxVasio 1.2.7 driver, performs a verified graceful handoff from any running 1.2.7 engine, and then starts the pinned alpha engine without installing or registering a driver.

**Architecture:** Keep the portable Electron package side-by-side with the existing installation and bundle only the alpha GUI, engine, PWAR client, API/schema files, and provenance manifest. For local testing, use a separate handoff launcher: enumerate only TimoxVasio clients, ask for confirmation, request a graceful close for their exact PIDs, wait for them to disappear, stop audio through the documented WebSocket command, terminate only the exact old engine PID, wait for the loopback port to be released, and launch the bundled portable app. This is a test harness, not an installer or a stable-release migration.

**Tech Stack:** Electron 28, Node.js `ws` client, electron-builder Windows portable target, Node test runner, existing `artifacts.lock.json` and release preflight.

**Spec:** This plan and the repository `AGENTS.md` constraints.

## Global Constraints

- The portable package must not install or register `TimoxVasio.dll`.
- The installed ASIO driver remains the stable 1.2.7 driver; the alpha engine must use it only after the old engine has handed it off.
- Existing TimoxVasio clients must be closed before `engine.stop`; the launcher must never close unrelated applications.
- `engine.stop` is an audio stop; the handoff launcher must verify stopped state and zero clients before ending the old host process.
- Preserve API 1.1 for the bundled engine, loopback-only discovery, authentication, `%APPDATA%/timox-vsounddealer`, and the single-instance lock.
- Stop on any ambiguous API, process identity, version, revision, or artifact hash.
- Do not start GUI/audio processes or qualify hardware during implementation tests.

## Review Focus

- Stable 1.2.7 API is reachable but has no host-shutdown capability: package must refuse takeover, not kill or race it. Test in `electron/engine-handoff.test.js` with a mocked API.
- The old engine has connected ASIO clients: `engine.stop` must be rejected and the user must be told to close clients. Test the documented error path.
- The old API is occupied, malformed, timing out, or reports an unknown engine: startup must refuse to launch a second engine. Extend discovery tests.
- A clean stop leaves the API port occupied until host exit: handoff must wait for port release and then verify the bundled engine's API 1.1 identity before opening the window.
- Portable packaging must contain the handoff metadata and no driver installer/registration payload. Verify with a packaging test and the existing release preflight.

### Task 1: Define the local test handoff

**Files:**
- Create: `scripts/portable-overlay-handoff.ps1`
- Create: `scripts/portable-overlay-handoff.test.cjs`
- Modify: `RELEASE.md`

**Interfaces:**
- Produces a developer-only launcher for the already-built portable preview.
- It targets a PID resolved from the exact stable engine path, never from a broad process name.
- It lists current TimoxVasio client PIDs, requests graceful window close with explicit confirmation, verifies zero clients, stops audio through `engine.stop`, then ends that exact host process and waits for port 52525 to become available.

- [ ] **Step 1: Write failing tests** for client enumeration, confirmation-gated graceful close, refusal when a client remains, stop acknowledgement, exact PID/path selection, port-release wait, and no launch when validation fails.
- [ ] **Step 2: Run the focused tests** and verify the expected failures.
- [ ] **Step 3: Implement the PowerShell launcher** with explicit `-StableEnginePath` and `-PortableExePath` parameters and a dry-run mode; never uninstall, register, or overwrite the driver.
- [ ] **Step 4: Document the reversible test sequence** and the return-to-1.2.7 command in `RELEASE.md`.
- [ ] **Step 5: Run the focused handoff tests**; expected result is a passing mocked handoff without starting real audio.
- [ ] **Step 6: Commit** the test-harness change.

### Task 2: Keep normal Electron startup conservative

**Files:**
- Modify: `RELEASE.md`
- Test: `electron/engine-discovery.test.js`

**Interfaces:**
- Normal startup continues to refuse an incompatible occupied API. The explicit handoff remains opt-in through the test launcher so ordinary users cannot accidentally terminate an engine they did not select.

- [ ] **Step 1: Add a regression test** that normal startup still refuses an occupied incompatible API and does not spawn a competing engine.
- [ ] **Step 2: Run `npm run electron-test`**; expected result is all Electron and script tests passing.
- [ ] **Step 3: Commit** the conservative startup/documentation update.

### Task 3: Add the portable metapackage profile

**Files:**
- Modify: `electron-builder.tvsd.json`
- Modify: `package.json`
- Modify: `scripts/before-pack.cjs`
- Modify: `scripts/verify-artifacts.cjs`
- Modify: `RELEASE.md`
- Test: `scripts/verify-artifacts.test.cjs`

**Interfaces:**
- Produces `TimoxVSSC-${version}-portable-overlay.preview.exe` as an unsigned, unpublished Windows portable artifact.
- The package bundles the pinned alpha engine/PWAR/schema inputs and a handoff manifest; it contains no ASIO DLL, installer NSIS script, registration command, or driver archive.

- [ ] **Step 1: Add a failing packaging assertion** that the portable overlay profile contains no driver payload and declares the required external driver version `1.2.7`.
- [ ] **Step 2: Run the assertion** and verify it fails against the current generic portable metadata.
- [ ] **Step 3: Add the overlay artifact name and manifest fields** while preserving the existing preflight hash/revision checks.
- [ ] **Step 4: Run `npm run release-preflight` and the packaging tests**; expected result is all pinned inputs verified and no driver installation surface present.
- [ ] **Step 5: Commit** the packaging profile.

### Task 4: End-to-end dry-run verification

**Files:**
- Modify: `electron/main-startup.test.js`
- Modify: `RELEASE.md`

- [ ] **Step 1: Add a fully mocked startup test** covering stable 1.2.7 detected → graceful handoff → port release → bundled API 1.1 startup.
- [ ] **Step 2: Add the negative startup test** covering unsupported shutdown and verify that no bundled process is spawned.
- [ ] **Step 3: Run `npm run electron-test`, `npm run contract-test`, and `npm run release-preflight`**.
- [ ] **Step 4: Run `CI=true npm run react-test -- --watchAll=false --runInBand` and record unrelated existing failures honestly; do not claim a release candidate from focused tests alone.
- [ ] **Step 5: Commit the verification/documentation update.**

## Scope boundary

This provides a reversible local test path, not a production installer and not a graceful host-shutdown API. Only TimoxVasio clients are asked to close, and only after confirmation. The audio stream is stopped through the stable API before the selected old host process is ended; if the state, client list, executable path, PID, or port-release wait is ambiguous, the launcher aborts without starting the alpha package.
