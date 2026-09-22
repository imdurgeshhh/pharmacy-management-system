/**
 * Converts a number into Indian Rupee words.
 * E.g., 465.00 -> "Rs. Four Hundred and Sixty Five only"
 * E.g., 145281.50 -> "Rs. One Lakh Forty Five Thousand Two Hundred and Eighty One and Paise Fifty only"
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertLessThanThousand(n) {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred';
    n %= 100;
    if (n > 0) str += ' and ';
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)];
    if (n % 10 > 0) {
      str += ' ' + ONES[n % 10];
    }
  } else if (n > 0) {
    str += ONES[n];
  }
  return str.trim();
}

function numberToWords(amount) {
  const num = parseFloat(amount);
  if (isNaN(num) || num === 0) return 'Rs. Zero only';

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const rupees = Math.floor(absNum);
  const paise = Math.round((absNum - rupees) * 100);

  let result = '';

  const crore = Math.floor(rupees / 10000000);
  let remainder = rupees % 10000000;

  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  if (crore > 0) {
    result += convertLessThanThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertLessThanThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertLessThanThousand(thousand) + ' Thousand ';
  }
  if (remainder > 0) {
    result += convertLessThanThousand(remainder) + ' ';
  }

  result = result.trim();
  if (!result) {
    result = 'Zero';
  }

  let finalStr = (isNegative ? 'Minus ' : '') + 'Rs. ' + result;

  if (paise > 0) {
    finalStr += ' and Paise ' + convertLessThanThousand(paise);
  }

  finalStr += ' only';
  return finalStr;
}

module.exports = numberToWords;
