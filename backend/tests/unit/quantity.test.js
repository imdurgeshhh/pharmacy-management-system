'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    toTotalUnits,
    fromTotalUnits,
    normalizeQty,
    pricePerUnit,
    lineAmount,
    formatQty
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

});
