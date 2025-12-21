/**
 * Generates a deterministic color based on a string input.
 * This is useful for keeping UI elements like placeholder images consistent.
 */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use HSL for better control over aesthetics (pastel colors)
  const h = Math.abs(hash % 360);
  const s = 70; // 70% saturation
  const l = 80; // 80% lightness for pastel effect
  
  return hslToHex(h, s, l);
}

/**
 * Extracts initials from a name by taking the first character of each word.
 * Skips common titles like Mr., Mrs., Ms., Dr., etc.
 * For example: "Ms. Abc Xyz" -> "A X"
 */
export function getNameInitials(name: string): string {
  if (!name || name.trim().length === 0) {
    return '';
  }
  
  // Common titles to skip
  const titlesToSkip = ['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'sir', 'lady', 'lord'];
  
  // Split by whitespace and filter out empty strings and common titles
  const words = name.trim().split(/\s+/)
    .filter(word => word.length > 0)
    .filter(word => {
      const cleanWord = word.toLowerCase().replace(/\./g, '');
      return !titlesToSkip.includes(cleanWord);
    });
  
  // Get first character of each word (up to 2 words for brevity)
  const initials = words
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join(' ');
  
  return initials;
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
