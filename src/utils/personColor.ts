// Deterministic per-name color assignment with a 10-color palette

const PALETTES = [
  { bg: 'bg-rose-500',    text: 'text-white', ring: 'ring-rose-300',    light: 'bg-rose-50 border-rose-200 text-rose-800' },
  { bg: 'bg-orange-500',  text: 'text-white', ring: 'ring-orange-300',  light: 'bg-orange-50 border-orange-200 text-orange-800' },
  { bg: 'bg-amber-500',   text: 'text-white', ring: 'ring-amber-300',   light: 'bg-amber-50 border-amber-200 text-amber-800' },
  { bg: 'bg-lime-600',    text: 'text-white', ring: 'ring-lime-300',    light: 'bg-lime-50 border-lime-200 text-lime-800' },
  { bg: 'bg-teal-500',    text: 'text-white', ring: 'ring-teal-300',    light: 'bg-teal-50 border-teal-200 text-teal-800' },
  { bg: 'bg-cyan-600',    text: 'text-white', ring: 'ring-cyan-300',    light: 'bg-cyan-50 border-cyan-200 text-cyan-800' },
  { bg: 'bg-blue-500',    text: 'text-white', ring: 'ring-blue-300',    light: 'bg-blue-50 border-blue-200 text-blue-800' },
  { bg: 'bg-violet-500',  text: 'text-white', ring: 'ring-violet-300',  light: 'bg-violet-50 border-violet-200 text-violet-800' },
  { bg: 'bg-pink-500',    text: 'text-white', ring: 'ring-pink-300',    light: 'bg-pink-50 border-pink-200 text-pink-800' },
  { bg: 'bg-indigo-500',  text: 'text-white', ring: 'ring-indigo-300',  light: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function personPalette(name: string) {
  return PALETTES[hashName(name) % PALETTES.length];
}

export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
