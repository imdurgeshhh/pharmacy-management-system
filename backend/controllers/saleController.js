const { pool } = require('../config/db');
const generateInvoice = require('../utils/invoiceGenerator');
const { resolveStoreSettings } = require('../config/store');

exports.generateInvoicePDF = async (req, res) => {
    const { saleId } = req.params;
    const adminId = req.adminId;
    
    try {
        // 1. Get sale details with customer and employee info — IDOR protected by admin_id
        const saleQuery = `
            SELECT s.*, 
                   c.name as customer_name, c.phone as customer_phone, c.credit_balance as customer_balance,
                   COALESCE(e.name, e.username, 'Admin') as employee_name, e.employee_id as employee_code
            FROM SALES s
            LEFT JOIN CUSTOMERS c ON s.customer_id = c.id
            LEFT JOIN EMPLOYEES e ON s.employee_id = e.id
            WHERE s.id = $1 AND s.admin_id = $2
        `;
        const saleResult = await pool.query(saleQuery, [saleId, adminId]);
        
        if (saleResult.rows.length === 0) {
            return res.status(404).json({ error: 'Sale not found' });
        }
        
        const sale = saleResult.rows[0];
        
        // 2. Get sale items with inventory and medicine details
        const itemsQuery = `
            SELECT si.*, 
                   COALESCE(m.name, m.medicine_name, 'Medicine') as name,
                   COALESCE(si.hsn_code, m.hsn_code, '3004') as hsn_code,
                   COALESCE(si.pack, m.pack_size, '1') as pack,
                   i.batch_number, i.expiry_date,
                   COALESCE(si.old_mrp, i.old_mrp, 0.00) as old_mrp,
                   COALESCE(si.trade_rate, i.trade_rate, i.purchase_price, si.price) as trade_rate,
                   COALESCE(i.mrp, si.price) as mrp
            FROM SALE_ITEMS si
            LEFT JOIN INVENTORY i ON si.inventory_id = i.id
            LEFT JOIN MEDICINES m ON i.medicine_id = m.id
            WHERE si.sale_id = $1
            ORDER BY si.id ASC
        `;
        const itemsResult = await pool.query(itemsQuery, [saleId]);
        
        const store = await resolveStoreSettings(pool);

        const createdAt = sale.created_at ? new Date(sale.created_at) : new Date();
        const dateStr = createdAt.toLocaleDateString('en-GB'); // DD/MM/YYYY
        const timeStr = createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        
        const invoiceData = {
            title: 'ESTIMATE ORDER',
            subTitle: 'ROUGH ESTIMATE',
            paymentMode: (sale.payment_mode || 'Credit').toUpperCase(),
            invoiceNo: sale.invoice_no || `SM${sale.id.toString().padStart(6, '0')}`,
            date: dateStr,
            time: timeStr,
            customerName: sale.customer_name || 'Walk-in Customer',
            customerPhone: sale.customer_phone || '',
            doctorName: sale.doctor_name || '',
            rxNo: sale.rx_number || '',
            employeeCode: sale.employee_code || '',
            employeeName: sale.employee_name || 'Admin',
            items: itemsResult.rows.map((item, index) => {
                const qty = parseFloat(item.qty) || 1;
                const freeQty = parseInt(item.free_qty, 10) || 0;
                const mrp = parseFloat(item.mrp) || 0;
                const tradeRate = parseFloat(item.trade_rate) || mrp;
                const schemePct = parseFloat(item.scheme_pct) || 0;
                const discountPct = parseFloat(item.discount_pct) || 0;
                const taxPct = parseFloat(item.tax) || 0;
                
                const expDate = item.expiry_date ? new Date(item.expiry_date) : null;
                const expStr = expDate ? `${(expDate.getMonth() + 1).toString().padStart(2, '0')}/${expDate.getFullYear().toString().slice(-2)}` : '--/--';

                const netRate = parseFloat(item.net_rate) || (tradeRate * (1 - schemePct / 100) * (1 - discountPct / 100));
                const total = parseFloat(item.net_total) || (netRate * qty);

                return {
                    srNo: index + 1,
                    medicineName: item.name,
                    pack: item.pack || '1',
                    hsnCode: item.hsn_code || '3004',
                    batchNo: item.batch_number || 'N/A',
                    expDate: expStr,
                    qty: qty,
                    freeQty: freeQty,
                    oldMrp: parseFloat(item.old_mrp) || 0,
                    mrp: mrp,
                    tradeRate: tradeRate,
                    schemePct: schemePct,
                    discountPct: discountPct,
                    gstPct: taxPct,
                    netRate: netRate,
                    total: total
                };
            }),
            summary: {
                totalItems: itemsResult.rows.length,
                subTotal: parseFloat(sale.sub_total || sale.total_amount),
                discountAmount: parseFloat(sale.discount_amount || 0),
                schemeAmount: parseFloat(sale.scheme_amount || 0),
                crDrAmount: parseFloat(sale.cr_dr_amount || 0),
                freightAmount: parseFloat(sale.freight_amount || 0),
                taxAmount: parseFloat(sale.tax_amount || 0),
                roundOff: parseFloat(sale.round_off || 0),
                grandTotal: parseFloat(sale.total_amount),
                balance: parseFloat(sale.customer_balance || 0),
            },
            store: store
        };

        generateInvoice(invoiceData, res);

    } catch (error) {
        console.error('Invoice PDF error:', error);
        res.status(500).json({ error: 'Failed to generate invoice PDF' });
    }
};

