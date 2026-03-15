// ─── 150-color palette ───────────────────────────────────────────────────────
// Uses the golden angle (137.508°) to space hues so that every consecutive
// color is as far apart as possible on the hue wheel — no two adjacent palette
// entries look similar. Saturation and lightness cycle through three profiles
// to add extra variety beyond hue alone.
//
//  Profile 0 (i%3=0): S=65%, L=83% — soft muted pastels
//  Profile 1 (i%3=1): S=80%, L=76% — deeper, more saturated
//  Profile 2 (i%3=2): S=88%, L=80% — vivid pastels
//
// All three profiles stay light enough for dark text (#1e293b) to be readable.

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

const GOLDEN_ANGLE = 137.508; // degrees — maximises hue distance between consecutive entries
const SL_PROFILES: [number, number][] = [
  [65, 83], // soft pastel
  [80, 76], // deeper
  [88, 80], // vivid pastel
];

export const PALETTE_150: string[] = Array.from({ length: 150 }, (_, i) => {
  const hue = (i * GOLDEN_ANGLE) % 360;
  const [s, l] = SL_PROFILES[i % 3];
  return hslToHex(hue, s, l);
});

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
