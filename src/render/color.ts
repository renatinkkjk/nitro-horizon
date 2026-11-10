/** Utilitários de cor compartilhados pelos sprites. */

/** Clareia (amount > 0) ou escurece (amount < 0) uma cor hexadecimal. */
export function shade(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const value = parseInt(full, 16);
  const channel = (raw: number) => {
    const next = amount > 0 ? raw + (255 - raw) * amount : raw * (1 + amount);
    return Math.max(0, Math.min(255, Math.round(next)));
  };
  return `rgb(${channel((value >> 16) & 255)},${channel((value >> 8) & 255)},${channel(value & 255)})`;
}
