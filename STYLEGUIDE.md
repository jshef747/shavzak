# Shift Manager — UI Style Guide
> For use with Claude Code. Follow this guide strictly when building or modifying any UI component.

---

## 1. Design Philosophy

The Shift Manager UI should feel like a **professional SaaS tool** — clean, structured, and trustworthy. Think Monday.com or Linear: every element earns its place, spacing is intentional, and the interface never feels noisy or cluttered.

**Three core principles:**
- **Clarity over cleverness** — the UI should be immediately understandable
- **Consistency everywhere** — spacing, color, and type follow a strict system, no exceptions
- **Desktop-first density** — use the horizontal space; avoid mobile-style stacked cards on wide screens

---

## 2. Color System

Use CSS variables for every color. Never hardcode hex values in components.

```css
:root {
  /* Primary — Blue */
  --color-primary-50:  #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;

  /* Neutrals */
  --color-gray-50:  #f8fafc;
  --color-gray-100: #f1f5f9;
  --color-gray-200: #e2e8f0;
  --color-gray-300: #cbd5e1;
  --color-gray-400: #94a3b8;
  --color-gray-500: #64748b;
  --color-gray-700: #334155;
  --color-gray-900: #0f172a;

  /* Semantic */
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-danger:  #dc2626;
  --color-info:    #0ea5e9;

  /* Surfaces */
  --color-bg:           #f8fafc;   /* page background */
  --color-surface:      #ffffff;   /* cards, panels */
  --color-surface-alt:  #f1f5f9;   /* secondary surfaces, table rows */
  --color-border:       #e2e8f0;   /* all borders */
  --color-border-focus: #3b82f6;   /* focused inputs */

  /* Text */
  --color-text-primary:   #0f172a;
  --color-text-secondary: #64748b;
  --color-text-disabled:  #94a3b8;
  --color-text-inverse:   #ffffff;
}
```

### Usage rules
- **Primary blue** → CTAs, active states, links, selected items only
- **Gray-900** → all primary text
- **Gray-500** → labels, placeholders, secondary info
- **Never** use raw Tailwind color classes like `bg-blue-500` — always map through a variable or use the Tailwind config

---

## 3. Typography

**Font stack:**
```css
--font-sans: 'DM Sans', 'Inter', ui-sans-serif, system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

Load DM Sans from Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Type scale (Tailwind classes)

| Role | Class | Weight | Usage |
|---|---|---|---|
| Page title | `text-2xl` | `font-semibold` | H1, screen headers |
| Section title | `text-lg` | `font-semibold` | Card headers, panel titles |
| Subsection | `text-base` | `font-medium` | Group labels, table headers |
| Body | `text-sm` | `font-normal` | Default body copy |
| Caption / meta | `text-xs` | `font-normal` | Timestamps, hints, badges |

### Rules
- **Line height:** use `leading-snug` for headings, `leading-normal` for body
- **Never** mix multiple font weights in the same line
- Labels above inputs are always `text-xs font-medium text-gray-500 uppercase tracking-wide`

---

## 4. Spacing System

Stick strictly to Tailwind's default 4px base grid.

| Token | Value | Use |
|---|---|---|
| `p-1` / `gap-1` | 4px | Icon padding, tight inline gaps |
| `p-2` / `gap-2` | 8px | Compact elements, badge padding |
| `p-3` / `gap-3` | 12px | Button padding (vertical), form field gaps |
| `p-4` / `gap-4` | 16px | Card padding (small), section gaps |
| `p-6` / `gap-6` | 24px | Card padding (default) |
| `p-8` / `gap-8` | 32px | Page section spacing |
| `p-12` | 48px | Major layout sections |

**Layout rules:**
- Main page padding: `px-8 py-6`
- Between major page sections: `space-y-8`
- Between related elements inside a section: `space-y-4`
- Inside a card between elements: `space-y-3`
- **Never** use arbitrary values like `p-[13px]` — round to the nearest token

---

## 5. Components

### Buttons

```tsx
// Primary
<button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
  text-white text-sm font-medium rounded-lg transition-colors duration-150 shadow-sm">
  Save Board
</button>

// Secondary (outline)
<button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 
  bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors duration-150">
  Cancel
</button>

// Ghost (low emphasis)
<button className="inline-flex items-center gap-2 px-3 py-1.5 text-gray-500 
  hover:text-gray-700 hover:bg-gray-100 text-sm font-medium rounded-md transition-colors duration-150">
  Edit
</button>

// Danger
<button className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 
  text-white text-sm font-medium rounded-lg transition-colors duration-150">
  Delete
