/**
 * passwordStrength.js
 *
 * Client-side password strength heuristic for the Shopkeeper registration form.
 * This does NOT replicate Clerk's breach-database check — it only catches obviously
 * weak patterns. Clerk's server-side validation is the authoritative gate.
 *
 * Usage:
 *   import { analyzePassword } from '../utils/passwordStrength';
 *   const result = analyzePassword(password);
 *   // result: { score: 0-3, label, colorClass, barColorClass, checks }
 */

/** Patterns that are weak regardless of length / char-mix */
const WEAK_PATTERNS = [
  /^(.)\1+$/,               // all same character: aaaaaaaa
  /012|123|234|345|456|567|678|789|890|987|876|765|654|543|432|321|210/i, // sequential digits/chars
  /qwerty|asdf|zxcv/i,     // keyboard walks
  /password|passw0rd|p@ssword|p@$$word/i, // "password" variants
  /pharma|admin|login|welcome|letmein/i,  // domain-specific obvious words
];

/**
 * @param {string} pw
 * @returns {{
 *   score: number,          // 0 = Weak, 1 = Fair, 2 = Good, 3 = Strong
 *   label: string,
 *   colorClass: string,     // Tailwind text color
 *   barColorClass: string,  // Tailwind bg color for the strength bar segment
 *   checks: {
 *     length: boolean,       // >= 8 chars
 *     longEnough: boolean,   // >= 12 chars (recommended)
 *     upper: boolean,
 *     lower: boolean,
 *     number: boolean,
 *     symbol: boolean,
 *     noWeakPattern: boolean,
 *   }
 * }}
 */
export function analyzePassword(pw) {
  if (!pw) {
    return {
      score: 0,
      label: '',
      colorClass: 'text-slate-400',
      barColorClass: 'bg-slate-200',
      checks: {
        length: false,
        longEnough: false,
        upper: false,
        lower: false,
        number: false,
        symbol: false,
        noWeakPattern: false,
      },
    };
  }

  const checks = {
    length: pw.length >= 8,
    longEnough: pw.length >= 12,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
    noWeakPattern: !WEAK_PATTERNS.some((re) => re.test(pw)),
  };

  // Score: 0 (Weak) → 1 (Fair) → 2 (Good) → 3 (Strong)
  // Fail immediately if length < 8 or weak pattern matched
  if (!checks.length || !checks.noWeakPattern) {
    return { score: 0, label: 'Weak', colorClass: 'text-red-500', barColorClass: 'bg-red-500', checks };
  }

  const charMixCount = [checks.upper, checks.lower, checks.number, checks.symbol].filter(Boolean).length;

  if (charMixCount <= 1) {
    return { score: 0, label: 'Weak', colorClass: 'text-red-500', barColorClass: 'bg-red-500', checks };
  }
  if (charMixCount === 2) {
    return { score: 1, label: 'Fair', colorClass: 'text-amber-500', barColorClass: 'bg-amber-400', checks };
  }
  if (charMixCount === 3) {
    return { score: 2, label: 'Good', colorClass: 'text-emerald-500', barColorClass: 'bg-emerald-500', checks };
  }
  // charMixCount === 4: upper + lower + number + symbol
  return { score: 3, label: 'Strong', colorClass: 'text-green-600', barColorClass: 'bg-green-500', checks };
}
