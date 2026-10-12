# Implementation Log — Plug or Not, Slice 1: Answer for my location (no map)

- **Plan:** `docs/agentic/2026-10-09-plug-or-not/plan.md`
- **Requirements:** `docs/agentic/2026-10-09-plug-or-not/prd.md`
- **Started:** 2026-10-12 13:00
- **Completed:** 2026-10-12 13:45
- **Worker isolation:** normal
- **Template version:** default/0.2.1
- **Mode:** slice-aware — Slice 1 (plan approved by the user 2026-10-12; plan status Draft → Approved)

**Plugin version:** 0.5.3
**Agent Sessions:** claude-code: 4def9f23-a51e-417b-b327-10901565e942
**Agent Sessions:** claude-code: a23146ca-79b6-4ab5-8438-6d08d1321484
**Agent Sessions:** claude-code: 0ef86631-d1ec-46ad-99a2-5d397c9b06ce
**Agent Sessions:** claude-code: 4626c188-d2ad-43a5-8126-5a96dcf065de

## Pre-Flight

Filled once, before the first chunk. All checks must pass before dispatching the first worker.

### Test runner

```
$ ls package.json
ls: package.json: No such file or directory
(greenfield repo — no test runner yet; Task 1 creates package.json, Vitest and the `npm test` script)
$ node --version
v20.19.5
$ npm --version
11.14.0
```

### Build / lint / typecheck

```
$ npm view vite@8.3.4 version             -> 8.3.4
$ npm view vitest@5.0.3 version           -> 5.0.3
$ npm view typescript@7.0.2 version       -> 7.0.2
$ npm view tsx@4.23.15 version            -> 4.23.15
$ npm view @fontsource/sora@5.3.0 version -> 5.3.0
$ npm view @fontsource/ibm-plex-mono@5.3.0 version -> 5.3.0
$ npm view @types/node@22.20.5 version    -> 22.20.5
```

### External services / auth

```
$ curl -sSI https://opendata.ndw.nu/charging_point_tariffs_ocpi.json.gz | head -3
HTTP/1.1 200 OK
Date: Mon, 12 Oct 2026 11:00:28 GMT
Server: Apache
$ curl -sSI https://opendata.ndw.nu/charging_point_locations_ocpi.json.gz | head -3
HTTP/1.1 200 OK
Date: Mon, 12 Oct 2026 11:00:28 GMT
Server: Apache
$ gh auth status
github.com
  ✓ Logged in to github.com account christianrexwinkel-tomtom (keyring)
  - Active account: true
  - Git operations protocol: https
$ gh repo view christianrexwinkel-tomtom/plug-or-not --json name,visibility
{"name":"plug-or-not","visibility":"PRIVATE"}
```

### Pre-commit hooks

```
$ ls .pre-commit-config.yaml
ls: .pre-commit-config.yaml: No such file or directory
(no pre-commit config and no non-sample git hooks — nothing to run)
```

Result: ☑ all green

---

## Slice 1: Answer for my location (no map)

<!-- Chunk-workers append `### Chunk N: Tasks A–B` entries below, each with: Plan tasks covered, Tests written, Worker reported peak context, Worker status, Commit SHA(s), and a `#### Verify output (verbatim)` block. -->

