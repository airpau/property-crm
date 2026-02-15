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
        // Recurring expense
        summary.monthlyRecurring += amount;
        summary.totalThisMonth += amount;
        summary.byCategory[expense.category] += amount;
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
      'expense_date', 'receipt_url', 'is_tax_deductible'
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

module.exports = router;
