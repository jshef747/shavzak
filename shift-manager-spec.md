# Shift Manager — Claude Code Spec

## Overview

Build a **Shift Manager web app** using **React** with **localStorage persistence**. The app manages a work schedule across custom date ranges, with drag-and-drop shift assignment.

---

## Core Data Model

- **Positions** — user-created (e.g. "Cashier", "Security"). Each position is a column in the schedule table.
- **People** — user-created. Each person can be qualified for multiple positions but can only fill **one position per shift slot**.
- **Shifts** — 4 fixed time slots per day: `00–06`, `06–12`, `12–18`, `18–00`. Each shift = **6 hours**.
- **Availability** — each person can have specific **day + shift slot** combinations marked as unavailable.

---

## App Structure

### 1. Settings Panel (sidebar or modal)

- **Positions tab**: Add / rename / delete positions.
- **People tab**: Add / delete people. For each person:
  - Select which positions they are qualified for (multi-select checkboxes).
  - Mark unavailability by selecting specific dates and/or shift slots.

### 2. Schedule Table (main view)

- **Date range picker**: user selects a start and end date. The table renders one section per day.
- **Table layout**:
  - **Rows** = the 4 shift slots (`00–06`, `06–12`, `12–18`, `18–00`)
  - **Columns** = positions (user-defined)
  - Each day gets its own header spanning all position columns
- Each **cell** = one (day × shift × position) assignment slot.

### 3. Drag & Drop

- A **people pool / roster panel** lists all people. Each person chip shows their name and qualified positions.
- Drag a person from the pool onto a cell to assign them.
- **Validation on drop**:
  - If the person is **unavailable** for that day/shift → cell turns **red**, assignment is saved but visually flagged.
  - If the person is **already assigned** elsewhere in the same shift slot on the same day → cell turns **orange** (double-booked warning).
  - Valid assignment → cell turns **green**.
- Dragging a person off a cell (back to pool or to another cell) removes/moves the assignment.

### 4. Hours Tracker

- Show a **summary panel**: each person's name + total assigned hours for the current loaded schedule (each assigned shift = 6 hours).

### 5. Export

- **Export to PDF**: prints the schedule table cleanly (landscape orientation).
- **Export to Excel (.xlsx)**: exports the schedule grid with days, shifts, positions, and assigned names.

---

## Persistence

- All data (positions, people, qualifications, availability, schedules) saved to **localStorage**.
- On app load, restore previous state automatically.
- Multiple schedules can be saved and reloaded by name / date range.

---

## Tech Stack

| Concern | Library |
|---|---|
| UI framework | React (hooks) |
| Drag & drop | `@dnd-kit/core` |
| Date handling | `date-fns` |
| Excel export | `xlsx` |
| PDF export | `react-to-print` or `html2canvas + jsPDF` |
| Styling | Tailwind CSS |

---

## UX Notes

- The schedule is **not repeating** — each date range is fully independent and custom.
- Settings panel must be accessible at all times without losing the current schedule view.
- Auto-fill feature is **out of scope for now** (can be added later).