exports.previewInvoicePDF = async (req, res) => {
    try {
        const {
            customer_name, customer_phone, doctor_name, rx_number,
            payment_mode, items = [], total_amount = 0, tax_amount = 0,
            discount_amount = 0, scheme_amount = 0, cr_dr_amount = 0,
            freight_amount = 0, round_off = 0, sub_total = 0
        } = req.body;

        const store = await resolveStoreSettings(pool);
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB');
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

        const invoiceData = {
            title: 'ESTIMATE ORDER',
            subTitle: 'ROUGH ESTIMATE',
            paymentMode: (payment_mode || 'Cash').toUpperCase(),
            invoiceNo: `PREV-${Date.now().toString().slice(-6)}`,
            date: dateStr,
            time: timeStr,
            customerName: customer_name || 'Walk-in Customer',
            customerPhone: customer_phone || '',
            doctorName: doctor_name || '',
            rxNo: rx_number || '',
            employeeCode: 'PREV',
            employeeName: req.user?.name || 'Staff',
            items: items.map((item, index) => {
                const qty = parseFloat(item.qty) || 1;
                const freeQty = parseInt(item.free_qty, 10) || 0;
                const mrp = parseFloat(item.mrp || item.price) || 0;
                const tradeRate = parseFloat(item.trade_rate) || mrp;
                const schemePct = parseFloat(item.scheme_pct) || 0;
                const discountPct = parseFloat(item.discount_pct) || 0;
                const taxPct = parseFloat(item.tax) || 0;

                const netRate = tradeRate * (1 - schemePct / 100) * (1 - discountPct / 100);
                const total = netRate * qty;

                return {
                    srNo: index + 1,
                    medicineName: item.name || item.medicine_name || 'Medicine',
                    pack: item.pack || '1',
                    hsnCode: item.hsn_code || '3004',
                    batchNo: item.batch_number || 'N/A',
                    expDate: item.expiry_date || '--/--',
                    qty: qty,
                    freeQty: freeQty,
                    oldMrp: parseFloat(item.old_mrp) || 0,
                    mrp: mrp,
                    tradeRate: tradeRate,
                    schemePct: schemePct,
                    discountPct: discountPct,
                    gstPct: taxPct,
                    netRate: netRate,
                    total: total
                };
            }),
            summary: {
                totalItems: items.length,
                subTotal: parseFloat(sub_total || total_amount),
                discountAmount: parseFloat(discount_amount || 0),
                schemeAmount: parseFloat(scheme_amount || 0),
                crDrAmount: parseFloat(cr_dr_amount || 0),
                freightAmount: parseFloat(freight_amount || 0),
                taxAmount: parseFloat(tax_amount || 0),
                roundOff: parseFloat(round_off || 0),
                grandTotal: parseFloat(total_amount),
                balance: 0,
            },
            store: store
        };

        generateInvoice(invoiceData, res);
    } catch (error) {
        console.error('Invoice Preview PDF error:', error);
        res.status(500).json({ error: 'Failed to generate preview invoice PDF' });
    }
};

