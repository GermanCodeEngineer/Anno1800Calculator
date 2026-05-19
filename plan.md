# Anno 1800 Calculator - Fast Vue Transition Plan

Date: 2026-05-19

## Goal
- Move to Vue with the least risk and shortest path.
- Keep current business logic as-is at first.
- Replace UI in small slices instead of full rewrite.

## Core Principle
- Do not rewrite all logic into Vue reactivity.
- Keep Island/Factory/Product classes mostly plain.
- Build a Vue UI layer that reads from existing logic.

## Estimated Time (part-time, beginner)
- Quick path: 3-5 weeks
- Safer path: 5-7 weeks

## Phase 1 - Baseline and Freeze (Step 1) [In Progress]
- Create manual smoke checklist.
- Verify current behavior once and record it.
- Pause feature work during migration.

### Step 1 Checklist and Log
Date started: 2026-05-19
Owner: liasr

#### How to run locally
1. npm install
2. npm run serve
3. Open the local URL in browser

#### Smoke Checklist (mark PASS/FAIL)
- [x] App opens and main screen renders (PASS)
- [x] Can create a new island (PASS)
- [x] Population changes update production numbers (PASS)
- [x] Factory tile values react to input changes (PASS)
- [x] Export config works (PASS)
- [x] Import config works (PASS)
- [x] Trade routes can be opened and edited (PASS)
- [x] DLC toggles affect available content (PASS)
- [x] Settings dialog opens and saves expected values (open verified)
- [ ] No console errors during normal usage (FAIL)

#### Baseline Log
- 2026-05-19: Checklist created.
- 2026-05-19: Local serve verified with npm run serve.
- 2026-05-19: Startup URL observed: http://localhost:51533 (dynamic port).
- 2026-05-19: Automated smoke check loaded successfully at http://localhost:4173.
- 2026-05-19: Browser warning seen: input parsed inside select (HTML structure issue to fix later).
- 2026-05-19: Settings dialog opened successfully from toolbar.
- 2026-05-19: Console shows repeated ERR_CONNECTION_REFUSED to localhost:8000/AnnoServer/Population when helper server is not running.
- 2026-05-19: Island management opens, but adding island is blocked (new island button remains disabled after entering a name).
- 2026-05-19: Runtime check confirmed population/factory reactivity: Farmers step-up produced residents=1,100 and factoriesWithBuildings>0.
- 2026-05-19: Help dialog opens from toolbar; trade route management could not be validated without a non-All-Islands entry.
- 2026-05-19: Fixed invalid HTML in templates/island-management-dialog.html (self-closing select tag broke DOM parsing).
- 2026-05-19: Created island "Test Island" successfully after fix; island appears in island list and selector.
- 2026-05-19: Trade Routes flow validated end-to-end by model actions: create route, edit amount, delete route.
- 2026-05-19: Export validated by intercepting exportConfig blob creation (download payload generated).
- 2026-05-19: Import fixed and validated. Root cause was listener timing with async templates; changed to delegated binding in js/main.js.
- 2026-05-19: Import validated via config file load containing probe key (copilotImportProbe) and post-reload localStorage check.
- 2026-05-19: DLC toggle effect validated in model (example: The Passage changed available factory count from 99 to 117, then restored).
- 2026-05-19: Next action: decide whether localhost:8000 helper-server errors should be treated as expected for offline baseline.

## Phase 2 - Vue Shell
- Create a separate Vue app folder.
- Render a simple page with app title and one data panel.
- Do not delete old UI.

## Phase 3 - Adapter Layer
- Add a small bridge that exposes read-only values for Vue.
- Keep persistence and heavy calculations in existing classes.

## Phase 4 - Vertical UI Migration
Recommended order:
1. Settings and app shell
2. Population panel
3. Factory tiles and factory dialog
4. Trade routes
5. Remaining dialogs

## Phase 5 - Cutover
- Switch default UI to Vue.
- Remove Knockout-only pieces only after parity checks pass.

## Safety Rules
- Keep export/import format unchanged.
- After each migrated feature, run the same smoke checklist.
- If parity breaks, revert only that feature slice.

## Copilot Usage
- Good for repetitive conversion and component scaffolding.
- You should decide architecture and review behavior changes.
