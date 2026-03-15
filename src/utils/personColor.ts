// ─── 150-color pastel palette ────────────────────────────────────────────────
// Generated from evenly-distributed hues (0–360°) at S=65%, L=80%.
// Light enough for dark text (#1e293b) to be readable on top.

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const col = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * col).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export const PALETTE_150: string[] = Array.from({ length: 150 }, (_, i) =>
  hslToHex(Math.round((i * 360) / 150), 65, 80)
);

/**
 * Randomly pick a color that is NOT already in use.
 * Falls back to any random color from the full palette if all 150 are taken.
 */
export function pickPersonColor(usedColors: string[]): string {
  const usedSet = new Set(usedColors);
  const available = PALETTE_150.filter(c => !usedSet.has(c));
  const pool = available.length > 0 ? available : PALETTE_150;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Initials helper (kept from original) ────────────────────────────────────

export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
