const { pool } = require('../config/db');
const { resolveStoreSettings } = require('../config/store');

exports.getStoreSettings = async (req, res) => {
    try {
        const store = await resolveStoreSettings(pool, req.adminId);
        res.json(store);
    } catch (error) {
        console.error('Failed to fetch store settings:', error.message);
        res.status(500).json({ error: 'Failed to fetch store settings' });
    }
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;

exports.updateStoreSettings = async (req, res) => {
    try {
        const adminId = req.adminId || req.user?.id;
        const {
            shop_name,
            address,
            phone,
            email,
            dl_no,
            gstin,
            pharmacist_name,
            pharmacist_reg_no,
            pan_no,
            aadhar_no,
            food_lic_no
        } = req.body;

        // Validation
        if (!shop_name || !shop_name.trim()) {
            return res.status(400).json({ error: 'Pharmacy / Store Name is required' });
        }

        if (!address || !address.trim()) {
            return res.status(400).json({ error: 'Complete Address is required' });
        }

        const trimmedPhone = phone ? String(phone).trim() : '';
        if (!trimmedPhone || !PHONE_REGEX.test(trimmedPhone)) {
            return res.status(400).json({ error: 'Mobile / Phone Number must be a valid 10-digit number' });
        }

        if (!dl_no || !dl_no.trim()) {
            return res.status(400).json({ error: 'Drug Licence Number is required' });
        }

        const trimmedEmail = email ? String(email).trim() : '';
        if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
            return res.status(400).json({ error: 'Invalid email address format' });
        }

        const trimmedGstin = gstin ? String(gstin).trim().toUpperCase() : '';
        if (trimmedGstin && !GSTIN_REGEX.test(trimmedGstin)) {
            return res.status(400).json({ error: 'Invalid GSTIN format (must be 15 alphanumeric characters)' });
        }

        const updatedBy = req.user?.id || adminId;

        const cleanShopName = shop_name.trim();
        const cleanAddress = address.trim();
        const cleanDlNo = dl_no.trim();
        const cleanPharmacistName = pharmacist_name ? pharmacist_name.trim() : '';
        const cleanPharmacistRegNo = pharmacist_reg_no ? pharmacist_reg_no.trim() : '';
        const cleanPan = pan_no ? pan_no.trim() : '';
        const cleanAadhar = aadhar_no ? aadhar_no.trim() : '';
        const cleanFoodLic = food_lic_no ? food_lic_no.trim() : '';

        // Check if row already exists for this admin
        let existingRes;
        if (adminId) {
            existingRes = await pool.query('SELECT id FROM STORE_SETTINGS WHERE admin_id = $1 LIMIT 1', [adminId]);
        }

        let savedRow;
        if (existingRes && existingRes.rows.length > 0) {
            const updateRes = await pool.query(`
                UPDATE STORE_SETTINGS SET
                    shop_name = $1,
                    address = $2,
                    phone = $3,
                    email = $4,
                    dl_no = $5,
                    gstin = $6,
                    pharmacist_name = $7,
                    pharmacist_reg_no = $8,
                    pan_no = $9,
                    aadhar_no = $10,
                    food_lic_no = $11,
                    updated_by = $12,
                    updated_at = NOW()
                WHERE admin_id = $13
                RETURNING *
            `, [
                cleanShopName,
                cleanAddress,
                trimmedPhone,
                trimmedEmail,
                cleanDlNo,
                trimmedGstin,
                cleanPharmacistName,
                cleanPharmacistRegNo,
                cleanPan,
                cleanAadhar,
                cleanFoodLic,
                updatedBy,
                adminId
            ]);
            savedRow = updateRes.rows[0];
        } else {
            const insertRes = await pool.query(`
                INSERT INTO STORE_SETTINGS (
                    admin_id,
                    shop_name,
                    address,
                    phone,
                    email,
                    dl_no,
                    gstin,
                    pharmacist_name,
                    pharmacist_reg_no,
                    pan_no,
                    aadhar_no,
                    food_lic_no,
                    updated_by,
                    updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
                RETURNING *
            `, [
                adminId,
                cleanShopName,
                cleanAddress,
                trimmedPhone,
                trimmedEmail,
                cleanDlNo,
                trimmedGstin,
                cleanPharmacistName,
                cleanPharmacistRegNo,
                cleanPan,
                cleanAadhar,
                cleanFoodLic,
                updatedBy
            ]);
            savedRow = insertRes.rows[0];
        }

        return res.status(200).json({
            message: 'Store details updated successfully',
            ...savedRow,
            store: savedRow
        });
    } catch (error) {
        console.error('Failed to update store settings:', error.message);
        res.status(500).json({ error: 'Failed to update store settings' });
    }
};

