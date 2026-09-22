/**
 * numberToWords.js — Converts currency number to Indian numbering words
 * e.g. 1234.50 -> "One Thousand Two Hundred Thirty Four Rupees and Fifty Paise Only"
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertBelowThousand(num) {
  let str = '';
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num >= 20) {
    str += TENS[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ONES[num % 10] : '');
  } else if (num > 0) {
    str += ONES[num];
  }
  return str.trim();
}

/**
 * Converts a numeric amount to Indian English words.
 * Format: "<Rupees in Words> Rupees [and <Paise in Words> Paise] Only"
 *
 * @param {number|string} amount
 * @returns {string}
 */
export function numberToWords(amount) {
  const numVal = parseFloat(amount);
  if (isNaN(numVal) || numVal < 0) {
    return '';
  }

  if (numVal === 0) {
    return 'Zero Rupees Only';
  }

  // Split into rupees and paise (round to 2 decimal places to avoid floating point imprecision)
  const rounded = numVal.toFixed(2);
  const [rupeesPartStr, paisePartStr] = rounded.split('.');
  let rupees = parseInt(rupeesPartStr, 10);
  const paise = parseInt(paisePartStr, 10);

  let words = '';

  const crore = Math.floor(rupees / 10000000);
  rupees %= 10000000;

  const lakh = Math.floor(rupees / 100000);
  rupees %= 100000;

  const thousand = Math.floor(rupees / 1000);
  rupees %= 1000;

  const hundred = rupees;

  if (crore > 0) {
    words += convertBelowThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertBelowThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertBelowThousand(thousand) + ' Thousand ';
  }
  if (hundred > 0) {
    words += convertBelowThousand(hundred) + ' ';
  }

  words = words.trim();
  const rupeesText = words ? `${words} Rupees` : '';
  const paiseText = paise > 0 ? `${convertBelowThousand(paise)} Paise` : '';

  if (rupeesText && paiseText) {
    return `${rupeesText} and ${paiseText} Only`;
  }
  if (rupeesText) {
    return `${rupeesText} Only`;
  }
  if (paiseText) {
    return `${paiseText} Only`;
  }

  return 'Zero Rupees Only';
}

export default numberToWords;