<!-- Duplicate the Chunk N block above for each subsequent chunk.
     A new chunk starts only after the previous chunk is committed and its
     tasks' tests pass. The orchestrator tightens its remaining-chunk
     estimate from each chunk's reported peak; if a worker overflowed, the
     remainder was re-chunked smaller (record the re-chunk in the new
     Chunk N entry's "Plan tasks covered"). -->

### Chunk 1: Tasks 1–8

- **Plan tasks covered:** Tasks 1–8 (toolchain + PRD-figure acceptance suite, flow acceptance suite, shared data format, Amsterdam clock, tariff matching and trust guard, cost curve, petrol comparison/verdict/window/ranking, results builder)
- **Tests written:** test/acceptance/prd-figures.test.ts (7, red until Task 10), test/acceptance/flows.test.ts (13, red until Task 15), src/shared/data-format.test.ts (3), src/engine/clock.test.ts (3), src/engine/tariff.test.ts (16), src/engine/curve.test.ts (14), src/engine/compare.test.ts (13), src/engine/results.test.ts (4) — 53 unit tests passing; both acceptance suites fail only on the missing later modules (src/ui/entry-view.ts, src/app.ts)
- **Worker reported peak context:** ≈60k tokens
- **Worker status:** clear
- **Commit SHA(s):** 483fbcb, 5eca59f, e856028, e228691, 42a7872, cafef45, d2a7c0a, b1ed16b

#### Verify output (verbatim)

```
$ npm test -- test/acceptance/prd-figures.test.ts

> plug-or-not@0.1.0 test
> TZ=America/New_York vitest run test/acceptance/prd-figures.test.ts


 RUN  v5.0.3 /Users/christianrexwinkel/Repo/plug-or-not

 ❯ test/acceptance/prd-figures.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/acceptance/prd-figures.test.ts [ test/acceptance/prd-figures.test.ts ]
Error: Cannot find module '../../src/engine/results.ts' imported from /Users/christianrexwinkel/Repo/plug-or-not/test/acceptance/prd-figures.test.ts
 ❯ test/acceptance/prd-figures.test.ts:4:1
      2| // (tile data → cost curves → ranking at the stay → what the details p…
      3| import { describe, expect, it } from 'vitest';
      4| import { computeEntries, rankAtStay, type EngineSettings } from '../..…
       | ^
      5| import { entryViews } from '../../src/ui/entry-view.ts';
      6| import type { TileLocation, TileTariff } from '../../src/shared/data-f…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  07:02:28
   Duration  109ms (worker 97%, environment 3%)


$ npm test -- test/acceptance/flows.test.ts

> plug-or-not@0.1.0 test
> TZ=America/New_York vitest run test/acceptance/flows.test.ts


 RUN  v5.0.3 /Users/christianrexwinkel/Repo/plug-or-not

 ❯ test/acceptance/flows.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/acceptance/flows.test.ts [ test/acceptance/flows.test.ts ]
Error: Cannot find module '../../src/app.ts' imported from /Users/christianrexwinkel/Repo/plug-or-not/test/acceptance/flows.test.ts
 ❯ test/acceptance/flows.test.ts:3:1
      1| // Acceptance: the PRD Story 1–3 flows for Slice 1, through the contro…
      2| import { describe, expect, it } from 'vitest';
      3| import { createApp } from '../../src/app.ts';
       | ^
      4| import { entryViews } from '../../src/ui/entry-view.ts';
      5| import { BRUSSELS, EXAMPLE_RAW, NUENEN, memoryStorage, stubDeps } from…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  07:02:28
   Duration  112ms (worker 97%, environment 3%)


$ npm test -- src/shared/data-format.test.ts

> plug-or-not@0.1.0 test
> TZ=America/New_York vitest run src/shared/data-format.test.ts


 RUN  v5.0.3 /Users/christianrexwinkel/Repo/plug-or-not


 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  07:02:35
   Duration  99ms (transform 58%, import 23%, tests 10%, worker 9%)


$ npm test -- src/engine/clock.test.ts

> plug-or-not@0.1.0 test
> TZ=America/New_York vitest run src/engine/clock.test.ts


 RUN  v5.0.3 /Users/christianrexwinkel/Repo/plug-or-not


 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  07:02:42
   Duration  147ms (import 60%, transform 22%, tests 15%, worker 3%)


$ npm test -- src/engine/tariff.test.ts

> plug-or-not@0.1.0 test
> TZ=America/New_York vitest run src/engine/tariff.test.ts


 RUN  v5.0.3 /Users/christianrexwinkel/Repo/plug-or-not


 Test Files  1 passed (1)
      Tests  16 passed (16)
   Start at  07:02:43
   Duration  140ms (transform 55%, import 35%, tests 7%, worker 3%)


$ npm test -- src/engine/curve.test.ts

> plug-or-not@0.1.0 test
> TZ=America/New_York vitest run src/engine/curve.test.ts


 RUN  v5.0.3 /Users/christianrexwinkel/Repo/plug-or-not


 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  07:02:44
   Duration  160ms (transform 35%, import 33%, tests 29%, worker 3%)


$ npm test -- src/engine/compare.test.ts

> plug-or-not@0.1.0 test
> TZ=America/New_York vitest run src/engine/compare.test.ts


 RUN  v5.0.3 /Users/christianrexwinkel/Repo/plug-or-not


 Test Files  1 passed (1)
      Tests  13 passed (13)
   Start at  07:02:45
   Duration  153ms (transform 42%, import 38%, tests 16%, worker 3%)


$ npm test -- src/engine/results.test.ts

> plug-or-not@0.1.0 test
> TZ=America/New_York vitest run src/engine/results.test.ts


 RUN  v5.0.3 /Users/christianrexwinkel/Repo/plug-or-not


 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  07:02:46
   Duration  183ms (transform 43%, import 28%, tests 27%, worker 3%)


```

### Chunk 2: Tasks 9–14

- **Plan tasks covered:** Tasks 9–14 (display formatting, entry view model, settings service, Netherlands border and browser location, tile data service nearest 10, data build script and committed snapshot)
- **Tests written:** src/ui/format.test.ts (11), src/ui/entry-view.test.ts (5), src/services/settings.test.ts (29), src/services/location.test.ts (13), src/services/data.test.ts (10), scripts/build-data.test.ts (13), test/snapshot.test.ts (2) — 83 new tests; Task 1's test/acceptance/prd-figures.test.ts (7) now green. Full `npm test`: 143 passed, only test/acceptance/flows.test.ts fails (missing src/app.ts, Task 15), as expected.
- **Live data (2026-10-12 feeds):** `npm run build-data` wrote 592 tiles, 72,534 locations, data of 2026-10-12T10:02:00.000Z (7.7 s, ≈1.16 GB peak RSS, 24 MB). Smoke check: Parkstraat Nuenen 11 entries, 1 unknown (9%); Klokgebouw Eindhoven 10 entries, 0 unknown (0%). Natural Earth border output matched the plan exactly (608 points, same SHA-256). Raw feeds and the Natural Earth file stayed out of the repo (feeds in memory; GeoJSON in the session scratchpad).
- **Worker reported peak context:** ≈60k tokens
- **Worker status:** clear
- **Commit SHA(s):** 761d691, 000c266, 820833c, 1e4ef1a, 71d4b72, 7dd8f20

#### Verify output (verbatim)

```
$ npm test -- src/ui/format.test.ts

> plug-or-not@0.1.0 test
> TZ=America/New_York vitest run src/ui/format.test.ts

 RUN  v5.0.3 /Users/christianrexwinkel/Repo/plug-or-not

 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  07:03:57
   Duration  130ms (transform 47%, import 38%, tests 11%, worker 4%)

$ npm test -- src/ui/entry-view.test.ts test/acceptance/prd-figures.test.ts

> plug-or-not@0.1.0 test
> TZ=America/New_York vitest run src/ui/entry-view.test.ts test/acceptance/prd-figures.test.ts

 RUN  v5.0.3 /Users/christianrexwinkel/Repo/plug-or-not

 Test Files  2 passed (2)
      Tests  12 passed (12)
   Start at  07:04:03
   Duration  224ms (tests 48%, transform 30%, import 20%, worker 2%)

$ npm test -- src/services/settings.test.ts

> plug-or-not@0.1.0 test
> TZ=America/New_York vitest run src/services/settings.test.ts

 RUN  v5.0.3 /Users/christianrexwinkel/Repo/plug-or-not

 Test Files  1 passed (1)
      Tests  29 passed (29)
   Start at  07:04:34
   Duration  120ms (transform 57%, import 21%, tests 16%, worker 5%)

$ npm test -- src/services/location.test.ts

> plug-or-not@0.1.0 test
> TZ=America/New_York vitest run src/services/location.test.ts

 RUN  v5.0.3 /Users/christianrexwinkel/Repo/plug-or-not

 Test Files  1 passed (1)
      Tests  13 passed (13)
   Start at  07:04:58
   Duration  128ms (transform 60%, import 22%, tests 13%, worker 5%)

$ node scripts/build-nl-border.mjs "$SCRATCH/ne/ne_10m_admin_0_countries.geojson"
rings 9 points 608 bytes 9289
$ shasum -a 256 src/services/nl-border.ts
1838f77ec67ce3d19088138c05c54d22fc6817edf08a3bb35b0640aac41c7cca  src/services/nl-border.ts

$ npm test -- src/services/data.test.ts

> plug-or-not@0.1.0 test
> TZ=America/New_York vitest run src/services/data.test.ts

 RUN  v5.0.3 /Users/christianrexwinkel/Repo/plug-or-not

 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  07:05:04
   Duration  156ms (transform 44%, tests 42%, import 11%, worker 3%)

$ npm run build-data
Wrote 592 tiles, 72534 locations, data of 2026-10-12T10:02:00.000Z
(7.72 s real, 1,157,300,224 bytes max RSS; public/data 24M; git status after commit: clean, no *.json.gz, no public/data.next/)

$ npm test -- test/snapshot.test.ts --silent=false

> plug-or-not@0.1.0 test
> TZ=America/New_York vitest run test/snapshot.test.ts --silent=false

 RUN  v5.0.3 /Users/christianrexwinkel/Repo/plug-or-not

stdout | test/snapshot.test.ts > committed snapshot in public/data > Parkstraat Nuenen: 10 locations, at least one priced entry, no errors
Parkstraat Nuenen: 11 entries, 1 unknown (9%)

stdout | test/snapshot.test.ts > committed snapshot in public/data > Klokgebouw Eindhoven: 10 locations, at least one priced entry, no errors
Klokgebouw Eindhoven: 10 entries, 0 unknown (0%)

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  07:05:53
   Duration  172ms (transform 39%, tests 38%, import 21%, worker 2%)

$ npm test -- scripts/build-data.test.ts test/snapshot.test.ts

> plug-or-not@0.1.0 test
> TZ=America/New_York vitest run scripts/build-data.test.ts test/snapshot.test.ts

 RUN  v5.0.3 /Users/christianrexwinkel/Repo/plug-or-not

 Test Files  2 passed (2)
      Tests  15 passed (15)
   Start at  07:05:55
   Duration  190ms (transform 43%, tests 32%, import 22%, worker 3%)

$ git ls-files public/data | grep -c tiles/
592
```

### Chunk 3: Tasks 15–19

- **Plan tasks covered:** Tasks 15–19 (controller, views, page shell/theme/fonts, GitHub Pages workflow, Slice 1 acceptance verification Steps 1–3)
- **Tests written:** src/app.test.ts (7). Task 2's test/acceptance/flows.test.ts (13) now green. Tasks 16–18 have no unit tests by plan design (views are glue; D-17); checked by `tsc --noEmit`, the production build and a browser run. Full `npm test`: 16 files, 163 tests passed.
- **Browser run (Task 17 Step 6, dev server, desktop preview):** first visit shows "Set up your car" with the setup notice and "Charger prices from NDW open data of 12 Oct 2026, 12:02"; charging speed `0` shows "Charging speed must be between 1 and 22 kW." with focus on that field; PRD example values (petrol `2,399`) open "Parked here now"; the preview browser denied location → "We couldn't get your location. Allow location access in your browser and try again." with "Try again" (approved Slice 1 wording); Find chargers with battery unset shows "Enter your current battery level (0–100%)."; with a stubbed Nuenen position (51.4436, 5.5519), battery 20%, stay 45 min → "#1 of 11 · best saving first", Worth it, strip of 11; tapping strip item 3 selects it ("#3 of 11"); switching emulated colour scheme to dark changed the body background to #0c1211 live; only `localhost:5173` requested; no console errors. Check 4 (drag the slider while locating) was not exercised in the automated preview — left to the manual device pass.
- **Task 19 Steps 4 and 5:** pending — post-merge / manual device checks, owned by the user.
- **Worker reported peak context:** ≈45k tokens
- **Worker status:** clear
- **Commit SHA(s):** 8d2ae39, 6d38b1a, 737d46b, 97575ef

#### Verify output (verbatim)

```
$ npm test -- src/app.test.ts test/acceptance/flows.test.ts

> plug-or-not@0.1.0 test
> TZ=America/New_York vitest run src/app.test.ts test/acceptance/flows.test.ts


 RUN  v5.0.3 /Users/christianrexwinkel/Repo/plug-or-not


 Test Files  2 passed (2)
      Tests  20 passed (20)
   Start at  07:07:09
   Duration  211ms (transform 39%, tests 39%, import 20%, worker 2%)

$ npx tsc --noEmit && npm test
(tsc: no output, exit 0)

 Test Files  16 passed (16)
      Tests  163 passed (163)
   Start at  07:07:21
   Duration  568ms (tests 39%, transform 36%, import 22%, worker 4%)

$ npm run build   (tail)
dist/assets/index-Apbk2VQL.css                                    17.17 kB │ gzip:  3.96 kB
dist/assets/index-Z4vtqnCX.js                                     35.69 kB │ gzip: 13.72 kB

✓ built in 571ms
$ ls dist/data/manifest.json dist/assets/*.woff2 | head -3
dist/assets/ibm-plex-mono-cyrillic-500-normal-Bq9vWWag.woff2
dist/assets/ibm-plex-mono-cyrillic-600-normal-CTOM6hUh.woff2
dist/assets/ibm-plex-mono-cyrillic-ext-500-normal-BqneJy0T.woff2
$ ls dist/data/manifest.json
dist/data/manifest.json

$ grep -cE 'npm (ci|test|run build)|path: dist|deploy-pages@v5' .github/workflows/deploy.yml
5

--- Task 19 Steps 1–3 ---
$ npm test

> plug-or-not@0.1.0 test
> TZ=America/New_York vitest run


 RUN  v5.0.3 /Users/christianrexwinkel/Repo/plug-or-not


 Test Files  16 passed (16)
      Tests  163 passed (163)
   Start at  07:08:46
   Duration  607ms (transform 37%, tests 34%, import 24%, worker 4%)

$ npm run build   (tail)
dist/assets/index-Z4vtqnCX.js                                     35.69 kB │ gzip: 13.72 kB

✓ built in 257ms
$ git ls-files | grep -cE '\.json\.gz$|data\.next/'
0

Step 4 (gh run list on main, HTTPS on phones): pending — post-merge / manual device checks, owned by the user.
Step 5 (device checks, stopwatch G8-AC2): pending — post-merge / manual device checks, owned by the user.
```

### Chunk 4: End-Review round 1 fixes

- **Issues fixed:** 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
- **Tests added or changed:** src/ui/messages.test.ts (new, 13: 12 PRD strings incl. the approved interim denied-location text, plus the data-date sentence); src/app.test.ts (1 tightened to the concrete PRD S1 petrol cost €4.4262 at €2.459/L, 1 added for battery-full → Settings Save); src/services/data.test.ts (1 added, G4-AC2 several tariffs per location count once); scripts/build-data.test.ts (4 added: DATA_BOUNDS, out-of-bounds drop, dataTimestampFrom ×2); test/snapshot.test.ts (fixed timestamp FRIDAY_1000 instead of Date.now()). Issues 6, 8 and 9 are DOM behaviour with no DOM test dependency; checked by `tsc --noEmit` and the build only.
- **Snapshot regenerated (issue 7):** `Wrote 580 tiles, 72516 locations, data of 2026-10-12T10:02:00.000Z` (was 592 tiles, 72534 locations, same timestamp). 12 out-of-bounds tiles removed (0_0, 900_1350, 109_1068, 133_771, 396_-957, 403_-798, 469_138, 471_-17, 480_-18, 506_133, 519_76, 690_151). 121 other tiles changed by the refreshed locations feed (ordering/content). No raw feeds in git.
- **Worker reported peak context:** ≈60k tokens
- **Worker status:** clear
- **Commit SHA(s):** 9d9e3f5, b68e095

#### Verify output (verbatim)

```
$ npm test
 Test Files  17 passed (17)
      Tests  182 passed (182)
   Start at  07:20:18
   Duration  578ms (tests 37%, transform 35%, import 24%, worker 4%)

$ npm run build
dist/assets/index-Cl58uyk0.css                                    17.20 kB │ gzip:  3.96 kB
dist/assets/index-Dxdb_XU8.js                                     36.06 kB │ gzip: 13.87 kB

✓ built in 190ms
```

## End-Review (Slice 1)

Range reviewed: `d71f712..HEAD` (Opus reviewer, no worker narrative, implementation-log excluded).

- **Verdict:** ISSUES_FOUND → fixed → re-reviewed → APPROVED
- **Issues found:** Round 1:
  - **(Important)** No test covered the PRD error and notice strings.
  - **(Important)** The S1 scenario 3 "next answer uses new petrol price" test only asserted `not.toEqual`.
  - Untested parts: G4-AC2 (once per location towards the 10) and G2-AC4 (Last-Modified to ISO).
  - The battery-full path kept stale `computed` results.
  - The unset battery slider ignored a tap at exactly 50.
  - Bogus feed coordinates stretched the `coversAll` bounds.
  - The focus-restore comment and selector didn't match in `results.ts`.
  - `role=listitem` sat on a `<button>`.
  - `Date.now()` was used in the snapshot test.

  All fixed in Chunk 4 (9d9e3f5, b68e095). Round 2: APPROVED, with three optional Minor notes left open as non-blocking:
  - `src/ui/messages.ts:33-36` `dataDateSentence` is used only by its test; `setup.ts` builds the sentence separately.
  - `src/ui/results.ts:52` maps the "never" verdict to the "not for this stay" strip class without saying so.
  - `src/app.test.ts:106` has an indentation slip.
- **Tests-vs-spec audit:** Round 2 found the tests check specified behaviour against independent oracles:
  - exact PRD figures, including the €6.80 peak/off-peak split, which tells it apart from €6.60 and €6.86
  - a brute-force nearest-10
  - every tie-breaker and every trust-guard cause
  - exact message strings, pinned in `messages.test.ts`

  Remaining gap, within the plan: no DOM tests, so the mapping from state to DOM is covered only by the Task 19 manual device checks. Tests that lock in details, harmless: the `entryId` format and `stripText`/`chipText`.
- **Reviewer rounds:** 2
- **Cap outcome:** none — the reviewer approved in round 2

### Final full verify output (verbatim)

Command: `npm test 2>&1 | tail -6; npm run build 2>&1 | tail -6; git ls-files | grep -cE '\.json\.gz$|data\.next/'`

```

 Test Files  17 passed (17)
      Tests  182 passed (182)
   Start at  07:24:51
   Duration  871ms (tests 44%, transform 30%, import 22%, worker 5%)

dist/assets/sora-latin-600-normal-1_7fyUAY.woff                   18.85 kB
dist/assets/sora-latin-700-normal-BKPfQAnC.woff                   18.86 kB
dist/assets/index-Cl58uyk0.css                                    17.20 kB │ gzip:  3.96 kB
dist/assets/index-Dxdb_XU8.js                                     36.06 kB │ gzip: 13.87 kB

✓ built in 434ms
$ git ls-files | grep -cE '\.json\.gz$|data\.next/'
0
```

**Task 19 steps 4–5 (post-merge Pages deployment check, manual device checks incl. the G8-AC2 stopwatch):** pending — owned by the user after merge.

---

## Slice 2: Worth-it window and live stay changes

- **Started:** 2026-10-12 (session a23146ca-79b6-4ab5-8438-6d08d1321484)
- **Base SHA:** be1da03
- **Worker isolation:** normal
- **Chunk layout:** one chunk, Tasks 20–25 (about 150 LLOC, well inside one window)

### Pre-Flight (Slice 2)

```
$ node --version
v20.19.5
$ npm --version
11.14.0
$ npm test

 Test Files  17 passed (17)
      Tests  182 passed (182)
   Start at  08:11:28
   Duration  610ms (tests 37%, transform 35%, import 24%, worker 4%)

$ npm run build
dist/assets/index-Dxdb_XU8.js                                     36.06 kB │ gzip: 13.87 kB

✓ built in 525ms
$ gh auth status
github.com
  ✓ Logged in to github.com account christianrexwinkel-tomtom (keyring)
  - Active account: true
  - Git operations protocol: https
$ ls .pre-commit-config.yaml
ls: .pre-commit-config.yaml: No such file or directory
(no non-sample git hooks)
```

Result: ☑ all green

<!-- Chunk-workers append `### Chunk N: Tasks A–B` entries for Slice 2 below this line. -->

### Chunk 1: Tasks 20–25

- **Plan tasks covered:** Tasks 20–25 (Slice 2 acceptance tests, window sentence formatter, window line in the details panel, live stay change in the controller, stay slider in the results top bar, verify Slice 2 acceptance). Task 25 steps 1–2 run here; steps 3–4 (post-merge Pages deployment check, manual device checks incl. the G8-AC2 stopwatch) are **pending — owned by the user after merge**
- **Tests written:** test/acceptance/window-and-stay.test.ts (9, new; 8 red at Task 20, all green after Task 23), src/ui/format.test.ts (+3, 14 total), src/ui/entry-view.test.ts (+1, 6 total; the 3 unknown-entry cases also assert windowText/hasWindow), src/app.test.ts (+2, 10 total), test/fixtures/app-deps.ts gains the `nearest` option. Suite: 182 → 197 tests, 17 → 18 files, matching the plan
- **Worker reported peak context:** ≈55k tokens
- **Worker status:** clear
- **Commit SHA(s):** d32086f (Task 20), 62799f0 (Task 21), 659e817 (Task 22), caca3fd (Task 23), 2a32447 (Task 24)

#### Verify output (verbatim)

```
$ npm test -- test/acceptance/window-and-stay.test.ts      # Task 20, at d32086f
     × scenario 1: Opcharge Zernikestraat "1h30 to 7h30" and Vattenfall Marconilaan "at least 40 min" at battery 10%
     × scenario 2: a tariff that can't be interpreted shows "Price unknown" and no window
     × scenario 3: E-Flux Laboratoriumstraat at battery 10% is never worth it
     × stay outside the window: 45 min against a window from 1h10 reads "Not worth it for this stay"
     × a window from the minimum stay with no upper limit reads "Worth it for any stay"
     × a window from the minimum stay with an upper limit reads "Worth it for any stay up to X"
     × battery level changes the window: Opcharge at 10%, then 70% after going back and searching again
     × scenario 1: releasing the slider re-ranks every result from the cached curves and keeps the selected charger
      Tests  8 failed | 1 passed (9)
$ npm test -- test/acceptance/flows.test.ts src/app.test.ts   # Task 20 step 4
 Test Files  2 passed (2)
      Tests  21 passed (21)
$ npm test -- src/ui/format.test.ts                          # Task 21
 Test Files  1 passed (1)
      Tests  14 passed (14)
$ npm test -- src/ui/entry-view.test.ts                      # Task 22
 Test Files  1 passed (1)
      Tests  6 passed (6)
$ npm run build && npm test -- test/acceptance/window-and-stay.test.ts   # Task 22 step 6, at 659e817
✓ built in 498ms
     × scenario 1: releasing the slider re-ranks every result from the cached curves and keeps the selected charger
      Tests  1 failed | 8 passed (9)
$ npm test -- src/app.test.ts test/acceptance/window-and-stay.test.ts test/acceptance/flows.test.ts   # Task 23 step 4
 Test Files  3 passed (3)
      Tests  32 passed (32)
$ npm test -- src/app.test.ts test/acceptance/window-and-stay.test.ts   # Task 23 verify
 Test Files  2 passed (2)
      Tests  19 passed (19)
$ grep -rnE "pill grow|\bfill\(" src/                        # Task 24 step 4
(no output, exit 1)
$ npm test                                                   # Task 24 verify / Task 25 step 1, at 2a32447
 Test Files  18 passed (18)
      Tests  197 passed (197)
   Start at  08:15:28
   Duration  631ms (tests 42%, transform 32%, import 23%, worker 4%)
$ npm run build                                              # Task 25 step 2
dist/assets/index-CZihSCAV.js                                     37.47 kB │ gzip: 14.26 kB
✓ built in 399ms
```

Task 25 step 3 (`gh run list --workflow deploy.yml --branch main --limit 1` after merge) and step 4 (manual checks on iPhone Safari, Android Chrome, desktop Chrome/Edge/Safari: window line in Night and Day, results slider drag/release, desktop keyboard focus, shared stay, G8-AC2 stopwatch ×5): pending — owned by the user after merge.

### End-Review (Slice 2)

Range reviewed: `be1da03..4f7f3f6`. Opus reviewer, given no worker narrative and with the implementation log excluded.

- **Verdict:** APPROVED (round 1)
- **Issues found:** none blocking. Part A ✅ (G6-AC1, G6-AC5, G6-AC7, G6-AC8/D-30, G7-AC2, G7-AC4, FR-018, PRD S4 and S3 scenario 1 all covered, nothing extra). Part B ✅ with three optional Minor notes left open:
  - `src/app.ts:183-186`: `setStay` calls `set()` twice, once for `stayMin` and once inside `rerank()`. The results DOM is rebuilt twice per release, and the first build briefly pairs the new stay label with the old ranking.
  - `src/ui/format.ts:55-60`: degenerate windows read oddly, e.g. "40 min to 40 min" or "for any stay up to 15 min". The spec doesn't cover these.
  - `src/ui/entry-view.ts:39-40`: `hasWindow` only picks an icon. Acceptable.
- **Tests-vs-spec audit:** the tests check specified behaviour, not the code that was written. The reviewer re-derived every hand-worked PRD figure independently and all match: the 1h10 window start (3.80 kWh at minute 64), −€0.52 at 45 min, the 1h upper limit at battery 90%, Opcharge at 70% never covering its fixed fees, and Cheapkwh against Vattenfall (−€1.48/+€0.39 at 45 min, €5.85/€5.51 at 4h). G7-AC4 is pinned four ways: one `findNearest` call, no 'loading' view, the same `entry` objects, and kWh moving from 5.4 to 2.7. The D-30 test really reorders the results, so a "jump to the new #1" implementation would fail. Remaining gap, within the plan (D-17): the slider wiring (input vs change) and the S4 "Pending" edge case have no DOM test and rely on the Task 25 manual checks. Minor lock-in: `hasWindow` in the entry-view tests.
- **Reviewer rounds:** 1
- **Cap outcome:** none. The reviewer approved in round 1.

#### Final full verify output (verbatim)

Command: `npm test 2>&1 | tail -6; npm run build 2>&1 | tail -3; grep -rnE "pill grow|\bfill\(" src/`

```
 Test Files  18 passed (18)
      Tests  197 passed (197)
   Start at  08:18:03
   Duration  654ms (tests 42%, transform 32%, import 23%, worker 3%)

dist/assets/index-CZihSCAV.js                                     37.47 kB │ gzip: 14.26 kB

✓ built in 483ms
$ grep -rnE "pill grow|fill\(" src/
(exit 1)
```

---

## Slice 3: Spot on a map

- **Started:** 2026-10-12 (session 0ef86631-d1ec-46ad-99a2-5d397c9b06ce)
- **Base SHA:** 79bd1d2
- **Worker isolation:** normal
- **Completed:** 2026-10-12
- **Chunk layout:** one chunk, Tasks 26–34 (Slice 2 peaked at ≈55k; Slice 3 is roughly 3× the plan text, well inside one window)

### Pre-Flight (Slice 3)

```
$ node --version
v20.19.5
$ npm --version
11.14.0
$ npm test
 Test Files  18 passed (18)
      Tests  197 passed (197)
   Start at  09:27:07
   Duration  716ms (tests 38%, transform 32%, import 26%, worker 3%)
$ npm run build
dist/assets/index-CZihSCAV.js                                     37.47 kB │ gzip: 14.26 kB

✓ built in 499ms
$ npm view maplibre-gl@6.11.2 version
6.11.2
$ npm view @maplibre/maplibre-gl-style-spec@26.4.4 version
26.4.4
$ curl -sSI https://tiles.openfreemap.org/styles/liberty | head -1
HTTP/2 200 
$ gh auth status
github.com
  ✓ Logged in to github.com account christianrexwinkel-tomtom (keyring)
  - Active account: true
  - Git operations protocol: https
$ ls .pre-commit-config.yaml
ls: .pre-commit-config.yaml: No such file or directory
(no non-sample git hooks)
```

Result: ☑ all green

<!-- Chunk-workers append `### Chunk N: Tasks A–B` entries for Slice 3 below this line. -->

### Chunk 1: Tasks 26–34

- **Plan tasks covered:** Tasks 26–34 (Slice 3 acceptance tests, spot model, controller moving the spot / "My location" / map failure, map core, parked map view model and wording, Night and Day map styles, MapLibre wrapper, spot map on the parked screen, verify Slice 3 acceptance). Task 33 step 5 dev-server checks 1–4 were run here in the in-app browser pane, with geolocation stubbed in the page for the found-location checks, and all four passed. Task 34 steps 1–2 ran here. Steps 3–4 (post-merge Pages deployment check, manual device checks 1–11 incl. the G8-AC2 stopwatch) are **pending — owned by the user after merge**
- **Tests written:** test/acceptance/spot-map.test.ts (9, new; fails to load until Task 30, all green after it), src/services/location.test.ts (+5, 18 total), src/app.test.ts (+7, 17 total; the first test reads `blocked` right after the refused tap), src/ui/map-core.test.ts (7, new), src/ui/messages.test.ts (+7, 20 total), src/ui/format.test.ts (+1, 15 total), src/ui/spot-view.test.ts (8, new), src/ui/map-style.test.ts (5, new); test/fixtures/app-deps.ts gains `KLOKGEBOUW`. Suite: 197 → 246 tests, 18 → 22 files, matching the plan
- **Worker reported peak context:** ≈110k tokens
- **Worker status:** clear
- **Commit SHA(s):** f00b834 (Task 26), eb1c71e (Task 27), 30461b6 (Task 28), 231588d (Task 29), 6e1b266 (Task 30), 5b3f0f3 (Task 31), a2fe559 (Task 32), a57c825 (Task 32 fixes found in the Task 33 dev-server check), 7196ae4 (Task 33)
- **Deviations:** rows 2–5 in the Deviations from Plan table (acceptance-test setup timing, MapLibre import form, worker URL, gesture-only moves)
- **Open finding (not fixed, for the end-review / user):** `startMap` fails after 8 s with no `load`. MapLibre fires `load` only after it renders frames, so a tab that is in the background while the map starts (no animation frames) can time out. "Map couldn't load." then stays until a reload. This happened once in the browser pane during the `vite preview` check and did not happen again on later loads. The plan and the design have no retry here.

#### Verify output (verbatim)

```
$ npm test -- test/acceptance/spot-map.test.ts                 # Task 26, at f00b834
Error: Cannot find module '../../src/ui/spot-view.ts' imported from /Users/christianrexwinkel/Repo/plug-or-not/test/acceptance/spot-map.test.ts
 Test Files  1 failed (1)
      Tests  no tests
$ npm test -- test/acceptance/flows.test.ts test/acceptance/window-and-stay.test.ts src/app.test.ts   # Task 26 step 4
 Test Files  3 passed (3)
      Tests  32 passed (32)
$ npm test -- src/services/location.test.ts                    # Task 27 (red, then green)
      Tests  5 failed | 13 passed (18)
      Tests  18 passed (18)
$ npm test -- src/app.test.ts                                  # Task 28 step 2 (red)
      Tests  7 failed | 10 passed (17)
$ npm test -- src/app.test.ts test/acceptance/flows.test.ts test/acceptance/window-and-stay.test.ts   # Task 28 verify
 Test Files  3 passed (3)
      Tests  39 passed (39)
$ npm test -- src/ui/map-core.test.ts                          # Task 29 (red, then green)
Error: Cannot find module './map-core.ts' imported from /Users/christianrexwinkel/Repo/plug-or-not/src/ui/map-core.test.ts
 Test Files  1 failed (1)
 Test Files  1 passed (1)
      Tests  7 passed (7)
$ npm test -- src/ui/messages.test.ts src/ui/format.test.ts src/ui/spot-view.test.ts   # Task 30 (red, then green)
 Test Files  3 failed (3)
      Tests  9 failed | 26 passed (35)
 Test Files  3 passed (3)
      Tests  43 passed (43)
$ npm test -- test/acceptance/spot-map.test.ts                 # Task 30 verify
 Test Files  1 passed (1)
      Tests  9 passed (9)
$ npm run build && npm test                                    # Task 30 step 9, at 6e1b266
✓ built in 453ms
 Test Files  21 passed (21)
      Tests  241 passed (241)
$ npm test -- src/ui/map-style.test.ts; npm run build          # Task 31
 Test Files  1 passed (1)
      Tests  5 passed (5)
✓ built in 409ms
$ grep -rn "from 'maplibre-gl'" src/ test/                     # Task 32 step 3
src/ui/map.ts:3:import * as maplibregl from 'maplibre-gl';
$ npm run build && npm test                                    # Task 32 verify, at a2fe559
✓ built in 388ms
 Test Files  22 passed (22)
      Tests  246 passed (246)
$ npm run build && npm test                                    # Task 33 verify / Task 34 steps 1–2, at 7196ae4
 Test Files  22 passed (22)
      Tests  246 passed (246)
   Start at  09:38:13
   Duration  741ms (tests 44%, transform 26%, import 25%, worker 5%)
dist/assets/maplibre-gl-worker-v2kpBMIs.js                          509.44 kB
dist/assets/index-3hY0xTqg.js                                     1,060.22 kB │ gzip: 291.77 kB
✓ built in 525ms
(!) Some chunks are larger than 500 kB after minification. Consider:
```

Task 33 step 5 (dev server, `http://localhost:5173/plug-or-not/`, browser pane; seen after a57c825):
1. With geolocation stubbed to 51.4436, 5.5519 and "Try again" pressed: "Finding your location…" covered the map, then the map showed the streets around the spot, the blue pin, "Your location · 51.4436, 5.5519" and "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" in the bottom-right corner. ☑
2. Dragging the map turned the chip into "Moved spot · 51.4413, 5.5632" and "My location" appeared. "My location" jumped back to "Your location · 51.4436, 5.5519" and the button was hidden again. ☑
3. With location denied (the pane's default): the map showed the Netherlands, the grey pin, "No location yet" and the notice "We couldn't get your location. Allow location access in your browser and try again, or drag the map to your spot." with "Try again". ☑
4. With prefers-color-scheme emulated dark, then light, the map switched between the Night and Day colours without a reload, and the chip and pin stayed. ☑

Before a57c825, check 1 failed with `Error: Worker failed to load. Check that the worker URL is correct.` and "Map couldn't load.". Check 3 showed "No location yet · 52.0862, 5.2900": the coordinates came from the attach-time resize. Both are fixed in a57c825; see deviation rows 4 and 5. The `vite preview` production build was also checked after the fix: the map loaded, the attribution was spelled out, and there were no console errors.

### Chunk 2: End-Review round 1 fixes

- **Issues fixed:** 1, 2, 3, 4, 5, 6, 7, 8 (and the optional `themeFor`)
- **Tests added or changed:** src/ui/map-core.test.ts ("fails once on error … also after load" replaced by "fails once on error events before load, tile errors included", "after load, a tile error does not fail", "after load, a style error (no source or tile) still fails, once"; added "a load after the timeout recovers, once", "a load after an error does not recover, and a load in time reports no recovery"; new `isDriverMove` block, 4 tests); src/app.test.ts (+1: a map that loads late recovers via `reportMapRecovered`, keeps the browser position, allows moves again; the first test awaits `app.findChargers()` again, with `locate` mocked to a promise that hasn't answered, because a found location now answers the refused tap); src/ui/map-style.test.ts (+1, `themeFor`); src/ui/messages.test.ts (+1, `SPOT_MAP_LABEL`); test/acceptance/flows.test.ts and src/ui/spot-view.test.ts drop `approximate` from `LocationState.found` (issue 4: the field is removed, `spotOf` decides; the approximate-location flow now asserts `spotFor(...)`). Suite: 246 → 257 tests. Issues 3 and 7 (`src/ui/parked.ts`: "Moved spot" in the live drag listener; MapLibre via a cached dynamic `import('./map.ts')`, a failed import calling `reportMapFailure`) are DOM code with no DOM test dependency; checked by `tsc --noEmit`, the build and the browser pane
- **Build (issue 7):** entry chunk `index-*.js` 43.07 kB (was ≈1,060 kB); MapLibre is in the lazily loaded `map-*.js` (1,019 kB / 276 kB gz), which is the only chunk the 500 kB warning still names
- **Browser pane (dev server, location denied):** the parked map loaded (no "Map couldn't load.", no console errors), a real drag turned the chip into "Moved spot · 52.5182, 6.0330". The mid-drag chip and a late `load` after the 8 s timeout could not be forced in the pane (synthetic pointer events don't drive MapLibre's drag); both are covered by unit tests and left for the manual device pass
- **Worker reported peak context:** ≈75k tokens
- **Worker status:** clear
- **Commit SHA(s):** bc0ed95 (fixes); this log entry in the following docs commit
- **Deviations:** rows 6–7 in the Deviations from Plan table

#### Verify output (verbatim)

```
$ npm test
 Test Files  22 passed (22)
      Tests  257 passed (257)
   Start at  09:47:34
   Duration  790ms (tests 45%, transform 28%, import 24%, worker 3%)

$ npm run build
dist/assets/maplibre-gl-worker-v2kpBMIs.js                          509.44 kB
dist/assets/index-DYvrgcMw.css                                       20.25 kB │ gzip:   4.53 kB
dist/assets/map-B8-mEBLf.css                                         82.96 kB │ gzip:  10.72 kB
dist/assets/index-lnsROtTx.js                                        43.07 kB │ gzip:  16.40 kB
dist/assets/map-RXyRFVM2.js                                       1,019.22 kB │ gzip: 276.26 kB

✓ built in 622ms
[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

### Chunk 3: End-Review round 2 fixes

- **Issues fixed:** 1, 2, 3
- **Issue 1:** `startMap` drops `timedOut`; the `load` handler recovers after any failure (`if (failed) { failed = false; onRecover(); }`). Doc comments updated in `src/ui/map-core.ts` (`startMap`), `src/ui/map.ts` (`recovered`), `src/app.ts` (`mapFailed`, `reportMapRecovered`)
- **Issue 2:** new pure helper `liveMoveCentre(e, last, centre)` in `src/ui/map-core.ts` (calls `isDriverMove` with both centres); the `move` handler in `src/ui/map.ts` uses it, so a wheel or pinch zoom around the centre no longer flips the chip to "Moved spot"
- **Issue 3 (option chosen):** keep the rejected promise, no retry. `loadMap()` in `src/ui/parked.ts` caches `import('./map.ts')` as is; a failed import reports `reportMapFailure` once and stays failed until a reload. Simpler than a guarded `reportMapRecovered()` on a retried success, which would also need to tell a retry apart from the cached first success so it can't clear a real `startMap` failure
- **Tests added or changed:** src/ui/map-core.test.ts: "a load after an error does not recover, and a load in time reports no recovery" split into "a load after an error before load recovers, once (a tile lost during startup)" (flipped) and "a load in time reports no recovery"; new `liveMoveCentre` block, 3 tests (zoom-only gesture move with same centre and `originalEvent` is not a driver move; a centre change gives the new centre; jumps and event-less moves give nothing). Suite: 257 → 261 tests. Issue 3 is DOM code with no DOM test dependency; checked by `tsc --noEmit` and the build
- **Red run:** `npx vitest run src/ui/map-core.test.ts` before the code change: 4 failed | 15 passed (19)
- **Worker reported peak context:** ≈30k tokens
- **Worker status:** clear
- **Commit SHA(s):** 884de21 (fixes); this log entry in the following docs commit
- **Deviations:** rows 6–7 in the Deviations from Plan table updated (no new row)

#### Verify output (verbatim)

```
$ npm test
 Test Files  22 passed (22)
      Tests  261 passed (261)
   Start at  09:52:18
   Duration  822ms (tests 44%, transform 30%, import 22%, worker 4%)

$ npm run build
dist/assets/maplibre-gl-worker-v2kpBMIs.js                          509.44 kB
dist/assets/index-DYvrgcMw.css                                       20.25 kB │ gzip:   4.53 kB
dist/assets/map-B8-mEBLf.css                                         82.96 kB │ gzip:  10.72 kB
dist/assets/index-Dfjh81rR.js                                        43.09 kB │ gzip:  16.41 kB
dist/assets/map-BCMP55Sr.js                                       1,019.25 kB │ gzip: 276.27 kB

✓ built in 602ms
[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.

$ npx tsc --noEmit
(no output)
```

### End-Review (Slice 3)

Range reviewed: `79bd1d2..HEAD`. Opus reviewer, given no worker narrative and with the implementation log excluded.

- **Verdict:** CAP_REACHED — round-2 findings fixed, not re-reviewed
- **Issues found:**
  - Round 1 (ISSUES_FOUND):
    1. (Important) Any MapLibre `error` after `load`, including one lost tile, permanently set `mapFailed`, cleared `movedSpot` and could re-block "Find chargers".
    2. The 8 s `load` timeout was final, so on a slow network or a background tab "Map couldn't load." stuck until a reload.
    3. During a drag the chip kept "No location yet"/"Your location" with moving coordinates.
    4. `LocationState.found.approximate` was dead duplicate state.
    5. A stray edit in the first `src/app.test.ts` test.
    6. The map aria-label was a literal outside `messages.ts`.
    7. MapLibre sat in the entry chunk (≈1,060 kB).
    8. The drag-vs-programmatic move decision had no test.

    All fixed in Chunk 2 (bc0ed95, 5584a99).
  - Round 2 (ISSUES_FOUND), all fixed in Chunk 3 (884de21, 1b41c1d) and not re-reviewed:
    1. `src/ui/map-core.ts:62,67-71` (G6-AC9): one tile error before `load` permanently failed a map that then loaded, because recovery ran only after a timeout. Fixed: any `load` after any failure recovers. The test at `map-core.test.ts:91-97` is flipped.
    2. `src/ui/map.ts:81-85` (Important): the live `move` handler skipped the "a zoom is not a move" check, so a wheel or pinch zoom left the chip on "Moved spot". Fixed with the pure `liveMoveCentre` helper and 3 tests.
    3. `src/ui/parked.ts:63-71,128` (Minor): a retried dynamic map import never cleared `mapFailed`. Fixed by keeping the rejected import (no retry).
    4. Missing Deviations from Design row for ignoring tile/source errors after `load` (G6-AC9). Handled at the Slice 3 deviation gate.
- **Tests-vs-spec audit:** round 2 found strong, behaviour-level tests for G3-AC1, G3-AC2, G3-AC3, G3-AC4 and the parked part of G6-AC9. They go through the controller and `spotView`, with the design strings written out as literals. The only test that locked in a bug, `map-core.test.ts:91-97`, was flipped in Chunk 3. Remaining gaps, within D-17: the G7-AC6 `matchMedia` → `setStyle` switch, `setDraggable` on dragPan, `sharedMap` reuse (D-22), the live chip during a gesture, and a failed dynamic import counting as a map failure. These are checked by type check, build and the Task 34 manual device checks only.
- **Reviewer rounds:** 2
- **Cap outcome:** cap reached. The round-2 findings were fixed in 884de21 and not re-reviewed.

#### Final full verify output (verbatim)

Command: `npm test 2>&1 | tail -5; npm run build 2>&1 | tail -8`

```
 Test Files  22 passed (22)
      Tests  261 passed (261)
   Start at  09:53:01
   Duration  769ms (tests 41%, transform 31%, import 25%, worker 4%)

dist/assets/map-BCMP55Sr.js                                       1,019.25 kB │ gzip: 276.27 kB

✓ built in 543ms
[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

The warning is for the lazily loaded MapLibre chunk only. The entry chunk is ≈43 kB.

**Task 34 steps 3–4 (post-merge Pages deployment check, device checks 1–11, G8-AC2 stopwatch):** pending, owned by the user after merge.

---

## Slice 4: Results on a map

- **Started:** 2026-10-12 (session 4626c188-d2ad-43a5-8126-5a96dcf065de)
- **Base SHA:** b98b2df
- **Worker isolation:** normal
- **Completed:** 2026-10-12
- **Chunk layout:** one chunk, Tasks 35–41 (Slice 3 peaked at ≈110k over ~1,850 plan lines; Slice 4 is ~1,500 plan lines, inside one window)

### Pre-Flight (Slice 4)

```
$ node --version
v20.19.5
$ npm --version
11.14.0
$ npm test
 Test Files  22 passed (22)
      Tests  261 passed (261)
$ npm run build
✓ built in 534ms
(!) Some chunks are larger than 500 kB after minification. (lazily loaded MapLibre chunk, approved in Slice 3)
$ npm view maplibre-gl@6.11.2 version
6.11.2
$ curl -sSI https://tiles.openfreemap.org/styles/liberty | head -1
HTTP/2 200 
$ gh auth status
github.com
  ✓ Logged in to github.com account christianrexwinkel-tomtom (keyring)
  - Active account: true
  - Git operations protocol: https
$ ls .pre-commit-config.yaml
ls: .pre-commit-config.yaml: No such file or directory
(no non-sample git hooks)
```

Result: ☑ all green

<!-- Chunk-workers append `### Chunk N: Tasks A–B` entries for Slice 4 below this line. -->

### Chunk 1: Tasks 35–41

- **Plan tasks covered:** Tasks 35–41 (Slice 4 acceptance tests, controller `searchedSpot` and no spot moves off the parked screen, framing bounds and padding, results map view model and wording, MapLibre wrapper results mode and the shared map loader, results screen on the map, verify Slice 4 acceptance). Code follows the plan's listings as written. Task 40 step 5 dev-server checks 1–6 were run against `npm run dev` here (results below). Task 41 steps 1–2 ran here. Steps 3–4 (post-merge Pages deployment check, manual device checks 1–10 incl. the G8-AC2 stopwatch) are **pending — owned by the user after merge**
- **Tests written:** test/acceptance/results-map.test.ts (8, new; fails to load until Task 38, all green after it), src/app.test.ts (+2, 20 total), src/ui/map-core.test.ts (+4, 23 total), src/ui/messages.test.ts (+3), src/ui/results-map-view.test.ts (5, new); test/fixtures/app-deps.ts gains coordinates on `NEAREST` and the `NEAREST_MIXED` fixture. Suite: 261 → 283 tests, 22 → 24 files, matching the plan
- **Worker reported peak context:** ≈95k tokens
- **Worker status:** clear
- **Commit SHA(s):** 28592bc (Task 35), 8b2bb11 (Task 36), f2b66a0 (Task 37), a9a7f87 (Task 38), d05856a (Task 39), 891ddc3 (Task 40); this log entry in the following docs commit
- **Deviations:** none from the plan's code. The dev-server check ran in a headless Chromium (Playwright, SwiftShader WebGL) instead of the browser pane, because the pane was hidden: with no animation frames MapLibre never fires `load`, and the 8 s start watch showed "Map couldn't load." (the Slice 3 background-tab finding). That run did confirm the G6-AC9 results layout: "Map couldn't load." in the map area above the panel, the top bar, the panel and all 11 strip items in full
- **Open findings (not fixed, for the end-review / user):**
  1. **Check 6 fails (G6-AC9, pre-existing from Slice 3):** with every `tiles.openfreemap.org` request blocked, "Map couldn't load." never shows, on the parked map (polled 0–12 s) or on results; the results map shows the pins on an empty map, and the attribution is empty. The style object is local (`src/ui/map-style.ts`), so MapLibre still fires `load` with the TileJSON, sprite and glyphs failing; source/tile errors are ignored after `load`, and a `load` after an earlier error recovers (deviation rows 6–7). So a blocked or unreachable tile server isn't treated as "Map can't load". Task 41 device check 8 will hit this. Not a Slice 4 regression; needs a design decision (e.g. treat a failed TileJSON for the one vector source as a style failure)
  2. **Pins overlap in a dense area:** at Parkstraat Nuenen the 10 real pins cluster in two groups; several labelled pins overlap and one ("−€0.0…") is partly hidden behind its neighbour, so a scripted tap on pin #2 was intercepted by pin #7. The plan has no collision handling. Relevant to device check 3 ("every pin can be tapped without opening a neighbour")

#### Verify output (verbatim)

```
$ npm test -- test/acceptance/results-map.test.ts                 # Task 35, at 28592bc
Error: Cannot find module '../../src/ui/results-map-view.ts' imported from /Users/christianrexwinkel/Repo/plug-or-not/test/acceptance/results-map.test.ts
 Test Files  1 failed (1)
      Tests  no tests
$ npm test -- --exclude test/acceptance/results-map.test.ts      # Task 35 step 4
 Test Files  22 passed (22)
      Tests  261 passed (261)
$ npm test -- src/app.test.ts                                     # Task 36 step 2 (red)
      Tests  2 failed | 18 passed (20)
$ npm test -- src/app.test.ts test/acceptance/flows.test.ts test/acceptance/window-and-stay.test.ts test/acceptance/spot-map.test.ts   # Task 36 verify
 Test Files  4 passed (4)
      Tests  51 passed (51)
$ npm test -- src/ui/map-core.test.ts                             # Task 37 (red, then green)
      Tests  4 failed | 19 passed (23)
 Test Files  1 passed (1)
      Tests  23 passed (23)
$ npm test -- src/ui/messages.test.ts src/ui/results-map-view.test.ts   # Task 38 step 3 (red)
Error: Cannot find module './results-map-view.ts' imported from /Users/christianrexwinkel/Repo/plug-or-not/src/ui/results-map-view.test.ts
 Test Files  2 failed (2)
      Tests  3 failed | 21 passed (24)
$ npm test -- src/ui/messages.test.ts src/ui/results-map-view.test.ts src/ui/entry-view.test.ts   # Task 38 step 7
 Test Files  3 passed (3)
      Tests  35 passed (35)
$ npm test -- test/acceptance/results-map.test.ts                 # Task 38 step 8
 Test Files  1 passed (1)
      Tests  8 passed (8)
$ npm run build && npm test                                       # Task 38 step 9
✓ built in 541ms
 Test Files  24 passed (24)
      Tests  283 passed (283)
$ npm test -- test/acceptance/results-map.test.ts src/ui/results-map-view.test.ts src/ui/messages.test.ts   # Task 38 verify
 Test Files  3 passed (3)
      Tests  37 passed (37)
$ grep -rn "from 'maplibre-gl'" src/ test/                        # Task 39 step 4
src/ui/map.ts:4:import * as maplibregl from 'maplibre-gl';
$ npm run build && npm test                                       # Task 39 verify, at d05856a
✓ built in 533ms
 Test Files  24 passed (24)
      Tests  283 passed (283)
$ npm test; npm run build; npx tsc --noEmit                       # Task 40 verify / Task 41 steps 1–2, at 891ddc3
 Test Files  24 passed (24)
      Tests  283 passed (283)
   Start at  10:49:28
   Duration  977ms (tests 42%, transform 28%, import 27%, worker 4%)
dist/assets/maplibre-gl-worker-v2kpBMIs.js                          509.44 kB
dist/assets/index-CuyxfeAx.css                                       22.48 kB │ gzip:   4.95 kB
dist/assets/map-B8-mEBLf.css                                         82.96 kB │ gzip:  10.72 kB
dist/assets/index-Di6xjIPT.js                                        46.38 kB │ gzip:  17.53 kB
dist/assets/map-BdeO5bhc.js                                       1,032.86 kB │ gzip: 280.20 kB

✓ built in 594ms
[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
(tsc: no output)
```

Task 40 step 5 (dev server `http://localhost:5173/plug-or-not/`, headless Chromium 390×780, geolocation 51.4436, 5.5519 ±20 m, PRD Story 1 settings, battery 20%, stay 45 min; seen at 891ddc3):
1. The map fills the screen behind the top bar and the panel. Blue dot at the spot, 10 pins (green ✓ "€0.39"…, red "−€0.05"…, one "−€0.10 ×2", one grey dashed "?" with no amount). Every pin lies between the top bar's bottom (113 px) and the panel's top (497 px). Spot line "YOUR LOCATION · 51.4436, 5.5519" with "Change spot". The compact attribution (`maplibregl-compact`) sits at 463–487 px, just above the panel. Panel "#1 of 11 · best saving first". ☑ (pins overlap each other in places; open finding 2)
2. Tapping pin #3 (Nuenenseweg 68) opened "#3 of 11", outlined and scaled that pin, and marked the same strip item. Tapping strip item 5 moved the outline to the Grote Heiakker 2 pin. ☑
3. Releasing the results slider at 15 min re-labelled every pin (e.g. "€0.39" → "−€0.46"), the selected entry stayed the same id, and the blue dot's marker transform was unchanged (no reframe). ☑
4. After panning the results map and "Change spot": the parked map was back on the spot with "Your location · 51.4436, 5.5519". Dragging the parked map, then "Find chargers": the results read "MOVED SPOT · 51.4445, 5.5542". ☑
5. Emulating `prefers-color-scheme` light after dark switched the page and the map from Night to Day without a reload; all 10 pins stayed. ☑
6. With `tiles.openfreemap.org` blocked and the page reloaded: **no** "Map couldn't load."; the search showed the 10 pins on an empty map and the panel and strip complete. ☒ — pre-existing Slice 3 behaviour, open finding 1. The failure layout itself was seen in the hidden browser pane (map timed out): "Map couldn't load." centred above the panel, no pins, panel and all 11 strip items in full.

Privacy: the only host outside `localhost:5173` requested during checks 1–5 was `tiles.openfreemap.org`.

### Chunk 2: End-Review round 1 fixes

- **Issues covered:** 1 (blocking, G6-AC9 / D-29: a blocked tile server recovered on the late `load`), 2 (`frameKey` doc comment), 3 (recovery test claimed a reframe it didn't check), 4 (D-22: `loadSharedMap` unit tests)
- **Tests written:** src/ui/map-core.test.ts (the stub-shaped "a load after an error before load recovers" replaced by 5: a source/tile error then `load` (plus metadata/style `data`, past the timeout) stays failed with no `onRecover`; error, `load`, tile `data` recovers once; error, tile `data`, `load` recovers once at `load`; timeout, tile error, `load` needs a loaded tile too; a style error after `load` is not recovered by tile `data`. The fake map gains `data`. The existing "a load after the timeout recovers, once" is kept; 23 → 27 in the file, net +4); src/ui/map-loader.test.ts (2, new: two calls give the same handle from one import, bound to the app; a failed import reports one failure and isn't retried. Uses `vi.resetModules` + `vi.doMock('./map.ts')`; both tests were seen failing against a loader that resets or re-imports). test/acceptance/results-map.test.ts: name and comment only. Suite: 283 → 289 tests, 24 → 25 files
- **Change (issue 1):** `startMap` also listens to `data`. A failure before `load` stays recoverable; `load` alone recovers it unless a tile or source error came before `load`, in which case a `data` event with `dataType: 'source'` and a `tile` (before or after `load`) is also needed. A failure after `load` never recovers. No change in `src/ui/map.ts`: it passes the `maplibregl.Map` itself to `startMap`. Deviation row 8
- **Blocked-tiles dev check (headless Chromium 1217 via Playwright, SwiftShader, 390×780, geolocation 51.4436, 5.5519 ±20 m, Story 1 settings, battery 20%):** with `tiles.openfreemap.org` aborted, "Map couldn't load." shows on the parked map from the 3 s poll through 12 s, and on results right after "Find chargers" and 6 s later, with 0 pins and the panel in full. ☑ Unblocked: no message on the parked map (0–12 s), results show the map with 10 pins and the OpenFreeMap attribution. ☑ Hosts requested: `localhost:5173`, `tiles.openfreemap.org`. Closes Chunk 1 open finding 1 / check 6
- **Worker reported peak context:** ≈75k tokens
- **Worker status:** clear
- **Commit SHA(s):** 9156d48 (fixes); this log entry in the following docs commit
- **Deviations:** row 8 in the Deviations from Plan table

#### Verify output (verbatim)

```
$ npm test
 Test Files  25 passed (25)
      Tests  289 passed (289)
   Start at  11:01:31
   Duration  1.12s (tests 45%, transform 26%, import 25%, worker 4%)

$ npm run build
dist/assets/index-CuyxfeAx.css                                       22.48 kB │ gzip:   4.95 kB
dist/assets/map-B8-mEBLf.css                                         82.96 kB │ gzip:  10.72 kB
dist/assets/index-DQrlMfdJ.js                                        46.54 kB │ gzip:  17.59 kB
dist/assets/map-m67kxXKT.js                                       1,032.86 kB │ gzip: 280.20 kB

✓ built in 632ms
[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

### Chunk 3: End-Review round 2 fixes

- **Issue covered:** 1 (Important, G6-AC9: `startMap`'s `data` listener ignored a tile that loaded before the first startup tile/source error. In MapLibre's real order (good tiles finish, then one bad tile errors, then `load`; no new tile `data` after `load` until the camera moves, and a failed map isn't draggable), "Map couldn't load." stayed for good on a map whose tiles mostly loaded)
- **Tests written:** src/ui/map-core.test.ts (1, new: tile `data`, then a tile `error` (fails once), then `load` recovers once; a second `load` and more tile `data` don't recover again. Seen failing on the old code: `onRecover` 0 calls at `load`). The blocked-server test (error, `load`, no tile `data` stays failed) is kept unchanged. 27 → 28 in the file; suite 289 → 290
- **Change:** the `data` listener records every loaded tile (`if (!isTileData(e)) return; tileLoaded = true; maybeRecover();`), no longer only after a source error. Recovery rules otherwise unchanged; doc comment updated. Optional startup-flash change (decide source-error failures at `load`) not taken. Deviation row 8
- **Worker reported peak context:** ≈70k tokens
- **Worker status:** clear
- **Commit SHA(s):** ebf26bf (fix); this log entry in the following docs commit
- **Deviations:** row 8 in the Deviations from Plan table (description updated)

#### Verify output (verbatim)

```
$ npm test
 Test Files  25 passed (25)
      Tests  290 passed (290)
   Start at  11:07:20
   Duration  1.07s (tests 44%, transform 27%, import 26%, worker 4%)

$ npm run build
dist/assets/map-B8-mEBLf.css                                         82.96 kB │ gzip:  10.72 kB
dist/assets/index-DcWVlWno.js                                        46.54 kB │ gzip:  17.59 kB
dist/assets/map-BjQkpDPz.js                                       1,032.86 kB │ gzip: 280.20 kB

✓ built in 565ms
[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

### End-Review (Slice 4)

Range reviewed: `b98b2df..HEAD`. Opus reviewer, given no worker narrative and with the implementation log excluded.

- **Verdict:** CAP_REACHED — round-2 findings fixed, not re-reviewed
- **Issues found:**
  - Round 1 (ISSUES_FOUND), all fixed in Chunk 2 (9156d48, e111dbc):
    1. (Misunderstanding, G6-AC9 / D-29) `src/ui/map-core.ts:61-73`: with OpenFreeMap unreachable, MapLibre fires `error{sourceId}` before `load` and then still fires `load`, because an errored source counts as loaded. The late `load` cleared `mapFailed`, so "Map couldn't load." flashed and disappeared, and results showed pins on a blank background. `map-core.test.ts:91` locked this in with the stub's order.
    2. (Minor) The `frameKey` doc comment in `src/ui/results-map-view.ts:45-46` claimed it changes only with a new search.
    3. (Test shaped around code) `test/acceptance/results-map.test.ts:116` said "framed again" but asserted `frameKey` unchanged.
    4. (Coverage, D-22) `loadSharedMap` had no test. `src/ui/map-loader.test.ts` was added.
    - Accepted, no action: marker DOM rebuilt on each update (churn only). The design's "pins on a plain background when only the tiles fail" contradicts G6-AC9's "without pins". The code follows G6-AC9 (no pins).
  - Round 2 (ISSUES_FOUND), fixed in Chunk 3 (ebf26bf, 40edaf2) and not re-reviewed:
    1. (Important, G6-AC9) `src/ui/map-core.ts:96-100`: the `data` listener ignored tiles that loaded before the first startup tile error. In MapLibre's real order (good tiles first, one bad tile errors, then `load`; no further tile `data` until the camera moves), one lost tile left "Map couldn't load." up for good. Fixed: every loaded tile is recorded. New test: tile `data` → tile `error` → `load` recovers once. The blocked-server test is unchanged.
    - Accepted, no action: a selected "Price unknown" pin loses its dashed outline (`app.css:122-123`); the panel height is measured on every update.
- **Tests-vs-spec audit:** round 2 found that the pins (label, tone, icon, order, "×N", the icon-only unknown pin, "<€0.01"), the framing bounds, the D-30 selection kept after a stay change, G6-AC9 on results, the parked-only spot moves and the map loader are all pinned by tests that check the specified behaviour. The `startMap` tests had followed the code rather than MapLibre's event order. The missing order was added in Chunk 3. The remaining gaps are within D-17: the padding wiring to the measured top bar and panel, the "Change spot" button action, the pin click wiring, the G7-AC6 theme swap and the compact attribution. The Task 41 manual device checks cover these.
- **Reviewer rounds:** 2
- **Cap outcome:** cap reached. The round-2 finding was fixed in ebf26bf and not re-reviewed.

#### Final full verify output (verbatim)

Command: `npm test 2>&1 | tail -8; npm run build 2>&1 | tail -8`

```
 Test Files  25 passed (25)
      Tests  290 passed (290)
   Start at  11:08:17
   Duration  886ms (tests 47%, transform 25%, import 24%, worker 3%)

dist/assets/map-BjQkpDPz.js                                       1,032.86 kB │ gzip: 280.20 kB

✓ built in 557ms
[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

The warning is for the lazily loaded MapLibre chunk only, as approved for Slice 3. The plan expected 283 tests. The 7 extra come from the review fixes: map-core +5 net, map-loader +2.

**Task 41 steps 3–4 (post-merge Pages deployment check, device checks 1–10, G8-AC2 stopwatch):** pending, owned by the user after merge.

---

### Chunk 4: Whole-branch review round 1 fixes

- **Issues covered:** whole-branch self-review round 1, issues 1, 2, 3, 4 and 7 (issues 5–6 left alone as briefed: the design-doc contradiction on pins when tiles fail, and the approved chunk-size warning).
  1. (Important, G6-AC8) `src/ui/results.ts` `applyMap` framed once per `frameKey` with the panel height measured on the first update, so selecting a taller entry raised the sheet over the pins. Now the bottom padding is `framingPanelPx(measured, layer height)` = the larger of the measured panel and `SHEET_MAX_FRACTION` (0.66, `.sheet`'s `max-height: 66%`, comment added in `app.css` to keep the two in step) of the map height. A stay change or a selection still never reframes. On a short map `framePadding` still shrinks both paddings to leave `FRAME_MIN_PX`, so there the tallest possible panel can reach the edge of the framed area.
  2. (Minor) Back on the parked view, the fresh updater had `applied = null`, so `centreOn` overwrote the camera `showSpot()` had restored (the driver's zoom on an unmoved browser spot). The centre memory is now a module-level `createCentreTracker()` (`src/ui/map-core.ts`) shared by every parked visit, like the one map it describes. An unchanged spot keeps the camera; a new spot (a location found later, "My location" after a drag) still centres.
  3. (Minor) The results stay slider was rebuilt on every update, so an async update (`reportMapFailure`/`reportMapRecovered`) cancelled a drag. The top bar's row (Battery, stay slider, Settings) is now built once per visit; updates sync the slider's value and labels (skipped while dragging, like `slider()` in `parked.ts`), the Battery text and label, and replace only the spot line and the notice after the row. The slider keeps its focus without the old id-based restore (the `rstay` id is gone).
  4. (Minor) `findChargers` from the results load-error "Try again" re-derived the spot; after a map failure (clears `movedSpot`) with location denied it was `none` and set `blocked: 'location'`, shown only on the parked view. On the results view it now falls back to `searchedSpot` when `spotFor(state)` is none.
  7. (Minor) `src/main.ts` re-ran `renderLoading` on every `set()` while loading, re-creating the `role="status"` live region. It now renders only on entering the loading view.
- **Tests written:** `src/ui/map-core.test.ts` (+5: `framingPanelPx` ×2, `createCentreTracker` ×3; seen failing before the helpers existed); `src/app.test.ts` (+1: denied location, moved spot, load error, map failure, "Try again" searches at the searched spot; seen failing on the old code with `search: 'load-error'`). Issues 3 and 7 are DOM-only (D-17) and were checked in the browser only.
- **Browser check:** `vite preview` (`http://localhost:4173/plug-or-not/`), headless Chromium 1217 via Playwright, SwiftShader, 390×780, geolocation 51.4436, 5.5519, Story 1 settings, battery 20%:
  1. Selecting each of the 11 strip items in turn (panel 232–329 px high, incl. the entry with the reason line): every one of the 10 pins stayed between the top bar and the panel; the smallest gap between the lowest pin and the panel's top was 201 px. ☑
  2. Accuracy 1500 m (so the accuracy circle shows, sized by zoom): circle 180 px, one wheel zoom without a drag 199.9 px, "Find chargers", then "Change spot": 199.9 px (the zoom stayed). On the old `parked.ts` the same run went back to 180 px. ☑
  3. The results slider: two ArrowRight presses 90 → 120 min ("2h"), the same element and still focused; the same element after a selection update; a mouse drag with a pin selection (an update) mid-drag kept the element and the drag, which ended at "16h45". ☑
  - Hosts requested: `localhost:4173`, `tiles.openfreemap.org`.
- **Worker reported peak context:** ≈80k tokens
- **Worker status:** clear
- **Commit SHA(s):** 50e6938 (fix); this log entry in the following docs commit
- **Deviations:** row 9 in the Deviations from Plan table (issue 1)

#### Verify output (verbatim)

```
$ npm test
 Test Files  25 passed (25)
      Tests  296 passed (296)

$ npm run build
dist/assets/maplibre-gl-worker-v2kpBMIs.js                          509.44 kB
dist/assets/index-CuyxfeAx.css                                       22.48 kB │ gzip:   4.95 kB
dist/assets/map-B8-mEBLf.css                                         82.96 kB │ gzip:  10.72 kB
dist/assets/index-DA-s9Eij.js                                        46.88 kB │ gzip:  17.75 kB
dist/assets/map-BYN3tjSV.js                                       1,032.86 kB │ gzip: 280.20 kB

✓ built in 538ms
[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

---

### Chunk 5: Whole-branch review round 2 fixes

- **Issues covered:** whole-branch review round 2, issues 1–4 (final fix round, not re-reviewed).
  1. (Important, G6-AC8) Framing for `SHEET_MAX_FRACTION · H` made `framePadding` take its shrink branch on any map under ~871 px, so on phones the pins were squeezed into the `FRAME_MIN_PX` band and the map zoomed far out. `applyMap` now, only when it reframes (`v.frameKey !== framed`), builds each entry's panel off-screen in the panel's place (`position:absolute;visibility:hidden;inset:auto 0 0 0` in `.rlayer`, same width and `max-height`), `aria-hidden` and `inert`, reads `offsetHeight` and removes it at once; `framingPanelPx(measured, tallest, H)` = `max(measured, min(tallest, SHEET_MAX_FRACTION · H))`. A stay change or a selection still never reframes.
  2. (Important, G6-AC9) `findChargers`: on the results view "Try again" always searches at `searchedSpot` when it exists (`state.view === 'results' && state.searchedSpot ? state.searchedSpot : spotFor(state)`), so a map failure that cleared `movedSpot` no longer falls back to the browser position.
  3. (Minor) The results stay slider also clears `dragging` on `pointerup`, `pointercancel` and `blur`: a drag ending on its start value fires no `change`, which left `sync` off for the visit.
  4. (Minor) The spot line ("Change spot") and the approximate notice (`role="status"`) are built once in the top bar and patched in place (`textContent`, `hidden`); `replaceAfter` is now used only for the panel or message.
- **Tests written:** `src/ui/map-core.test.ts` (`framingPanelPx` rewritten for the 3-argument rule: tallest wins, capped at the CSS limit, never below measured, plus a 390×780 case leaving more than `FRAME_MIN_PX`; the first two seen failing on the old helper); `src/app.test.ts` (+1: found location, moved spot, load error, map failure, "Try again" → `findNearest` last called with the moved coordinates; seen failing on the old code). The existing denied-location test kept. Issues 3 and 4 are DOM-only (D-17), checked in the browser.
- **Browser check:** `vite preview` (`http://localhost:4173/plug-or-not/`), headless Chromium 1217 via Playwright, SwiftShader, 390×780, geolocation 51.4436, 5.5519 (accuracy 20 m; repeated at 1500 m for the approximate notice), Story 1 settings, battery 20%:
  1. Selecting each of the 11 strip items (panel 232–329 px; tallest 329 px): all 10 pins between the top bar (bottom 113 px) and the panel (top 451–548 px) for every selection; pins span y 144–420, a vertical spread of 271 px of the 384 px between the top bar and the panel at the default selection (Chunk 4 left the lowest pin 201 px above the panel). Smallest gaps: 34 px to the panel, 31 px to the top bar. One `.sheet` in the DOM after each update (the probes are removed). At 1500 m (notice shown, taller top bar): spread 206 px of 318 px, gaps 34/31 px. ☑
  2. Covered by the Vitest case (no browser path to a load error). ☑
  3. Click on the track (stay 345), press there, drag to 1440, back to 345, release: 0 `change` events; then a stale value written into the input and a pin selection (an update): the slider shows 345 again. With the `pointerup`/`blur` listeners disabled the same run left 600 (sync skipped). ☑
  4. Focus "Change spot", Shift+Tab ×2 to the slider, ArrowRight (345 → 360, an update), Tab ×2: focus on the same "Change spot" element; still focused after a further update (a pin selection); the notice element is the same node across the stay change (shown at 1500 m, built and hidden at 20 m). ☑
  - Hosts requested: `localhost:4173`, `tiles.openfreemap.org`.
- **Worker reported peak context:** ≈95k tokens
- **Worker status:** clear
- **Commit SHA(s):** 54f614c (fix); this log entry in the following docs commit
- **Deviations:** row 9 in the Deviations from Plan table updated to the final framing rule (issue 1)

#### Verify output (verbatim)

```
$ npm test
 Test Files  25 passed (25)
      Tests  299 passed (299)

$ npm run build
dist/assets/maplibre-gl-worker-v2kpBMIs.js                          509.44 kB
dist/assets/index-CuyxfeAx.css                                       22.48 kB │ gzip:   4.95 kB
dist/assets/map-B8-mEBLf.css                                         82.96 kB │ gzip:  10.72 kB
dist/assets/index-DAbHPtKd.js                                        47.34 kB │ gzip:  17.92 kB
dist/assets/map-BvEGz5eP.js                                       1,032.86 kB │ gzip: 280.20 kB

✓ built in 515ms
[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

---

### Whole-branch self-review (end of feature)

Run by the `requesting-code-review` skill after the last slice. `main` already holds Slices 1–3, so the reviewer was pointed at the whole app at HEAD and the seams between slices. Opus reviewer, with the implementation log excluded.

- **Verdict:** CAP_REACHED — round-2 findings fixed, not re-reviewed
- **Round 1 (with fixes):** no Critical issues.
  - Fixed in Chunk 4 (50e6938, e2afffd):
    - 1 (Important): framing used the first panel height, so a taller entry hid pins.
    - 2: the zoom was lost on return to the parked view.
    - 3: the results slider was rebuilt on async updates.
    - 4: "Try again" could do nothing after a map failure with location denied.
    - 7: the loading view re-rendered on every change.
  - Left for the user:
    - 5: the design text contradicts itself on pins when only the tiles fail. D-29 and solution-design.md:191 say pins stay; G6-AC9 says "without pins", and the code follows G6-AC9.
    - 6: the chunk-size warning, already approved.
- **Round 2 (with fixes):** fixed in Chunk 5 (54f614c, 321b846), not re-reviewed:
  1. (Important) `src/ui/map-core.ts:206` `framingPanelPx`: padding for the 66% CSS cap squeezed the pins into the 80 px `FRAME_MIN_PX` band on phones. It now pads for the tallest panel any entry renders, measured off-screen and capped by the CSS limit. At 390×780 the pins span 271 of the 384 px left free.
  2. (Important) `src/app.ts:260-261`: "Try again" on results now always searches at `searchedSpot`.
  3. (Minor) The stay slider clears `dragging` on `pointerup`, `pointercancel` and `blur`.
  4. (Minor) The spot line and the approximate notice are built once and patched in place.
  - Accepted, no action: no DOM tests for the results-view wiring (D-17); `v.centre` is checked twice in `parked.ts:103`.
- **Reviewer rounds:** 2

#### Final verify (verbatim)

```
 Test Files  25 passed (25)
      Tests  299 passed (299)
✓ built in 599ms
```

---


## Deviations from Plan

| #   | Task/Chunk | Type (change/gap) | Description | Plan updated? | Status | Date |
| --- | ---------- | ----------------- | ----------- | ------------- | ------ | ---- |
| 1   | Task 14 / Chunk 4 | change | Slice 1: build drops locations outside a NL-and-neighbours bounding box (`DATA_BOUNDS`, lat 50.0–54.0, lon 2.5–7.5, edges kept) in `scripts/build-data.ts`, so bogus feed coordinates (0,0, swapped, Asia/US) no longer reach the snapshot or stretch the `coversAll` bounds. Snapshot: 580 tiles, 72516 locations | yes — plan §Task 14 edited 2026-10-12 | approved | 2026-10-12 |
| 2   | Task 26 / Chunk 1 | change | Slice 3: the first acceptance test ("location still being found") sets the app up inline instead of through the async `opened()` helper. Awaiting that helper gives the stub's `locate()` enough microtask ticks to answer, so the "still locating" assertions saw a found location whatever the implementation did. The other tests and the helper are as planned | yes — plan §Task 26 edited 2026-10-12 | approved | 2026-10-12 |
| 3   | Task 32 / Chunk 1 | change | Slice 3: `src/ui/map.ts` uses `import * as maplibregl from 'maplibre-gl'`, because maplibre-gl 6.11.2 is ESM-only with no default export (TS1192). `last` is typed `{ lat: number; lon: number }`, because `NL_CENTRE` is `as const`. The Task 32 grep still finds exactly one import, at `src/ui/map.ts:3` | yes — plan §Task 32 edited 2026-10-12 | approved | 2026-10-12 |
| 4   | Task 32 / Chunk 1 | change | Slice 3: with the plan's wrapper the map never loads, in dev or build ("Worker failed to load"). MapLibre 6 looks for `maplibre-gl-worker.mjs` next to its own module file, and Vite doesn't put it there. The wrapper now imports `maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url` and calls `maplibregl.setWorkerUrl()`. The build emits `assets/maplibre-gl-worker-*.js` (≈509 kB) | yes — plan §Task 32 edited 2026-10-12 | approved | 2026-10-12 |
| 5   | Task 32 / Chunk 1 | change | Slice 3: in the plan's wrapper, MapLibre's own moves (the resize on `attachTo`, window resizes) set the coordinates chip, which then read "No location yet · 52.0862, 5.2900", and a `moveend` after locating could report a resize as a moved spot. The `move` and `moveend` handlers now act only on events that carry `originalEvent`, i.e. gestures, inertia included | yes — plan §Task 32 edited 2026-10-12 | approved | 2026-10-12 |
| 6   | Task 29 / Chunks 2–3 | change | Slice 3: `startMap` no longer fails on every `error`. Before `load` any error fails (until a `load` recovers it, row 7); after `load`, an error carrying `sourceId` or `tile` (one tile lost on flaky mobile data) is ignored, and other errors (the style) still fail. The plan's Task 29 test "fails on error … also after load" is replaced accordingly (End-Review round 1, issue 1) | yes — plan §Task 29 edited 2026-10-12 | approved | 2026-10-12 |
| 7   | Task 29 / Chunks 2–3 | change | Slice 3: the fixed 8 s timeout is no longer final, and neither is an error before `load`. Any `load` after any failure (the timeout, or a tile error during startup) calls a new `onRecover`, once; the wrapper reports `recovered()` and the controller's new `reportMapRecovered()` clears `mapFailed`, keeping the browser position as the spot. A style that can't load never fires `load`, so that failure stays (End-Review round 1, issue 2; round 2, issue 1) | yes — plan §Task 29 edited 2026-10-12 | approved | 2026-10-12 |
| 8   | Task 29 / Slice 4 Chunk 2 | change | Slice 4: changes row 7 ("any `load` after any failure recovers"). MapLibre counts an errored source as loaded, so with the tile server unreachable `load` still fires after the tile errors, and row 7 cleared "Map couldn't load." (G6-AC9 / D-29). Now `startMap` also listens to `data`: a failure before `load` recovers, once, at `load` only if no tile or source error came before `load` (the timeout: slow network, background tab); after such an error it also needs a tile that loaded at any point (`data` with `dataType: 'source'` and a `tile`, before or after the error and before or after `load`; every loaded tile is recorded, since MapLibre usually finishes the good tiles before one bad tile errors), so one tile lost during startup still recovers and a blocked tile server, which never delivers a tile, stays failed. A failure after `load` (the style) never recovers, tile data included. Post-`load` tile/source errors are still ignored (row 6) (Slice 4 End-Review round 1, issue 1; round 2, issue 1) | yes — plan §Task 29 edited 2026-10-12 | approved | 2026-10-12 |
| 9   | Task 40 / Slice 4 Chunk 4 | change | Slice 4: the results map frames for the tallest details panel any entry renders, measured off-screen when it reframes and capped at the panel's CSS limit: bottom padding = `max(measured, min(tallest, SHEET_MAX_FRACTION · H))` (`SHEET_MAX_FRACTION` = 0.66, `.sheet` `max-height: 66%`), not the panel height measured at the first update. Selecting a taller entry (a "Never worth it" reason line) never hides pins under the panel, and a phone map isn't padded for a panel no entry fills. A stay change or a selection still never reframes (whole-branch review rounds 1 and 2, issue 1) | yes — plan §Task 40 edited 2026-10-12 | approved | 2026-10-12 |

Slice 2: None. The user confirmed there were no deviations on 2026-10-12.

Slice 3: rows 2–7 approved by the user on 2026-10-12. Rows 4 and 5 were converted from gap to change, since both gaps were closed in code. A G6-AC9 row was also added to the plan's Deviations from Design and signed off. The user chose to leave the Vite chunk-size warning for the lazily loaded MapLibre chunk as is.

Slice 4: rows 8 and 9 approved by the user on 2026-10-12. Pins on a failed map stay hidden, following G6-AC9 ("without pins") over D-29's "pins on a plain background". The user will check the overlap of dense pins (device check 3) after merge.

<!-- If there are no deviations, write "None." below the table and confirm verbally with the user. -->

<!-- ============================================================ ## Slice N
     SLICES-MODE IMPLEMENTATION LOG STRUCTURE (commented reference)
     ============================================================
     When the plan being executed is slice-aware (the implement skill
     detected `^## Slice [0-9]` headers in plan.md), chunk entries are
     grouped under per-slice headers. Chunking happens INSIDE a slice's
     session over that slice's tasks, and the End-Review runs over that
     slice's diff (change-design Behavior 5). The per-chunk entry format
     (Plan tasks covered / Tests written / peak / SHAs / Verify output)
     is unchanged — only an extra grouping level is added.

     The Deviations from Plan table is shared across slices. When a row is
     slice-scoped, the slice ID is prefixed in the Description cell
     (e.g. `Slice 2: oversized — split into 2a/2b`).

     ----- Example shape -----

     ## Slice 1: <slice 1 name>

     ### Chunk 1: Tasks 1–3
     - Plan tasks covered: …
     - Verify output (verbatim): …

     ### End-Review (Slice 1)
     - Verdict: APPROVED
     - Tests-vs-spec audit: …

     ## Slice 2: <slice 2 name>
     ### Chunk 1: Tasks 4–6
     …
     ### End-Review (Slice 2)
     …

     ## Deviations from Plan
     (Shared across all slices. Slice ID prefixed in Description cell when
     slice-scoped, e.g. `Slice 2: …`.)
     ============================================================ -->
