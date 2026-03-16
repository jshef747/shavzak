# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server with HMR
- `npm run build` — TypeScript type-check (`tsc -b`) then Vite production build
- `npm run lint` — ESLint (TypeScript + React Hooks rules)
- `npm run preview` — preview the production build locally

There is no test framework configured.

## Architecture

### State Management
All app state lives in a single `AppState` object managed by `useAppState()` (localStorage key: `shift-manager-v1`). There is no Redux or Context API. Every hook receives `(state, setState)` and returns action functions — none hold their own state.

Hook hierarchy wired together in `src/components/App.tsx`:
- `useSchedule` — schedule CRUD, `activeScheduleId`
- `useShifts`, `usePositions`, `usePeople`, `useAssignments`, `useHomeGroups` — entity CRUD
- `useAuth` + `useCloudSync` — Supabase auth + 1-second debounced auto-save
- `usePresets` — user-scoped shift/position templates

### Key Data Models (`src/types/index.ts`)
- `Schedule` — has `assignments: Assignment[]` and `homeGroupPeriods`
- `Assignment` — `{ personId, date (ISO), shiftId, positionId }`
- `Person` — has `constraints: ShiftConstraint | null`, `qualifiedPositions`, `unavailability`
- `ShiftConstraint` — allowlists/blocklists for shifts/days, max counts, rest-day rules
- `CellStatus` — one of 8 values: `empty`, `valid`, `unavailable`, `home-group`, `double-booked`, `unqualified`, `insufficient-break`, `constraint-violation`, `oncall-short-break`
- `AppState.dir` — `'ltr' | 'rtl'` for Hebrew/English toggle

### Validation & Assignment Logic
- `src/utils/validation.ts` — `computeCellStatus()` is the single source of truth for cell validity; consult it before any assignment logic
- `src/utils/autoAssign.ts` — greedy auto-assign algorithm; respects all constraints
- `src/utils/i18n.ts` — bilingual strings; use `t(key, lang)` for any user-visible text

### Drag and Drop
DnD Kit (`@dnd-kit/core`, `@dnd-kit/sortable`). `DndProvider` wraps the layout. PersonChips are draggable from the pool (Sidebar) or from cells; AssignmentCells are droppable targets.

## UI Style Rules (from STYLEGUIDE.md)

- **Colors**: Use CSS variables or Tailwind config mappings — never raw hex or raw Tailwind color classes like `bg-blue-500`
- **Buttons**: always `inline-flex items-center gap-2`, `transition-colors duration-150`. Use `src/components/ui/Button.tsx` variants (primary/secondary/ghost/danger)
- **Cards**: `bg-white rounded-xl border border-gray-200 shadow-sm p-6`
- **Inputs**: always have a visible label (never placeholder-only); focus ring is `ring-2 ring-blue-500`
- **Icons**: Lucide React only, `w-4 h-4` inside buttons
- **Typography**: DM Sans; body = `text-sm font-normal`; labels above inputs = `text-xs font-medium text-gray-500 uppercase tracking-wide`
- **Spacing**: strict 4px grid via Tailwind tokens; no arbitrary values like `p-[13px]`
- **Motion**: `transition-colors duration-150` only — no spring animations
- **RTL**: use Tailwind `rtl:` variants; check `state.dir` for conditional logic
- **Print**: StatusLegend and auth UI are excluded from print via `print:hidden`

## Supabase Integration
Credentials come from `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Auth is email-based. Cloud sync auto-saves on any state change with a 1-second debounce via `useCloudSync`.
