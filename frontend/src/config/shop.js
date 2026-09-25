export function getShopProfile() {
    return {
        name: import.meta.env.VITE_SHOP_NAME || '',
        address: import.meta.env.VITE_SHOP_ADDRESS || '',
        gstin: import.meta.env.VITE_SHOP_GSTIN || '',
        phone: import.meta.env.VITE_SHOP_PHONE || '',
        dl_no: import.meta.env.VITE_SHOP_DL_NO || '',
        pan_no: import.meta.env.VITE_SHOP_PAN || '',
        aadhar_no: import.meta.env.VITE_SHOP_AADHAR || '',
        food_lic_no: import.meta.env.VITE_SHOP_FOOD_LIC || '',
        email: import.meta.env.VITE_SHOP_EMAIL || '',
        pharmacist_name: import.meta.env.VITE_SHOP_PHARMACIST_NAME || '',
        pharmacist_reg_no: import.meta.env.VITE_SHOP_PHARMACIST_REG_NO || '',
    };
}

export function mapStoreResponse(store = {}) {
    const defaultProfile = getShopProfile();
    return {
        name: store.shop_name || store.name || defaultProfile.name || '',
        address: store.address || defaultProfile.address || '',
        gstin: store.gstin || defaultProfile.gstin || '',
        phone: store.phone || defaultProfile.phone || '',
        dl_no: store.dl_no || store.drug_licence_no || defaultProfile.dl_no || '',
        pan_no: store.pan_no || defaultProfile.pan_no || '',
        aadhar_no: store.aadhar_no || defaultProfile.aadhar_no || '',
        food_lic_no: store.food_lic_no || defaultProfile.food_lic_no || '',
        email: store.email || defaultProfile.email || '',
        pharmacist_name: store.pharmacist_name || defaultProfile.pharmacist_name || '',
        pharmacist_reg_no: store.pharmacist_reg_no || defaultProfile.pharmacist_reg_no || '',
    };
}

export const APP_BRAND = import.meta.env.VITE_SHOP_SHORT_NAME || import.meta.env.VITE_SHOP_NAME || 'Pharma';
