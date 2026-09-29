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
 * E.g., "1 Strip + 10 Tab (30 tab)", "2 Strip (40 tab)", "5 Tab", "1 Bottle", "2 Tube".
 *
 * When unit_type is 'Syrup/Bottle', 'Bottle', or 'Syrup', returns e.g. "1 Bottle".
 */
function formatQty(totalUnits = 0, unitsPerStrip = 1, unitType = 'Strip') {
    let ups = unitsPerStrip;
    let ut = unitType;

    if (typeof unitsPerStrip === 'object' && unitsPerStrip !== null) {
        ut = unitsPerStrip.unit_type ||
             unitsPerStrip.unitType ||
             unitsPerStrip.dosage_form ||
             unitsPerStrip.dosageForm ||
             unitsPerStrip.category ||
             unitsPerStrip.medicine_category ||
             (typeof unitsPerStrip.name === 'string' && /syrup|suspension|drops/i.test(unitsPerStrip.name) ? 'Syrup/Bottle' : null) ||
             unitType;
        ups = unitsPerStrip.units_per_strip || unitsPerStrip.unitsPerStrip || 1;
    }

    ups = Math.max(1, parseInt(ups, 10) || 1);
    const total = Math.max(0, parseInt(totalUnits, 10) || 0);
    const normalizedUnitType = (ut || '').toString().trim().toLowerCase();

    if (
        normalizedUnitType === 'syrup/bottle' ||
        normalizedUnitType === 'bottle' ||
        normalizedUnitType === 'syrup' ||
        normalizedUnitType.includes('syrup') ||
        normalizedUnitType.includes('bottle')
    ) {
        return `${total} Bottle`;
    }
    if (normalizedUnitType === 'tube' || normalizedUnitType.includes('tube')) {
        return `${total} Tube`;
    }
    if (normalizedUnitType === 'piece' || normalizedUnitType.includes('piece')) {
        return `${total} Piece`;
    }

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

/**
 * Formats an expiry date string or Date object into standard 'MM/YY' format.
 * Handles ISO strings (2027-09-15T...), YYYY-MM-DD, MM/YY, MM/YYYY, Date objects.
 * Returns '--/--' for null, undefined, or invalid dates.
 */
function formatExpiryDate(raw) {
    if (!raw) return '--/--';
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed || trimmed === '--/--' || trimmed === 'N/A') return '--/--';
        if (/^\d{2}\/\d{2}$/.test(trimmed)) return trimmed;
        if (/^\d{2}\/\d{4}$/.test(trimmed)) {
            return `${trimmed.slice(0, 2)}/${trimmed.slice(-2)}`;
        }
        if (trimmed.includes('-')) {
            const datePart = trimmed.split('T')[0];
            const parts = datePart.split('-');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    // YYYY-MM-DD
                    return `${parts[1].padStart(2, '0')}/${parts[0].slice(-2)}`;
                } else if (parts[2].length === 4) {
                    // DD-MM-YYYY
                    return `${parts[1].padStart(2, '0')}/${parts[2].slice(-2)}`;
                }
            }
        }
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
        return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`;
    }
    return '--/--';
}

module.exports = {
    toTotalUnits,
    fromTotalUnits,
    normalizeQty,
    pricePerUnit,
    lineAmount,
    formatQty,
    formatExpiryDate
};