exports.createSale = async (req, res) => {
    const adminId = req.adminId;
    const {
        customer_id, employee_id, total_amount, tax_amount, items,
        customer_name, customer_phone, payment_mode, invoice_no,
        sub_total, discount_amount, scheme_amount, cr_dr_amount,
        freight_amount, round_off, doctor_name, rx_number
    } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'No items in sale' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Resolve or Create Customer (tenant isolated)
        let customerId = customer_id;
        if (customerId) {
            const custOwner = await client.query('SELECT id FROM CUSTOMERS WHERE id = $1 AND admin_id = $2', [customerId, adminId]);
            if (custOwner.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Customer not found in this pharmacy' });
            }
        } else if (!customerId && customer_phone && customer_phone.trim()) {
            const trimmedPhone = customer_phone.trim();
            const trimmedName = (customer_name && customer_name.trim()) ? customer_name.trim() : 'Walk-in Customer';

            // Check if customer with this phone number already exists
            const checkCust = await client.query(
                'SELECT id, name FROM CUSTOMERS WHERE phone = $1 AND admin_id = $2',
                [trimmedPhone, adminId]
            );

            if (checkCust.rows.length > 0) {
                customerId = checkCust.rows[0].id;
                if (trimmedName !== 'Walk-in Customer' && checkCust.rows[0].name !== trimmedName) {
                    await client.query(
                        'UPDATE CUSTOMERS SET name = $1 WHERE id = $2 AND admin_id = $3',
                        [trimmedName, customerId, adminId]
                    );
                }
            } else {
                const newCust = await client.query(
                    `INSERT INTO CUSTOMERS (name, phone, admin_id)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (phone) DO UPDATE SET name = COALESCE(NULLIF(EXCLUDED.name, 'Walk-in Customer'), CUSTOMERS.name)
                     RETURNING id`,
                    [trimmedName, trimmedPhone, adminId]
                );
                customerId = newCust.rows[0].id;
            }
        } else if (!customerId && customer_name && customer_name.trim() && customer_name.trim() !== 'Walk-in Customer') {
            const newCust = await client.query(
                'INSERT INTO CUSTOMERS (name, admin_id) VALUES ($1, $2) RETURNING id',
                [customer_name.trim(), adminId]
            );
            customerId = newCust.rows[0].id;
        }

        const safeEmployeeId = req.user?.id || (employee_id && !isNaN(employee_id) ? parseInt(employee_id, 10) : null);
        const finalPaymentMode = payment_mode || 'Cash';
        const finalTotalAmount = (total_amount !== undefined && total_amount !== null && !isNaN(total_amount))
            ? parseFloat(total_amount)
            : items.reduce((acc, it) => acc + ((parseFloat(it.qty || it.quantity || 1) * parseFloat(it.price || it.unit_price || 0))), 0);
        const finalTaxAmount = parseFloat(tax_amount || 0);
        const finalSubTotal = sub_total !== undefined && sub_total !== null ? sub_total : finalTotalAmount;
        const finalDiscountAmount = discount_amount || 0;
        const finalSchemeAmount = scheme_amount || 0;
        const finalCrDrAmount = cr_dr_amount || 0;
        const finalFreightAmount = freight_amount || 0;
        const finalRoundOff = round_off || 0;

        // Auto-generate invoice number if not provided
        let finalInvoiceNo = invoice_no;
        if (!finalInvoiceNo) {
            const countRes = await client.query('SELECT COUNT(*) FROM SALES WHERE admin_id = $1', [adminId]);
            const nextNum = parseInt(countRes.rows[0].count, 10) + 1;
            finalInvoiceNo = `SM${nextNum.toString().padStart(6, '0')}`;
        }

        // 2. Insert Sale with admin_id
        const saleRes = await client.query(
            `INSERT INTO SALES (
                customer_id, employee_id, total_amount, tax_amount,
                payment_mode, invoice_no, sub_total, discount_amount,
                scheme_amount, cr_dr_amount, freight_amount, round_off,
                doctor_name, rx_number, admin_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id, invoice_no`,
            [
                customerId || null, safeEmployeeId || null, finalTotalAmount, finalTaxAmount,
                finalPaymentMode, finalInvoiceNo, finalSubTotal, finalDiscountAmount,
                finalSchemeAmount, finalCrDrAmount, finalFreightAmount, finalRoundOff,
                doctor_name || null, rx_number || null, adminId
            ]
        );
        const saleId = saleRes.rows[0].id;

        // 3. Insert Sale Items and Deduct Inventory within tenant
        for (const item of items) {
            let invRecord = null;
            const requestedQty = parseFloat(item.qty) || 1;
            const freeQty = parseInt(item.free_qty, 10) || 0;
            const totalStockDeduct = requestedQty + freeQty;
            const itemName = item.name || item.medicine_name || `Item #${item.inventory_id}`;

            // Step A: Find inventory by inventory_id in this tenant
            if (item.inventory_id) {
                const invCheck = await client.query(
                    `SELECT i.id, i.medicine_id, i.stock_qty, i.mrp, i.purchase_price, i.trade_rate, i.old_mrp,
                            COALESCE(m.name, m.medicine_name) as medicine_name, m.hsn_code, m.pack_size
                     FROM INVENTORY i
                     LEFT JOIN MEDICINES m ON i.medicine_id = m.id
                     WHERE i.id = $1 AND i.admin_id = $2`,
                    [item.inventory_id, adminId]
                );
                if (invCheck.rows.length > 0) {
                    invRecord = invCheck.rows[0];
                }
            }

            // Step B: Find by medicine_id in this tenant
            if (!invRecord && item.inventory_id) {
                const medCheck = await client.query(
                    `SELECT i.id, i.medicine_id, i.stock_qty, i.mrp, i.purchase_price, i.trade_rate, i.old_mrp,
                            COALESCE(m.name, m.medicine_name) as medicine_name, m.hsn_code, m.pack_size
                     FROM INVENTORY i
                     JOIN MEDICINES m ON i.medicine_id = m.id
                     WHERE i.medicine_id = $1 AND i.admin_id = $2
                     ORDER BY (i.stock_qty >= $3) DESC, i.expiry_date ASC, i.id ASC
                     LIMIT 1`,
                    [item.inventory_id, adminId, totalStockDeduct]
                );
                if (medCheck.rows.length > 0) {
                    invRecord = medCheck.rows[0];
                }
            }

            // Step C: Find by medicine name in this tenant
            if (!invRecord && (item.name || item.medicine_name)) {
                const searchName = (item.name || item.medicine_name).trim();
                const nameCheck = await client.query(
                    `SELECT i.id, i.medicine_id, i.stock_qty, i.mrp, i.purchase_price, i.trade_rate, i.old_mrp,
                            COALESCE(m.name, m.medicine_name) as medicine_name, m.hsn_code, m.pack_size
                     FROM INVENTORY i
                     JOIN MEDICINES m ON i.medicine_id = m.id
                     WHERE (LOWER(m.name) = LOWER($1) OR LOWER(m.medicine_name) = LOWER($1))
                       AND i.admin_id = $2
                     ORDER BY (i.stock_qty >= $3) DESC, i.expiry_date ASC, i.id ASC
                     LIMIT 1`,
                    [searchName, adminId, totalStockDeduct]
                );
                if (nameCheck.rows.length > 0) {
                    invRecord = nameCheck.rows[0];
                }
            }

            // Step D: Validate stock
            if (!invRecord) {
                const err = new Error(`No inventory stock found for "${itemName}". Please add stock via Purchases or Inventory first.`);
                err.statusCode = 400;
                throw err;
            }

            if (invRecord.stock_qty < totalStockDeduct) {
                const displayName = invRecord.medicine_name || itemName;
                const err = new Error(`Insufficient stock for "${displayName}". Available: ${invRecord.stock_qty}, Requested: ${totalStockDeduct}`);
                err.statusCode = 400;
                throw err;
            }

            // Deduct stock in this tenant
            await client.query('UPDATE INVENTORY SET stock_qty = stock_qty - $1 WHERE id = $2 AND admin_id = $3', [totalStockDeduct, invRecord.id, adminId]);

            const tradeRate = parseFloat(item.trade_rate || invRecord.trade_rate || invRecord.purchase_price || item.price) || 0;
            const schemePct = parseFloat(item.scheme_pct) || 0;
            const discountPct = parseFloat(item.discount_pct) || 0;
            const netRate = parseFloat(item.net_rate) || (tradeRate * (1 - schemePct / 100) * (1 - discountPct / 100));
            const netTotal = parseFloat(item.net_total) || (netRate * requestedQty);
            const itemPrice = parseFloat(item.price || item.unit_price || invRecord.mrp || 0);
            const oldMrp = parseFloat(item.old_mrp || invRecord.old_mrp || 0);

            await client.query(
                `INSERT INTO SALE_ITEMS (
                    sale_id, inventory_id, qty, price, tax, free_qty,
                    trade_rate, scheme_pct, discount_pct, net_rate, net_total,
                    old_mrp, hsn_code, pack
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                [
                    saleId, invRecord.id, requestedQty, itemPrice, parseFloat(item.tax || 0), freeQty,
                    tradeRate, schemePct, discountPct, netRate, netTotal,
                    oldMrp, item.hsn_code || invRecord.hsn_code || '3004', item.pack || invRecord.pack_size || '1'
                ]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({
            message: 'Sale completed successfully',
            saleId,
            invoiceNo: finalInvoiceNo,
            sale: { id: saleId, invoice_no: finalInvoiceNo }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create sale error:', error.message);
        const status = error.statusCode || 500;
        res.status(status).json({ error: error.message || 'Failed to complete sale' });
    } finally {
        client.release();
    }
};

exports.getSales = async (req, res) => {
    try {
        const adminId = req.adminId;
        const query = `
            SELECT s.id, s.total_amount, s.tax_amount, s.created_at, s.invoice_no, s.payment_mode,
                   c.name as customer_name, e.name as employee_name
            FROM SALES s
            LEFT JOIN CUSTOMERS c ON s.customer_id = c.id
            LEFT JOIN EMPLOYEES e ON s.employee_id = e.id
            WHERE s.admin_id = $1
            ORDER BY s.created_at DESC
        `;
        const result = await pool.query(query, [adminId]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch sales' });
    }
};

exports.getSaleById = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.adminId;

        const saleQuery = `
            SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   e.name as employee_name
            FROM SALES s
            LEFT JOIN CUSTOMERS c ON s.customer_id = c.id
            LEFT JOIN EMPLOYEES e ON s.employee_id = e.id
            WHERE s.id = $1 AND s.admin_id = $2
        `;
        const saleResult = await pool.query(saleQuery, [id, adminId]);
        
        if (saleResult.rows.length === 0) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        const itemsQuery = `
            SELECT si.*, m.medicine_name, m.brand_name, i.batch_number, i.expiry_date
            FROM SALE_ITEMS si
            JOIN INVENTORY i ON si.inventory_id = i.id
            JOIN MEDICINES m ON i.medicine_id = m.id
            WHERE si.sale_id = $1
        `;
        const itemsResult = await pool.query(itemsQuery, [id]);

        res.json({
            ...saleResult.rows[0],
            items: itemsResult.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch sale' });
    }
};

exports.updateSale = async (req, res) => {
    const { id } = req.params;
    const adminId = req.adminId;
    const { customer_id, employee_id, total_amount, tax_amount } = req.body;
    
    try {
        const result = await pool.query(
            'UPDATE SALES SET customer_id = $1, employee_id = $2, total_amount = $3, tax_amount = $4 WHERE id = $5 AND admin_id = $6 RETURNING *',
            [customer_id, employee_id, total_amount, tax_amount, id, adminId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sale not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update sale' });
    }
};

exports.deleteSale = async (req, res) => {
    const { id } = req.params;
    const adminId = req.adminId;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // IDOR check: must belong to authenticated tenant
        const check = await client.query('SELECT * FROM SALES WHERE id = $1 AND admin_id = $2', [id, adminId]);
        if (check.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Sale not found' });
        }
        const deletedSale = check.rows[0];

        // Get sale items to revert inventory
        const itemsResult = await client.query(
            'SELECT inventory_id, qty FROM SALE_ITEMS WHERE sale_id = $1',
            [id]
        );

        for (const item of itemsResult.rows) {
            await client.query(
                'UPDATE INVENTORY SET stock_qty = stock_qty + $1 WHERE id = $2 AND admin_id = $3',
                [item.qty, item.inventory_id, adminId]
            );
        }

        await client.query('DELETE FROM SALE_ITEMS WHERE sale_id = $1', [id]);
        await client.query('DELETE FROM SALES WHERE id = $1 AND admin_id = $2', [id, adminId]);
        
        await client.query('COMMIT');
        res.json({ message: 'Sale deleted and inventory reverted successfully', sale: deletedSale });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Failed to delete sale' });
    } finally {
        client.release();
    }
};
