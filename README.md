# שבצק (Shavzak)

A shift scheduling web app built with React 19 + TypeScript. Designed for managing personnel assignments across multi-day schedules with drag-and-drop support, constraint validation, and Hebrew/English UI.

## Features

- **Drag-and-drop scheduling** — assign people to shifts using DnD Kit
- **Constraint validation** — per-person rules (blocked days, max shifts/week, min rest, consecutive day limits, etc.)
- **Insufficient-break detection** — flags back-to-back assignments with < 12-hour gaps
- **RTL support** — full Hebrew layout toggle
- **Print & export** — print-ready schedule view and Excel export (with a Constraints sheet)
- **Persistent state** — saved to `localStorage` automatically
- **Status legend** — color-coded cell statuses (valid, unavailable, unqualified, double-booked, insufficient-break, constraint-violation)

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v3
- DnD Kit
- date-fns
- XLSX
- react-to-print

## Getting Started

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Project Structure

```
src/
  components/   # UI components (App, TopBar, ScheduleGrid, PersonChip, modals, …)
  hooks/        # Custom hooks (usePeople, useShifts, useAssignments, …)
  utils/        # Validation, i18n, color, Excel export
  types/        # TypeScript interfaces
  constants/    # Default shifts, storage key, initial state
```
