import { describe, it, expect } from 'vitest';
import {
    toTotalUnits,
    fromTotalUnits,
    normalizeQty,
    pricePerUnit,
    lineAmount,
    formatQty,
    calculateLineItem,
    formatLineBreakdown
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

    it('formatQty correctly formats Syrup/Bottle, Bottle, Tube, Piece', () => {
        expect(formatQty(1, 1, 'Syrup/Bottle')).toBe('1 Bottle');
        expect(formatQty(1, 10, 'Syrup/Bottle')).toBe('1 Bottle');
        expect(formatQty(3, 1, 'Bottle')).toBe('3 Bottle');
        expect(formatQty(2, 1, 'Tube')).toBe('2 Tube');
        expect(formatQty(4, 1, 'Piece')).toBe('4 Piece');
        expect(formatQty(1, { units_per_strip: 10, unit_type: 'Syrup/Bottle' })).toBe('1 Bottle');
    });

    // ─── calculateLineItem Suite ──────────────────────────────────────
    it('calculateLineItem: pure strip (2 strips x 50.00 = 100.00)', () => {
        const item = calculateLineItem({
            strips: 2,
            loose: 0,
            unitsPerStrip: 10,
            sellingPrice: 50
        });
        expect(item.lineAmount).toBe(100.00);
        expect(item.stripsQty).toBe(2);
        expect(item.looseQty).toBe(0);
        expect(item.totalUnits).toBe(20);
        expect(item.breakdown).toBe('2 strip x 50.00 = 100.00');
        expect(item.missingUnitsPerStrip).toBe(false);
    });

    it('calculateLineItem: pure loose (3 loose x 5.00 = 15.00)', () => {
        const item = calculateLineItem({
            strips: 0,
            loose: 3,
            unitsPerStrip: 10,
            sellingPrice: 50
        });
        expect(item.lineAmount).toBe(15.00);
        expect(item.perUnitPrice).toBe(5.00);
        expect(item.stripsQty).toBe(0);
        expect(item.looseQty).toBe(3);
        expect(item.totalUnits).toBe(3);
        expect(item.breakdown).toBe('3 loose x 5.00 = 15.00');
    });

    it('calculateLineItem: mixed strip and loose (2 strip x 50.00 + 3 loose x 5.00 = 115.00)', () => {
        const item = calculateLineItem({
            strips: 2,
            loose: 3,
            unitsPerStrip: 10,
            sellingPrice: 50
        });
        expect(item.lineAmount).toBe(115.00);
        expect(item.stripsQty).toBe(2);
        expect(item.looseQty).toBe(3);
        expect(item.totalUnits).toBe(23);
        expect(item.breakdown).toBe('2 strip x 50.00 + 3 loose x 5.00 = 115.00');
    });

    it('calculateLineItem: auto-normalizes loose overflow (1 strip + 15 loose -> 2 strip + 5 loose)', () => {
        const item = calculateLineItem({
            strips: 1,
            loose: 15,
            unitsPerStrip: 10,
            sellingPrice: 50
        });
        expect(item.stripsQty).toBe(2);
        expect(item.looseQty).toBe(5);
        expect(item.totalUnits).toBe(25);
        expect(item.lineAmount).toBe(125.00);
        expect(item.breakdown).toBe('2 strip x 50.00 + 5 loose x 5.00 = 125.00');
    });

    it('calculateLineItem: non-strip items (syrups/bottles/tubes) use qty * price', () => {
        const syrup = calculateLineItem({
            qty: 1,
            unitsPerStrip: 1,
            unitType: 'Syrup/Bottle',
            sellingPrice: 120
        });
        expect(syrup.lineAmount).toBe(120.00);
        expect(syrup.breakdown).toBe('1 x 120.00 = 120.00');
        expect(syrup.isSingleUnit).toBe(true);

        const tube = calculateLineItem({
            qty: 3,
            unitsPerStrip: 1,
            unitType: 'Tube',
            sellingPrice: 45.50
        });
        expect(tube.lineAmount).toBe(136.50);
        expect(tube.breakdown).toBe('3 x 45.50 = 136.50');
    });

    it('calculateLineItem: missing/invalid unitsPerStrip flags missingUnitsPerStrip and defaults to 1 (never guesses 10)', () => {
        const missingUps = calculateLineItem({
            qty: 5,
            unitsPerStrip: undefined,
            sellingPrice: 20
        });
        expect(missingUps.missingUnitsPerStrip).toBe(true);
        expect(missingUps.unitsPerStrip).toBe(1);
        expect(missingUps.lineAmount).toBe(100.00);
        expect(missingUps.breakdown).toBe('5 x 20.00 = 100.00');

        const zeroUps = calculateLineItem({
            qty: 2,
            unitsPerStrip: 0,
            sellingPrice: 15
        });
        expect(zeroUps.missingUnitsPerStrip).toBe(true);
        expect(zeroUps.unitsPerStrip).toBe(1);
        expect(zeroUps.lineAmount).toBe(30.00);
    });

    it('calculateLineItem: avoids floating point drift on non-divisible pack sizes', () => {
        const item = calculateLineItem({
            strips: 0,
            loose: 3,
            unitsPerStrip: 3,
            sellingPrice: 100
        });
        expect(item.lineAmount).toBe(100.00);
        expect(item.stripsQty).toBe(1);
        expect(item.looseQty).toBe(0);
    });

    it('bill total calculation: exact sum of line amounts, discount, tax, round off, no extra charges', () => {
        const l1 = calculateLineItem({ strips: 2, unitsPerStrip: 10, sellingPrice: 50 });
        const l2 = calculateLineItem({ strips: 1, loose: 3, unitsPerStrip: 10, sellingPrice: 100 });
        const l3 = calculateLineItem({ qty: 1, unitType: 'Syrup/Bottle', sellingPrice: 120 });

        const subtotal = +(l1.lineAmount + l2.lineAmount + l3.lineAmount).toFixed(2);
        expect(subtotal).toBe(350.00);

        const discountPct = 10;
        const discountAmt = +(subtotal * discountPct / 100).toFixed(2);
        expect(discountAmt).toBe(35.00);

        const taxableBase = +(subtotal - discountAmt).toFixed(2);
        expect(taxableBase).toBe(315.00);

        const taxPct = 5;
        const taxAmt = +(taxableBase * taxPct / 100).toFixed(2);
        expect(taxAmt).toBe(15.75);

        const beforeRound = +(taxableBase + taxAmt).toFixed(2);
        expect(beforeRound).toBe(330.75);

        const rounded = Math.round(beforeRound);
        expect(rounded).toBe(331);
        const roundOff = +(rounded - beforeRound).toFixed(2);
        expect(roundOff).toBe(0.25);

        const finalGrandTotal = +(taxableBase + taxAmt + roundOff).toFixed(2);
        expect(finalGrandTotal).toBe(331.00);
    });

});
