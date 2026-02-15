const express = require('express');
const router = express.Router();

// GET all expenses for a property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { startDate, endDate, category } = req.query;
    
    let query = req.supabase
      .from('property_expenses')
      .select('*')
      .eq('property_id', propertyId)
      .eq('landlord_id', req.landlord_id)
      .order('expense_date', { ascending: false });
    
    if (startDate) {
      query = query.gte('expense_date', startDate);
    }
    if (endDate) {
      query = query.lte('expense_date', endDate);
    }
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data: expenses, error } = await query;
    
    if (error) throw error;
    
    res.json(expenses || []);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// GET expense summary for a property (monthly totals)
router.get('/property/:propertyId/summary', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { year, month } = req.query;
    
    // Get all expenses for the property
    const { data: expenses, error } = await req.supabase
      .from('property_expenses')
      .select('*')
      .eq('property_id', propertyId)
      .eq('landlord_id', req.landlord_id);
    
    if (error) throw error;
    
    // Calculate totals
    const summary = {
      oneOff: 0,
      monthlyRecurring: 0,
      totalThisMonth: 0,
      byCategory: {}
    };
    
    const today = new Date();
    const currentYear = year ? parseInt(year) : today.getFullYear();
    const currentMonth = month ? parseInt(month) - 1 : today.getMonth();
    
    (expenses || []).forEach(expense => {
      const expenseDate = new Date(expense.expense_date);
      const endDate = expense.end_date ? new Date(expense.end_date) : null;
      const amount = parseFloat(expense.amount) || 0;
      
      // Track by category
      if (!summary.byCategory[expense.category]) {
        summary.byCategory[expense.category] = 0;
      }
      
      if (expense.frequency === 'one-off') {
        summary.oneOff += amount;
        // Count if in current month
        if (expenseDate.getFullYear() === currentYear && 
            expenseDate.getMonth() === currentMonth) {
          summary.totalThisMonth += amount;
          summary.byCategory[expense.category] += amount;
        }
      } else {
        // Recurring expense - check if still active
        const currentMonthDate = new Date(currentYear, currentMonth, 15); // Middle of month
        const isActive = endDate ? currentMonthDate <= endDate : true;
        
        if (isActive) {
          summary.monthlyRecurring += amount;
          summary.totalThisMonth += amount;
          summary.byCategory[expense.category] += amount;
        }
      }
    });
    
    res.json(summary);
  } catch (err) {
    console.error('Error fetching expense summary:', err);
    res.status(500).json({ error: 'Failed to fetch expense summary' });
  }
});

