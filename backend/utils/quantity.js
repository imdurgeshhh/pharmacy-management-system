'use strict';

/**
 * Quantity and Pricing calculation utilities for Strip + Loose Tablet billing.
 *
 * Business Rules:
 * 1. Every medicine has a pack size (units_per_strip >= 1).
 * 2. total_units = (strips * units_per_strip) + loose.
 * 3. Loose tablets >= units_per_strip auto-normalizes into extra strips + remaining loose.
 * 4. Medicines with units_per_strip = 1 have no loose units.
 * 5. price_per_unit = strip_price / units_per_strip.
 *    line_amount = total_units * price_per_unit (rounded to 2 decimal places).
 * 6. Stock is stored and deducted strictly in base units (tablets).
 */

/**
 * Calculates total integer units from strips and loose tablets.
 */
function toTotalUnits({ strips = 0, loose = 0, unitsPerStrip = 1 } = {}) {
    const ups = Math.max(1, parseInt(unitsPerStrip, 10) || 1);
    const s = Math.max(0, parseInt(strips, 10) || 0);
    const l = Math.max(0, parseInt(loose, 10) || 0);
    if (ups <= 1) {
        return s + l;
    }
    return (s * ups) + l;
}

/**
 * Decomposes total units into normalized strips and loose tablets.
 */
function fromTotalUnits(totalUnits = 0, unitsPerStrip = 1) {
    const ups = Math.max(1, parseInt(unitsPerStrip, 10) || 1);
    const total = Math.max(0, parseInt(totalUnits, 10) || 0);

    if (ups <= 1) {
        return { strips: 0, loose: total, totalUnits: total, unitsPerStrip: 1 };
    }

    const strips = Math.floor(total / ups);
    const loose = total % ups;
    return { strips, loose, totalUnits: total, unitsPerStrip: ups };
}

/**
 * Normalizes strips and loose quantities.
 * If loose >= units_per_strip, extra loose tablets are converted into strips.
 */
function normalizeQty({ strips = 0, loose = 0, unitsPerStrip = 1 } = {}) {
    const ups = Math.max(1, parseInt(unitsPerStrip, 10) || 1);
    const s = Math.max(0, parseInt(strips, 10) || 0);
    const l = Math.max(0, parseInt(loose, 10) || 0);

    if (ups <= 1) {
        const total = s + l;
        return { strips: 0, loose: total, totalUnits: total, unitsPerStrip: 1 };
    }

    const total = (s * ups) + l;
    const normStrips = Math.floor(total / ups);
    const normLoose = total % ups;
    return {
        strips: normStrips,
        loose: normLoose,
        totalUnits: total,
        unitsPerStrip: ups
    };
}

/**
 * Computes price per unit (single tablet).
 */
function pricePerUnit(stripPrice = 0, unitsPerStrip = 1) {
    const ups = Math.max(1, parseInt(unitsPerStrip, 10) || 1);
    const price = Math.max(0, parseFloat(stripPrice) || 0);
    return price / ups;
}

/**
 * Computes line amount for given total units and strip price, rounded to 2 decimal places.
 */
function lineAmount(totalUnits = 0, stripPrice = 0, unitsPerStrip = 1) {
    const units = Math.max(0, parseInt(totalUnits, 10) || 0);
    const unitPrice = pricePerUnit(stripPrice, unitsPerStrip);
    return Math.round(units * unitPrice * 100) / 100;
}

/**
 * Formats quantity for display in UI, invoices, and reports.
 * E.g., "1 Strip + 10 Tab (30 tab)" or "2 Strip (40 tab)" or "5 Tab".
 */
function formatQty(totalUnits = 0, unitsPerStrip = 1) {
    const ups = Math.max(1, parseInt(unitsPerStrip, 10) || 1);
    const total = Math.max(0, parseInt(totalUnits, 10) || 0);

    if (ups <= 1) {
        return `${total} Units`;
    }

    const { strips, loose } = fromTotalUnits(total, ups);
    if (strips > 0 && loose > 0) {
        return `${strips} Strip + ${loose} Tab (${total} tab)`;
    }
    if (strips > 0) {
        return `${strips} Strip (${total} tab)`;
    }
    return `${loose} Tab`;
}

module.exports = {
    toTotalUnits,
    fromTotalUnits,
    normalizeQty,
    pricePerUnit,
    lineAmount,
    formatQty
};
