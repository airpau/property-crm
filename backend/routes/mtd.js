const express = require('express');
const router = express.Router();
const db = require('../utils/db');

// ============================================================
// PUBLIC ROUTES (no auth required)
// ============================================================

// POST /api/mtd/waitlist - Join the MTD waitlist
router.post('/waitlist', async (req, res) => {
  try {
    const { email, name, property_count } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check for duplicate
    const existing = await db.query(
      'SELECT id FROM mtd_waitlist WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You\'re already on the waitlist!' });
    }

    const result = await db.query(
      `INSERT INTO mtd_waitlist (email, name, property_count, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, email`,
      [email.toLowerCase().trim(), name || null, property_count || null]
    );

    res.status(201).json({ 
      message: 'Successfully joined the waitlist!',
      id: result.rows[0].id 
    });
  } catch (err) {
    console.error('Waitlist signup error:', err);
    res.status(500).json({ error: 'Failed to join waitlist' });
  }
});

// ============================================================
// PROTECTED ROUTES (auth required - mounted with authMiddleware)
// ============================================================

// GET /api/mtd/quarters - Get quarterly periods for a tax year
router.get('/quarters', async (req, res) => {
  try {
    const { tax_year } = req.query;
    const landlordId = req.landlord_id;

    if (!landlordId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let query = `
      SELECT q.*, 
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expenses
      FROM mtd_quarters q
      LEFT JOIN mtd_transactions t ON t.quarter_id = q.id
      WHERE q.landlord_id = $1
    `;
    const params = [landlordId];

    if (tax_year) {
      query += ' AND q.tax_year = $2';
      params.push(tax_year);
    }

    query += ' GROUP BY q.id ORDER BY q.quarter_number';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching MTD quarters:', err);
    res.status(500).json({ error: 'Failed to fetch quarters' });
  }
});

// POST /api/mtd/quarters/init - Initialize quarters for a tax year
router.post('/quarters/init', async (req, res) => {
  try {
    const { tax_year } = req.body;
    const landlordId = req.landlord_id;

    if (!tax_year) {
      return res.status(400).json({ error: 'tax_year is required (e.g. 2026-27)' });
    }

    // Parse tax year start
    const startYear = parseInt(tax_year.split('-')[0]);
    
    const quarters = [
      { num: 1, start: `${startYear}-04-06`, end: `${startYear}-07-05`, deadline: `${startYear}-08-05` },
      { num: 2, start: `${startYear}-07-06`, end: `${startYear}-10-05`, deadline: `${startYear}-11-05` },
      { num: 3, start: `${startYear}-10-06`, end: `${startYear + 1}-01-05`, deadline: `${startYear + 1}-02-05` },
      { num: 4, start: `${startYear + 1}-01-06`, end: `${startYear + 1}-04-05`, deadline: `${startYear + 1}-05-05` },
    ];

    const results = [];
    for (const q of quarters) {
      const result = await db.query(
        `INSERT INTO mtd_quarters (landlord_id, tax_year, quarter_number, period_start, period_end, submission_deadline, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'draft')
         ON CONFLICT (landlord_id, tax_year, quarter_number) DO NOTHING
         RETURNING *`,
        [landlordId, tax_year, q.num, q.start, q.end, q.deadline]
      );
      if (result.rows[0]) results.push(result.rows[0]);
    }

    res.status(201).json(results);
  } catch (err) {
    console.error('Error initializing quarters:', err);
    res.status(500).json({ error: 'Failed to initialize quarters' });
  }
});

// GET /api/mtd/quarters/:id/summary - Get detailed quarter summary by property
router.get('/quarters/:id/summary', async (req, res) => {
  try {
    const { id } = req.params;
    const landlordId = req.landlord_id;

    // Verify ownership
    const quarter = await db.query(
      'SELECT * FROM mtd_quarters WHERE id = $1 AND landlord_id = $2',
      [id, landlordId]
    );

    if (quarter.rows.length === 0) {
      return res.status(404).json({ error: 'Quarter not found' });
    }

    // Get transactions grouped by property and category
    const transactions = await db.query(
      `SELECT t.property_id, p.name as property_name, t.type, c.name as category_name, 
              c.hmrc_code, SUM(t.amount) as amount
       FROM mtd_transactions t
       LEFT JOIN properties p ON p.id = t.property_id
       LEFT JOIN mtd_categories c ON c.id = t.category_id
       WHERE t.quarter_id = $1 AND t.landlord_id = $2
       GROUP BY t.property_id, p.name, t.type, c.name, c.hmrc_code
       ORDER BY p.name, t.type, c.name`,
      [id, landlordId]
    );

    // Group by property
    const byProperty = {};
    for (const row of transactions.rows) {
      const pid = row.property_id;
      if (!byProperty[pid]) {
        byProperty[pid] = {
          property_id: pid,
          property_name: row.property_name,
          total_income: 0,
          total_expenses: 0,
          income_categories: [],
          expense_categories: [],
        };
      }
      const cat = { category_name: row.category_name, hmrc_code: row.hmrc_code, amount: parseFloat(row.amount) };
      if (row.type === 'income') {
        byProperty[pid].total_income += cat.amount;
        byProperty[pid].income_categories.push(cat);
      } else {
        byProperty[pid].total_expenses += cat.amount;
        byProperty[pid].expense_categories.push(cat);
      }
    }

    res.json({
      quarter: quarter.rows[0],
      by_property: Object.values(byProperty),
    });
  } catch (err) {
    console.error('Error fetching quarter summary:', err);
    res.status(500).json({ error: 'Failed to fetch quarter summary' });
  }
});

// GET /api/mtd/quarters/:id/export - Export quarter as CSV
router.get('/quarters/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const landlordId = req.landlord_id;

    const transactions = await db.query(
      `SELECT t.*, p.name as property_name, c.name as category_name, c.hmrc_code
       FROM mtd_transactions t
       LEFT JOIN properties p ON p.id = t.property_id
       LEFT JOIN mtd_categories c ON c.id = t.category_id
       WHERE t.quarter_id = $1 AND t.landlord_id = $2
       ORDER BY t.transaction_date, p.name`,
      [id, landlordId]
    );

    // Build CSV
    const headers = ['Date', 'Property', 'Type', 'Category', 'HMRC Code', 'Description', 'Amount'];
    const rows = transactions.rows.map((t) => [
      t.transaction_date,
      t.property_name || '',
      t.type,
      t.category_name || '',
      t.hmrc_code || '',
      (t.description || '').replace(/"/g, '""'),
      t.amount,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=mtd-quarter-${id}.csv`);
    res.send(csv);
  } catch (err) {
    console.error('Error exporting quarter:', err);
    res.status(500).json({ error: 'Failed to export quarter' });
  }
});

// GET /api/mtd/categories - Get all HMRC categories
router.get('/categories', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM mtd_categories ORDER BY type, sort_order, name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/mtd/transactions - Add a transaction
router.post('/transactions', async (req, res) => {
  try {
    const { quarter_id, property_id, category_id, type, amount, description, transaction_date, source, source_id } = req.body;
    const landlordId = req.landlord_id;

    if (!quarter_id || !property_id || !category_id || !type || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await db.query(
      `INSERT INTO mtd_transactions 
        (landlord_id, quarter_id, property_id, category_id, type, amount, description, transaction_date, source, source_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [landlordId, quarter_id, property_id, category_id, type, amount, description, transaction_date || new Date(), source || 'manual', source_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding transaction:', err);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// POST /api/mtd/auto-categorise/:quarterId - Auto-categorise existing data into MTD transactions
router.post('/auto-categorise/:quarterId', async (req, res) => {
  try {
    const { quarterId } = req.params;
    const landlordId = req.landlord_id;

    // Get the quarter
    const quarter = await db.query(
      'SELECT * FROM mtd_quarters WHERE id = $1 AND landlord_id = $2',
      [quarterId, landlordId]
    );

    if (quarter.rows.length === 0) {
      return res.status(404).json({ error: 'Quarter not found' });
    }

    const q = quarter.rows[0];
    let imported = 0;

    // Get HMRC categories
    const cats = await db.query('SELECT * FROM mtd_categories');
    const catMap = {};
    for (const c of cats.rows) {
      catMap[c.hmrc_code] = c.id;
    }

    // 1. Import rent payments as income
    const rentPayments = await db.query(
      `SELECT rp.*, p.id as prop_id
       FROM rent_payments rp
       JOIN tenancies t ON t.id = rp.tenancy_id
       JOIN properties p ON p.id = t.property_id
       WHERE p.landlord_id = $1
         AND rp.payment_date >= $2 AND rp.payment_date <= $3
         AND rp.status = 'paid'
         AND NOT EXISTS (
           SELECT 1 FROM mtd_transactions mt 
           WHERE mt.source = 'rent_payment' AND mt.source_id = rp.id::text
         )`,
      [landlordId, q.period_start, q.period_end]
    );

    for (const rp of rentPayments.rows) {
      await db.query(
        `INSERT INTO mtd_transactions 
          (landlord_id, quarter_id, property_id, category_id, type, amount, description, transaction_date, source, source_id)
         VALUES ($1, $2, $3, $4, 'income', $5, $6, $7, 'rent_payment', $8)`,
        [landlordId, quarterId, rp.prop_id, catMap['RENT'] || catMap['OTHER_INCOME'], 
         rp.amount, `Rent payment`, rp.payment_date, rp.id.toString()]
      );
      imported++;
    }

    // 2. Import SA bookings as income
    const saBookings = await db.query(
      `SELECT sb.*, p.id as prop_id
       FROM sa_bookings sb
       JOIN properties p ON p.id = sb.property_id
       WHERE p.landlord_id = $1
         AND sb.check_in >= $2 AND sb.check_in <= $3
         AND NOT EXISTS (
           SELECT 1 FROM mtd_transactions mt 
           WHERE mt.source = 'sa_booking' AND mt.source_id = sb.id::text
         )`,
      [landlordId, q.period_start, q.period_end]
    );

    for (const sb of saBookings.rows) {
      await db.query(
        `INSERT INTO mtd_transactions 
          (landlord_id, quarter_id, property_id, category_id, type, amount, description, transaction_date, source, source_id)
         VALUES ($1, $2, $3, $4, 'income', $5, $6, $7, 'sa_booking', $8)`,
        [landlordId, quarterId, sb.prop_id, catMap['SA_INCOME'] || catMap['OTHER_INCOME'],
         sb.total_amount || sb.nightly_rate, `SA booking: ${sb.guest_name || 'Guest'}`, sb.check_in, sb.id.toString()]
      );
      imported++;
    }

    // 3. Import expenses
    const expenses = await db.query(
      `SELECT e.*
       FROM property_expenses e
       WHERE e.landlord_id = $1
         AND e.expense_date >= $2 AND e.expense_date <= $3
         AND NOT EXISTS (
           SELECT 1 FROM mtd_transactions mt 
           WHERE mt.source = 'expense' AND mt.source_id = e.id::text
         )`,
      [landlordId, q.period_start, q.period_end]
    );

    // Map existing expense categories to HMRC codes
    const expenseCatMapping = {
      'maintenance': 'REPAIRS',
      'repairs': 'REPAIRS',
      'insurance': 'INSURANCE',
      'utilities': 'OTHER_EXPENSE',
      'management': 'PROFESSIONAL_FEES',
      'legal': 'LEGAL_FEES',
      'mortgage': 'FINANCE_COSTS',
      'cleaning': 'REPAIRS',
      'furnishing': 'REPLACING_FURNISHINGS',
      'council_tax': 'RATES',
      'ground_rent': 'RENTS_GROUND_RENT',
      'service_charge': 'OTHER_EXPENSE',
    };

    for (const exp of expenses.rows) {
      const hmrcCode = expenseCatMapping[exp.category?.toLowerCase()] || 'OTHER_EXPENSE';
      await db.query(
        `INSERT INTO mtd_transactions 
          (landlord_id, quarter_id, property_id, category_id, type, amount, description, transaction_date, source, source_id)
         VALUES ($1, $2, $3, $4, 'expense', $5, $6, $7, 'expense', $8)`,
        [landlordId, quarterId, exp.property_id, catMap[hmrcCode] || catMap['OTHER_EXPENSE'],
         exp.amount, exp.description || exp.category, exp.expense_date, exp.id.toString()]
      );
      imported++;
    }

    res.json({ message: `Auto-categorised ${imported} transactions`, imported });
  } catch (err) {
    console.error('Error auto-categorising:', err);
    res.status(500).json({ error: 'Failed to auto-categorise' });
  }
});

module.exports = router;
