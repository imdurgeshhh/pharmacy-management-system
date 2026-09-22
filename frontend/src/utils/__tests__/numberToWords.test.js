import { describe, it, expect } from 'vitest';
import { numberToWords } from '../numberToWords';

describe('numberToWords utility', () => {
  it('handles zero correctly', () => {
    expect(numberToWords(0)).toBe('Zero Rupees Only');
    expect(numberToWords('0')).toBe('Zero Rupees Only');
    expect(numberToWords('0.00')).toBe('Zero Rupees Only');
  });

  it('converts single digit and teens', () => {
    expect(numberToWords(5)).toBe('Five Rupees Only');
    expect(numberToWords(15)).toBe('Fifteen Rupees Only');
  });

  it('converts hundreds and thousands', () => {
    expect(numberToWords(100)).toBe('One Hundred Rupees Only');
    expect(numberToWords(150)).toBe('One Hundred Fifty Rupees Only');
    expect(numberToWords(1234)).toBe('One Thousand Two Hundred Thirty Four Rupees Only');
  });

  it('converts lakhs and crores in Indian numbering system', () => {
    expect(numberToWords(100000)).toBe('One Lakh Rupees Only');
    expect(numberToWords(2500000)).toBe('Twenty Five Lakh Rupees Only');
    expect(numberToWords(10000000)).toBe('One Crore Rupees Only');
    expect(numberToWords(10500050)).toBe('One Crore Five Lakh Fifty Rupees Only');
  });

  it('converts amounts with paise', () => {
    expect(numberToWords(1234.50)).toBe('One Thousand Two Hundred Thirty Four Rupees and Fifty Paise Only');
    expect(numberToWords('45.25')).toBe('Forty Five Rupees and Twenty Five Paise Only');
    expect(numberToWords(0.75)).toBe('Seventy Five Paise Only');
  });

  it('handles invalid inputs gracefully', () => {
    expect(numberToWords(-10)).toBe('');
    expect(numberToWords('abc')).toBe('');
  });
});
