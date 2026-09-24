function storeFromEnv() {
    return {
        shop_name: process.env.SHOP_NAME || '',
        address: process.env.SHOP_ADDRESS || '',
        dl_no: process.env.SHOP_DL_NO || '',
        pan_no: process.env.SHOP_PAN || '',
        aadhar_no: process.env.SHOP_AADHAR || '',
        food_lic_no: process.env.SHOP_FOOD_LIC || '',
        phone: process.env.SHOP_PHONE || '',
        email: process.env.SHOP_EMAIL || '',
        gstin: process.env.SHOP_GSTIN || '',
        pharmacist_name: process.env.SHOP_PHARMACIST_NAME || '',
        pharmacist_reg_no: process.env.SHOP_PHARMACIST_REG_NO || '',
    };
}

async function resolveStoreSettings(pool, adminId) {
    const fromEnv = storeFromEnv();
    try {
        let storeRes;
        if (adminId) {
            storeRes = await pool.query('SELECT * FROM STORE_SETTINGS WHERE admin_id = $1 ORDER BY id DESC LIMIT 1', [adminId]);
        }
        if (!storeRes || storeRes.rows.length === 0) {
            storeRes = await pool.query('SELECT * FROM STORE_SETTINGS ORDER BY id DESC LIMIT 1');
        }
        let active = (storeRes && storeRes.rows.length > 0) ? { ...storeRes.rows[0] } : {};
        if (!active.phone || !active.gstin) {
            const fallbackRes = await pool.query(
                "SELECT * FROM STORE_SETTINGS WHERE (phone IS NOT NULL AND phone != '') OR (gstin IS NOT NULL AND gstin != '') ORDER BY id DESC LIMIT 1"
            );
            if (fallbackRes.rows.length > 0) {
                const fb = fallbackRes.rows[0];
                active = {
                    ...active,
                    phone: active.phone || fb.phone || '',
                    gstin: active.gstin || fb.gstin || '',
                    email: active.email || fb.email || '',
                    pan_no: active.pan_no || fb.pan_no || '',
                    aadhar_no: active.aadhar_no || fb.aadhar_no || '',
                    food_lic_no: active.food_lic_no || fb.food_lic_no || '',
                    pharmacist_name: active.pharmacist_name || fb.pharmacist_name || '',
                    pharmacist_reg_no: active.pharmacist_reg_no || fb.pharmacist_reg_no || ''
                };
            }
        }
        if (Object.keys(active).length > 0) {
            return { ...fromEnv, ...active };
        }
    } catch (e) {
        console.warn('STORE_SETTINGS unavailable, using env shop profile:', e.message);
    }
    return fromEnv;
}

module.exports = { storeFromEnv, resolveStoreSettings };
