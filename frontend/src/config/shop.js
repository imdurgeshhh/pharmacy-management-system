export function getShopProfile() {
    return {
        name: import.meta.env.VITE_SHOP_NAME || 'Pharma Care',
        address: import.meta.env.VITE_SHOP_ADDRESS || '',
        gstin: import.meta.env.VITE_SHOP_GSTIN || '',
        phone: import.meta.env.VITE_SHOP_PHONE || '',
        dl_no: import.meta.env.VITE_SHOP_DL_NO || 'DL-PHARMA-001',
        email: import.meta.env.VITE_SHOP_EMAIL || '',
        pharmacist_name: import.meta.env.VITE_SHOP_PHARMACIST_NAME || '',
        pharmacist_reg_no: import.meta.env.VITE_SHOP_PHARMACIST_REG_NO || '',
    };
}

export function mapStoreResponse(store = {}) {
    const defaultProfile = getShopProfile();
    return {
        name: store.shop_name || store.name || defaultProfile.name,
        address: store.address || defaultProfile.address,
        gstin: store.gstin || defaultProfile.gstin,
        phone: store.phone || defaultProfile.phone,
        dl_no: store.dl_no || store.drug_licence_no || defaultProfile.dl_no,
        email: store.email || defaultProfile.email,
        pharmacist_name: store.pharmacist_name || defaultProfile.pharmacist_name,
        pharmacist_reg_no: store.pharmacist_reg_no || defaultProfile.pharmacist_reg_no,
    };
}

export const APP_BRAND = import.meta.env.VITE_SHOP_SHORT_NAME || import.meta.env.VITE_SHOP_NAME || 'Pharma';