</button>
```

**Rules:**
- Always use `transition-colors duration-150` on interactive elements
- Always use `inline-flex items-center gap-2` when a button has an icon
- No button should be wider than its content unless it's a full-width form submit
- Disabled state: add `opacity-50 cursor-not-allowed pointer-events-none`

---

### Cards & Panels

```tsx
<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
  {/* content */}
</div>
```

- Border radius: always `rounded-xl` for cards, `rounded-lg` for smaller elements, `rounded-md` for inputs/badges
- Shadow: `shadow-sm` for cards, never `shadow-lg` or `shadow-xl` (too heavy)
- **Never** use `shadow` without a border — pair them together

---

### Form Inputs

```tsx
<div className="flex flex-col gap-1.5">
  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
    Position Name
  </label>
  <input
    className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 
      rounded-lg placeholder:text-gray-400 
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      transition-shadow duration-150"
    placeholder="e.g. Cashier"
  />
  <p className="text-xs text-gray-400">Helper text goes here if needed</p>
</div>
```

**Rules:**
- Every input must have a visible label — no placeholder-only inputs
- Focus state always uses `ring-2 ring-blue-500` — never a colored border alone
- Group related inputs with `space-y-4` inside a form section

---

### Badges & Tags

```tsx
// Neutral
<span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
  Draft
</span>

// Blue (active/info)
<span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
  Active
</span>

// Green (success)
<span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700">
  Saved
</span>
```

---

### Dividers & Separators

```tsx
<hr className="border-gray-200" />
```
Use sparingly — prefer whitespace (`space-y-*`) over visual dividers.

---

## 6. Layout Structure

### Page shell
```tsx
<div className="min-h-screen bg-gray-50">
  {/* Topbar */}
  <header className="h-14 bg-white border-b border-gray-200 px-8 flex items-center justify-between">
    <span className="text-base font-semibold text-gray-900">Shift Manager</span>
    {/* nav actions */}
  </header>

  {/* Main content */}
  <main className="px-8 py-6 max-w-screen-xl mx-auto">
    {/* page content */}
  </main>
</div>
```

### Sidebar panels (presets, settings)
- Width: fixed `w-72` or `w-80`
- Background: `bg-white border-r border-gray-200`
- Never use a different background color than white for sidebars

---

## 7. The Shift Board

The board is the core UI. It must feel dense but readable — like a spreadsheet with personality.

- **Column headers** (days/roles): `bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3`
- **Shift cells**: `bg-white border border-gray-200 rounded-lg p-3` with hover state `hover:border-blue-300 hover:shadow-sm`
- **Empty cells**: `bg-gray-50 border border-dashed border-gray-200 rounded-lg` — clearly distinct from filled cells
- **Selected/active shift**: `border-blue-500 ring-2 ring-blue-100`
- Shift time label inside a cell: `text-xs font-medium text-gray-700`
- Position label inside a cell: `text-sm font-semibold text-gray-900`

---

## 8. Icons

Use **Lucide React** exclusively. No mixing icon libraries.

```tsx
import { Plus, Trash2, Save, Clock, User } from 'lucide-react'

// Standard icon size in buttons
<Plus className="w-4 h-4" />

// Standalone icon (action, no button)
<Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500 cursor-pointer transition-colors" />
```

**Rules:**
- Icons in buttons: always `w-4 h-4`
- Standalone decorative icons: `w-5 h-5`
- Never use icons larger than `w-6 h-6` in the UI
- Icon color should always inherit from context or be explicitly set to a gray/semantic token

---

## 9. Motion & Transitions

Keep animations subtle and functional — this is a productivity tool, not a portfolio site.

```
transition-colors duration-150   → hover/focus color changes (buttons, inputs)
transition-shadow duration-150   → card hover effects
transition-opacity duration-200  → modals, dropdowns appearing
transition-transform duration-200 ease-out → slide-in panels
```

**Rules:**
- No `duration-500` or longer anywhere in the UI
- No bounce or spring animations
- Modals fade in with `opacity-0 → opacity-100` over `200ms`
- Dropdowns slide down `translate-y-1 → translate-y-0` over `150ms`

---

## 10. Do / Don't

| ✅ Do | ❌ Don't |
|---|---|
| Use `shadow-sm` + `border` on cards | Use `shadow-lg` or `drop-shadow` |
| Use `rounded-xl` for cards | Mix `rounded` sizes randomly |
| Space sections with `space-y-8` | Use arbitrary margins (`mt-[22px]`) |
| Label every form input | Use placeholder as the only label |
| Use `text-sm` for body copy | Use `text-base` as default body size |
| Use Lucide icons only | Mix Heroicons, FontAwesome, etc. |
| Keep the board background `bg-gray-50` | Use white as the page background |
| Use `transition-colors duration-150` on all interactives | Skip transitions on hover states |
