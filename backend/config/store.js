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
        } else {
            storeRes = await pool.query('SELECT * FROM STORE_SETTINGS ORDER BY id DESC LIMIT 1');
        }

        if (storeRes && storeRes.rows.length > 0) {
            const active = storeRes.rows[0];
            return {
                shop_name: active.shop_name || fromEnv.shop_name || '',
                address: active.address || fromEnv.address || '',
                dl_no: active.dl_no || fromEnv.dl_no || '',
                pan_no: active.pan_no || fromEnv.pan_no || '',
                aadhar_no: active.aadhar_no || fromEnv.aadhar_no || '',
                food_lic_no: active.food_lic_no || fromEnv.food_lic_no || '',
                phone: active.phone || fromEnv.phone || '',
                email: active.email || fromEnv.email || '',
                gstin: active.gstin || fromEnv.gstin || '',
                pharmacist_name: active.pharmacist_name || fromEnv.pharmacist_name || '',
                pharmacist_reg_no: active.pharmacist_reg_no || fromEnv.pharmacist_reg_no || '',
            };
        }
    } catch (e) {
        console.warn('STORE_SETTINGS unavailable, using env shop profile:', e.message);
    }
    return fromEnv;
}

module.exports = { storeFromEnv, resolveStoreSettings };