// CREATE expense
router.post('/', async (req, res) => {
  try {
    const expenseData = {
      ...req.body,
      landlord_id: req.landlord_id
    };
    
    // Verify property belongs to landlord
    const { data: property } = await req.supabase
      .from('properties')
      .select('id')
      .eq('id', expenseData.property_id)
      .eq('landlord_id', req.landlord_id)
      .single();
    
    if (!property) {
      return res.status(403).json({ error: 'Property not found or access denied' });
    }
    
    const { data: expense, error } = await req.supabase
      .from('property_expenses')
      .insert([expenseData])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(expense);
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// UPDATE expense
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const allowedFields = [
      'category', 'description', 'amount', 'frequency', 
      'expense_date', 'end_date', 'receipt_url', 'is_tax_deductible'
    ];
    
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const { data: expense, error } = await req.supabase
      .from('property_expenses')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', id)
      .eq('landlord_id', req.landlord_id)
      .select()
      .single();
    
    if (error) throw error;
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.json(expense);
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// DELETE expense
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await req.supabase
      .from('property_expenses')
      .delete()
      .eq('id', id)
      .eq('landlord_id', req.landlord_id);
    
    if (error) throw error;
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// GET monthly transactions for reporting
router.get('/transactions/monthly', async (req, res) => {
  try {
    const { year, month } = req.query;
    
    const today = new Date();
    const targetYear = year ? parseInt(year) : today.getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : today.getMonth();
    
    const monthStart = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`;
    const monthEnd = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-31`;
    
    // Get all recurring expenses for this landlord
    const { data: expenses, error } = await req.supabase
      .from('property_expenses')
      .select(`
        *,
        property:properties(name, address_line_1)
      `)
      .eq('landlord_id', req.landlord_id)
      .in('frequency', ['monthly', 'quarterly'])
      .lte('expense_date', monthEnd)
      .or(`end_date.is.null,and(end_date.gte.${monthStart})`);
    
    if (error) throw error;
    
    // Generate transaction rows for the month
    const transactions = [];
    
    (expenses || []).forEach(expense => {
      const expenseDate = new Date(expense.expense_date);
      const endDate = expense.end_date ? new Date(expense.end_date) : null;
      
      // Check if this recurring expense applies to target month
      const targetMonthDate = new Date(targetYear, targetMonth, 15);
      
      if (expense.frequency === 'monthly') {
        // Include if started before or during target month and hasn't ended
        if (expenseDate <= new Date(monthEnd) && (!endDate || endDate >= new Date(monthStart))) {
          transactions.push({
            id: `${expense.id}-${targetYear}-${targetMonth}`,
            expense_id: expense.id,
            property_name: expense.property?.name || expense.property?.address_line_1 || 'Unknown',
            category: expense.category,
            description: expense.description || 'Monthly payment',
            amount: parseFloat(expense.amount) || 0,
            transaction_date: monthStart,
            frequency: 'monthly',
            end_date: expense.end_date,
            is_active: !endDate || endDate >= new Date(monthEnd)
          });
        }
      } else if (expense.frequency === 'quarterly') {
        // Include only for the quarter
        const startMonth = expenseDate.getMonth();
        const monthsInQuarter = [startMonth, (startMonth + 3) % 12, (startMonth + 6) % 12];
        
        if (monthsInQuarter.includes(targetMonth) && 
            expenseDate <= new Date(monthEnd) && 
            (!endDate || endDate >= new Date(monthStart))) {
          transactions.push({
            id: `${expense.id}-${targetYear}-${targetMonth}`,
            expense_id: expense.id,
            property_name: expense.property?.name || expense.property?.address_line_1 || 'Unknown',
            category: expense.category,
            description: expense.description || 'Quarterly payment',
            amount: parseFloat(expense.amount) || 0,
            transaction_date: monthStart,
            frequency: 'quarterly',
            end_date: expense.end_date,
            is_active: !endDate || endDate >= new Date(monthEnd)
          });
        }
      }
    });
    
    // Get one-off expenses for this month
    const { data: oneOffExpenses } = await req.supabase
      .from('property_expenses')
      .select(`
        *,
        property:properties(name, address_line_1)
      `)
      .eq('landlord_id', req.landlord_id)
      .eq('frequency', 'one-off')
      .gte('expense_date', monthStart)
      .lte('expense_date', monthEnd);
    
    (oneOffExpenses || []).forEach(expense => {
      transactions.push({
        id: expense.id,
        expense_id: expense.id,
        property_name: expense.property?.name || expense.property?.address_line_1 || 'Unknown',
        category: expense.category,
        description: expense.description || 'One-off expense',
        amount: parseFloat(expense.amount) || 0,
        transaction_date: expense.expense_date,
        frequency: 'one-off',
        end_date: null,
        is_active: true
      });
    });
    
    // Sort by category and amount
    transactions.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return b.amount - a.amount;
    });
    
    // Calculate totals
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const recurringTotal = transactions.filter(t => t.frequency !== 'one-off').reduce((sum, t) => sum + t.amount, 0);
    const oneOffTotal = transactions.filter(t => t.frequency === 'one-off').reduce((sum, t) => sum + t.amount, 0);
    
    res.json({
      month: targetMonth + 1,
      year: targetYear,
      month_name: new Date(targetYear, targetMonth, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' }),
      transaction_count: transactions.length,
      total_amount: totalAmount,
      recurring_total: recurringTotal,
      one_off_total: oneOffTotal,
      transactions
    });
  } catch (err) {
    console.error('Error fetching monthly transactions:', err);
    res.status(500).json({ error: 'Failed to fetch monthly transactions' });
  }
});

module.exports = router;
