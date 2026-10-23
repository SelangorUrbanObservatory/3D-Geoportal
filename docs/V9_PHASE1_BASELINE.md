# SUO 3D GeoPortal — v9.0 Development Baseline

Date: 23 October 2026
Branch: `development-v9`
Source: `main` at branch creation. Main remains the live production baseline.

## Scope — Phase 1: UX, performance, stability
1. Inventory and audit HTML/CSS/JS, dependencies, assets, and data-loading paths.
2. Consolidate legacy overlapping CSS into SUO visual tokens; avoid widespread `!important`.
3. Improve readability, navigation, sidebar grouping, responsive layout.
4. Harden Mapbox initialization and startup failures, retaining CDN fallbacks.
5. Regression-check 2D/3D, split panes, independent basemaps, layer visibility and render order.
6. Validate assistant avatar, right-panel modules, spatial tools and data source integrity.

## Initial verified observations
- `index.html` currently references `styles.css?v=8.1`.
- `styles.css` contains legacy theme overrides appended during prior refinements.
- Mapbox GL JS styles are loaded from a public CDN.
- The current application is not modified on `main` by this baseline note.

## Non-regression rules
- Preserve dataset values and map symbology, including rail lines and stations.
- Do not change analytics logic, layer IDs, API credentials or operational endpoints during a theme-only refactor.
- Never merge until syntax, loading, UI, and spatial tools are verified.
- Maintain a rollback path by preserving the original main commit in Git history.

## Phase 1 work plan
- P1A: Audit and style inventory.
- P1B: Extract stable SUO theme tokens and reusable components.
- P1C: Refactor navigation/panels without removing modules.
- P1D: Startup/performance and responsive testing.
- P1E: Regression verification and release candidate.
