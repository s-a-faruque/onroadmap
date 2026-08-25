# onroadmap

A lightweight, responsive 1-year roadmap planner for dragging and stretching project tasks across month and week timelines. It is client-first and stores the full roadmap payload in `window.localStorage`, with JSON import/export for backups or handoff.

## Features

- Month view with 12 columns and week view with 52 columns.
- Horizontal scroll across the full year grid.
- Drag tasks across time and between swimlanes.
- Resize task start and end dates with left and right handles.
- Snap task movement to day, week, or month boundaries.
- Editable task titles, color badges, comma-separated tags, and swimlane names.
- LocalStorage autosave plus complete JSON export/import.
- PDF download of the full roadmap timeline.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Configuration

Timeline and toolbar features are configured in `src/appConfig.ts`. You can change the timeline start year, end year, start month, month span, year selector visibility, available snap modes, default snap mode, JSON export/import visibility, and PDF download visibility there.

Use `timeline.startMonth: 4` for an April-start roadmap or `timeline.startMonth: 1` for a January-start roadmap. The value is 1-based, so `1` is January and `12` is December.

Use `timeline.startYear` and `timeline.endYear` for a fixed fiscal year range. With `startYear: 2026`, `endYear: 2027`, and `startMonth: 4`, the app shows Apr 2026-Mar 2028, covering FY2026 and FY2027. If `endYear` is omitted, `monthSpan` controls the length directly. Set `allowYearSelection: false` to replace the year input with a read-only timeline range label.

The toolbar includes month pickers for the active timeline range. Picker changes are saved separately in LocalStorage under `onroadmap.timelineRange.v1`.

Quarter labels use fiscal-year wording based on the configured start year, such as `Q1 - FY2026`. For an April-start roadmap, `Q4 - FY2026` covers Jan-Mar 2027.

The app theme is fixed to the configured `Cool light` palette in `src/appConfig.ts`; there is no runtime theme selector.

## Persistence Boundary

The UI talks to a small `RoadmapStore` interface in `src/storage.ts`. The current implementation is LocalStorage, but a database-backed adapter can be added later without rewriting the timeline components.