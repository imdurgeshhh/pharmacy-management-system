import { http, HttpResponse } from 'msw';

export const API_BASE = 'http://localhost:5000/api';

export const mockInventoryData = [
  {
    id: 1,
    name: 'Paracetamol 500mg',
    mrp: 25.0,
    total_stock: 120,
    tax_percentage: 12,
    units_per_strip: 10,
    batch_number: 'BATCH-001',
    expiry_date: '2026-12-31',
  },
  {
    id: 2,
    name: 'Amoxicillin 250mg',
    mrp: 45.0,
    total_stock: 50,
    tax_percentage: 12,
    units_per_strip: 1,
    batch_number: 'BATCH-002',
    expiry_date: '2026-10-31',
  },
  {
    id: 3,
    name: 'Cetirizine 10mg',
    mrp: 18.0,
    total_stock: 0, // out of stock edge case
    tax_percentage: 5,
    batch_number: 'BATCH-003',
    expiry_date: '2025-08-15',
  },
];

export const mockSuppliersData = [
  {
    id: 1,
    name: 'Apex Pharma Distributors',
    contact_person: 'Rajesh Sharma',
    phone: '+91 98765 43210',
    email: 'rajesh@apexpharma.com',
    address: '42 Industrial Area, Phase 1',
  },
  {
    id: 2,
    name: 'MediSupply Global',
    contact_person: 'Sunita Patel',
    phone: '+91 91234 56789',
    email: 'sunita@medisupply.in',
    address: '109 Ring Road, Sector 4',
  },
];

export const mockWholesalePurchasesData = [
  {
    id: 1,
    medicine_name: 'Paracetamol 500mg',
    quantity: 200,
    price_per_unit: 12.5,
    total_amount: 2500,
    gst_number: '27AABCU9603R1ZM',
    supplier_name: 'Apex Pharma Distributors',
    purchase_date: '2026-03-12',
  },
];

export const mockSalesData = [
  {
    id: 1001,
    customer_name: 'Walk-in',
    total_amount: 345,
    tax_amount: 41.4,
    invoice_no: 'SM001001',
    payment_mode: 'Cash',
    created_at: '2026-03-14T10:00:00.000Z',
  },
];

export const mockDashboardStats = {
  todaySales: 0,
  monthSales: 0,
  inventoryValue: 0,
  lowStockItems: 0,
};

export const mockWholesaleSalesData = [
  {
    id: 1,
    medicine_name: 'Paracetamol 500mg',
    quantity: 100,
    price_per_unit: 18.5,
    total_amount: 1850,
    gst_number: '29AAAAA0000A1Z5',
    shopkeeper_name: 'City Care Chemist',
    sale_date: '2026-03-01',
  },
];

export const mockEmployeesData = [
  {
    id: 1,
    full_name: 'Amit Verma',
    qualification: 'B.Pharm',
    mobile_no: '9876543210',
    email: 'amit@pharmacy.com',
    role: 'employee',
  },
];

export const handlers = [
  // Auth sync
  http.post(`${API_BASE}/auth/clerk-sync`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      user: {
        id: 10,
        name: body.full_name || 'Test User',
        email: body.email,
        username: body.username,
        role: 'shopkeeper',
        token: 'mock-jwt-token-12345',
      },
    });
  }),

  // Inventory
  http.get(`${API_BASE}/inventory`, () => {
    return HttpResponse.json(mockInventoryData);
  }),

  http.post(`${API_BASE}/inventory`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body }, { status: 201 });
  }),

  http.delete(`${API_BASE}/inventory/:id`, ({ params }) => {
    return HttpResponse.json({ success: true, id: params.id });
  }),

  // Suppliers
  http.get(`${API_BASE}/suppliers`, () => {
    return HttpResponse.json(mockSuppliersData);
  }),

  http.post(`${API_BASE}/suppliers`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body }, { status: 201 });
  }),

  http.delete(`${API_BASE}/suppliers/:id`, ({ params }) => {
    return HttpResponse.json({ success: true, id: params.id });
  }),

  // Wholesale Sales
  http.get(`${API_BASE}/wholesale/sales`, () => {
    return HttpResponse.json(mockWholesaleSalesData);
  }),

  http.post(`${API_BASE}/wholesale/sales`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body }, { status: 201 });
  }),

  http.delete(`${API_BASE}/wholesale/sales/:id`, ({ params }) => {
    return HttpResponse.json({ success: true, id: params.id });
  }),

  http.get(`${API_BASE}/wholesale/purchases`, () => {
    return HttpResponse.json(mockWholesalePurchasesData);
  }),

  http.get(`${API_BASE}/sales`, () => {
    return HttpResponse.json(mockSalesData);
  }),

  http.get(`${API_BASE}/reports/dashboard`, () => {
    return HttpResponse.json(mockDashboardStats);
  }),

  http.get(`${API_BASE}/reports/sales`, () => {
    return HttpResponse.json([]);
  }),

  http.get(`${API_BASE}/inventory/alerts`, () => {
    return HttpResponse.json([]);
  }),

  http.get(`${API_BASE}/store`, () => {
    return HttpResponse.json({
      shop_name: 'Pharma Care',
      address: '123 Main Street',
      gstin: '22AAAAA0000A1Z5',
      phone: '9876543210',
      dl_no: 'DL-2025-001',
      email: 'contact@pharmacare.local',
      pharmacist_name: 'John Doe',
      pharmacist_reg_no: 'REG-12345',
    });
  }),

  // POS Sales
  http.post(`${API_BASE}/sales`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      sale_id: 101,
      bill_no: body.bill_no || 'BILL-1001',
      total: body.total || 0,
    });
  }),

  // Purchases
  http.post(`${API_BASE}/purchases`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      purchase_id: 201,
      items_count: body.items?.length || 0,
    });
  }),

  // Employees
  http.get(`${API_BASE}/employees`, () => {
    return HttpResponse.json(mockEmployeesData);
  }),
];
