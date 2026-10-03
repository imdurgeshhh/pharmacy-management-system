'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    toTotalUnits,
    fromTotalUnits,
    normalizeQty,
    pricePerUnit,
    lineAmount,
    formatQty,
    calculateLineItem,
    formatLineBreakdown
} = require('../../utils/quantity');

test('Quantity Helpers - Unit Tests', async (t) => {

    await t.test('2 strip + 0 loose = 40 (ups 20)', () => {
        const total = toTotalUnits({ strips: 2, loose: 0, unitsPerStrip: 20 });
        assert.equal(total, 40);
        const decomposed = fromTotalUnits(40, 20);
        assert.equal(decomposed.strips, 2);
        assert.equal(decomposed.loose, 0);
    });

    await t.test('1 strip + 10 loose = 30 (ups 20)', () => {
        const total = toTotalUnits({ strips: 1, loose: 10, unitsPerStrip: 20 });
        assert.equal(total, 30);
        const decomposed = fromTotalUnits(30, 20);
        assert.equal(decomposed.strips, 1);
        assert.equal(decomposed.loose, 10);
    });

    await t.test('0 strip + 5 loose = 5 (ups 20)', () => {
        const total = toTotalUnits({ strips: 0, loose: 5, unitsPerStrip: 20 });
        assert.equal(total, 5);
        const decomposed = fromTotalUnits(5, 20);
        assert.equal(decomposed.strips, 0);
        assert.equal(decomposed.loose, 5);
    });

    await t.test('loose 25 with ups 20 -> auto-normalizes to 1 strip + 5 tab', () => {
        const normalized = normalizeQty({ strips: 0, loose: 25, unitsPerStrip: 20 });
        assert.equal(normalized.strips, 1);
        assert.equal(normalized.loose, 5);
        assert.equal(normalized.totalUnits, 25);
    });

    await t.test('30 tab, strip Rs.100, ups 20 -> Rs.150.00', () => {
        const unitP = pricePerUnit(100, 20);
        assert.equal(unitP, 5);
        const amt = lineAmount(30, 100, 20);
        assert.equal(amt, 150.00);
    });

    await t.test('ups = 1 item (syrup/injection) works with single unit quantity', () => {
        const total = toTotalUnits({ strips: 3, loose: 0, unitsPerStrip: 1 });
        assert.equal(total, 3);
        const decomposed = fromTotalUnits(5, 1);
        assert.equal(decomposed.strips, 0);
        assert.equal(decomposed.loose, 5);
        assert.equal(decomposed.totalUnits, 5);

        const amt = lineAmount(4, 120, 1);
        assert.equal(amt, 480.00);

        const formatted = formatQty(5, 1);
        assert.equal(formatted, '5 Units');
    });

    await t.test('formatQty formats strip + loose breakdown clearly', () => {
        assert.equal(formatQty(30, 20), '1 Strip + 10 Tab (30 tab)');
        assert.equal(formatQty(40, 20), '2 Strip (40 tab)');
        assert.equal(formatQty(5, 20), '5 Tab');
    });

    await t.test('formatQty correctly formats Syrup/Bottle, Bottle, Tube, Piece', () => {
        assert.equal(formatQty(1, 1, 'Syrup/Bottle'), '1 Bottle');
        assert.equal(formatQty(1, 10, 'Syrup/Bottle'), '1 Bottle');
        assert.equal(formatQty(3, 1, 'Bottle'), '3 Bottle');
        assert.equal(formatQty(2, 1, 'Tube'), '2 Tube');
        assert.equal(formatQty(4, 1, 'Piece'), '4 Piece');
        assert.equal(formatQty(1, { units_per_strip: 10, unit_type: 'Syrup/Bottle' }), '1 Bottle');
    });

    // ─── calculateLineItem Suite ──────────────────────────────────────
    await t.test('calculateLineItem: pure strip (2 strips x 50.00 = 100.00)', () => {
        const item = calculateLineItem({
            strips: 2,
            loose: 0,
            unitsPerStrip: 10,
            sellingPrice: 50
        });
        assert.equal(item.lineAmount, 100.00);
        assert.equal(item.stripsQty, 2);
        assert.equal(item.looseQty, 0);
        assert.equal(item.totalUnits, 20);
        assert.equal(item.breakdown, '2 strip x 50.00 = 100.00');
        assert.equal(item.missingUnitsPerStrip, false);
    });

    await t.test('calculateLineItem: pure loose (3 loose x 5.00 = 15.00)', () => {
        const item = calculateLineItem({
            strips: 0,
            loose: 3,
            unitsPerStrip: 10,
            sellingPrice: 50
        });
        assert.equal(item.lineAmount, 15.00);
        assert.equal(item.perUnitPrice, 5.00);
        assert.equal(item.stripsQty, 0);
        assert.equal(item.looseQty, 3);
        assert.equal(item.totalUnits, 3);
        assert.equal(item.breakdown, '3 loose x 5.00 = 15.00');
    });

    await t.test('calculateLineItem: mixed strip and loose (2 strip x 50.00 + 3 loose x 5.00 = 115.00)', () => {
        const item = calculateLineItem({
            strips: 2,
            loose: 3,
            unitsPerStrip: 10,
            sellingPrice: 50
        });
        assert.equal(item.lineAmount, 115.00);
        assert.equal(item.stripsQty, 2);
        assert.equal(item.looseQty, 3);
        assert.equal(item.totalUnits, 23);
        assert.equal(item.breakdown, '2 strip x 50.00 + 3 loose x 5.00 = 115.00');
    });

    await t.test('calculateLineItem: auto-normalizes loose overflow (1 strip + 15 loose -> 2 strip + 5 loose)', () => {
        const item = calculateLineItem({
            strips: 1,
            loose: 15,
            unitsPerStrip: 10,
            sellingPrice: 50
        });
        assert.equal(item.stripsQty, 2);
        assert.equal(item.looseQty, 5);
        assert.equal(item.totalUnits, 25);
        assert.equal(item.lineAmount, 125.00);
        assert.equal(item.breakdown, '2 strip x 50.00 + 5 loose x 5.00 = 125.00');
    });

    await t.test('calculateLineItem: non-strip items (syrups/bottles/tubes) use qty * price', () => {
        const syrup = calculateLineItem({
            qty: 1,
            unitsPerStrip: 1,
            unitType: 'Syrup/Bottle',
            sellingPrice: 120
        });
        assert.equal(syrup.lineAmount, 120.00);
        assert.equal(syrup.breakdown, '1 x 120.00 = 120.00');
        assert.equal(syrup.isSingleUnit, true);

        const tube = calculateLineItem({
            qty: 3,
            unitsPerStrip: 1,
            unitType: 'Tube',
            sellingPrice: 45.50
        });
        assert.equal(tube.lineAmount, 136.50);
        assert.equal(tube.breakdown, '3 x 45.50 = 136.50');
    });

    await t.test('calculateLineItem: missing/invalid unitsPerStrip flags missingUnitsPerStrip and defaults to 1 (never guesses 10)', () => {
        const missingUps = calculateLineItem({
            qty: 5,
            unitsPerStrip: undefined,
            sellingPrice: 20
        });
        assert.equal(missingUps.missingUnitsPerStrip, true);
        assert.equal(missingUps.unitsPerStrip, 1);
        assert.equal(missingUps.lineAmount, 100.00);
        assert.equal(missingUps.breakdown, '5 x 20.00 = 100.00');

        const zeroUps = calculateLineItem({
            qty: 2,
            unitsPerStrip: 0,
            sellingPrice: 15
        });
        assert.equal(zeroUps.missingUnitsPerStrip, true);
        assert.equal(zeroUps.unitsPerStrip, 1);
        assert.equal(zeroUps.lineAmount, 30.00);
    });

    await t.test('calculateLineItem: avoids floating point drift on non-divisible pack sizes', () => {
        // Strip price 100, pack of 3 -> exactly 3 loose is 1 strip = 100.00 (not 99.99)
        const item = calculateLineItem({
            strips: 0,
            loose: 3,
            unitsPerStrip: 3,
            sellingPrice: 100
        });
        assert.equal(item.lineAmount, 100.00);
        assert.equal(item.stripsQty, 1);
        assert.equal(item.looseQty, 0);
    });

    await t.test('bill total calculation: exact sum of line amounts, discount, tax, round off, no extra charges', () => {
        // Line 1: Pure strip 2 x 50.00 = 100.00
        const l1 = calculateLineItem({ strips: 2, unitsPerStrip: 10, sellingPrice: 50 });
        // Line 2: Mixed 1 strip + 3 loose (strip price 100, ups 10) = 100 + 30 = 130.00
        const l2 = calculateLineItem({ strips: 1, loose: 3, unitsPerStrip: 10, sellingPrice: 100 });
        // Line 3: Syrup 1 x 120.00 = 120.00
        const l3 = calculateLineItem({ qty: 1, unitType: 'Syrup/Bottle', sellingPrice: 120 });

        const subtotal = +(l1.lineAmount + l2.lineAmount + l3.lineAmount).toFixed(2);
        assert.equal(subtotal, 350.00);

        const discountPct = 10;
        const discountAmt = +(subtotal * discountPct / 100).toFixed(2);
        assert.equal(discountAmt, 35.00);

        const taxableBase = +(subtotal - discountAmt).toFixed(2);
        assert.equal(taxableBase, 315.00);

        const taxPct = 5;
        const taxAmt = +(taxableBase * taxPct / 100).toFixed(2);
        assert.equal(taxAmt, 15.75);

        const beforeRound = +(taxableBase + taxAmt).toFixed(2);
        assert.equal(beforeRound, 330.75);

        const rounded = Math.round(beforeRound);
        assert.equal(rounded, 331);
        const roundOff = +(rounded - beforeRound).toFixed(2);
        assert.equal(roundOff, 0.25);

        // Verify grand total equals exact formula with no extra fees
        const finalGrandTotal = +(taxableBase + taxAmt + roundOff).toFixed(2);
        assert.equal(finalGrandTotal, 331.00);
    });

});
