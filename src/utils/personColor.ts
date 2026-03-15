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

// ─── Color distance ──────────────────────────────────────────────────────────
// Euclidean distance in RGB space. Max possible = sqrt(3 × 255²) ≈ 441.7.
// MIN_COLOR_DISTANCE = 44 ≈ 10% of that max — ensures every new color looks
// clearly different from every already-assigned color.

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

const MIN_COLOR_DISTANCE = 44; // ~10% of max RGB distance

/**
 * Pick a color from the palette that is visually distinct (≥10% RGB distance)
 * from every already-assigned color.
 * Falls back to the least-similar color if the palette is exhausted.
 */
export function pickPersonColor(usedColors: string[]): string {
  const available = PALETTE_150.filter(c =>
    usedColors.every(u => colorDistance(c, u) >= MIN_COLOR_DISTANCE)
  );
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  // Fallback: pick whichever palette color is most different from all used colors
  let best = PALETTE_150[0];
  let bestMinDist = 0;
  for (const c of PALETTE_150) {
    const minDist = Math.min(...usedColors.map(u => colorDistance(c, u)));
    if (minDist > bestMinDist) { bestMinDist = minDist; best = c; }
  }
  return best;
}

// ─── Initials helper (kept from original) ────────────────────────────────────

export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
