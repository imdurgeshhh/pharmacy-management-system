import { describe, it, expect } from 'vitest';
import {
    toTotalUnits,
    fromTotalUnits,
    normalizeQty,
    pricePerUnit,
    lineAmount,
    formatQty
} from '../quantity';

describe('Frontend Quantity Helpers - Unit Tests', () => {

    it('2 strip + 0 loose = 40 (ups 20)', () => {
        const total = toTotalUnits({ strips: 2, loose: 0, unitsPerStrip: 20 });
        expect(total).toBe(40);
        const decomposed = fromTotalUnits(40, 20);
        expect(decomposed.strips).toBe(2);
        expect(decomposed.loose).toBe(0);
    });

    it('1 strip + 10 loose = 30 (ups 20)', () => {
        const total = toTotalUnits({ strips: 1, loose: 10, unitsPerStrip: 20 });
        expect(total).toBe(30);
        const decomposed = fromTotalUnits(30, 20);
        expect(decomposed.strips).toBe(1);
        expect(decomposed.loose).toBe(10);
    });

    it('0 strip + 5 loose = 5 (ups 20)', () => {
        const total = toTotalUnits({ strips: 0, loose: 5, unitsPerStrip: 20 });
        expect(total).toBe(5);
        const decomposed = fromTotalUnits(5, 20);
        expect(decomposed.strips).toBe(0);
        expect(decomposed.loose).toBe(5);
    });

    it('loose 25 with ups 20 -> auto-normalizes to 1 strip + 5 tab', () => {
        const normalized = normalizeQty({ strips: 0, loose: 25, unitsPerStrip: 20 });
        expect(normalized.strips).toBe(1);
        expect(normalized.loose).toBe(5);
        expect(normalized.totalUnits).toBe(25);
    });

    it('30 tab, strip Rs.100, ups 20 -> Rs.150.00', () => {
        const unitP = pricePerUnit(100, 20);
        expect(unitP).toBe(5);
        const amt = lineAmount(30, 100, 20);
        expect(amt).toBe(150.00);
    });

    it('ups = 1 item (syrup/injection) works with single unit quantity', () => {
        const total = toTotalUnits({ strips: 3, loose: 0, unitsPerStrip: 1 });
        expect(total).toBe(3);
        const decomposed = fromTotalUnits(5, 1);
        expect(decomposed.strips).toBe(0);
        expect(decomposed.loose).toBe(5);
        expect(decomposed.totalUnits).toBe(5);

        const amt = lineAmount(4, 120, 1);
        expect(amt).toBe(480.00);

        const formatted = formatQty(5, 1);
        expect(formatted).toBe('5 Units');
    });

    it('formatQty formats strip + loose breakdown clearly', () => {
        expect(formatQty(30, 20)).toBe('1 Strip + 10 Tab (30 tab)');
        expect(formatQty(40, 20)).toBe('2 Strip (40 tab)');
        expect(formatQty(5, 20)).toBe('5 Tab');
    });

});
