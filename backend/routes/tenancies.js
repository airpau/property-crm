const express = require('express');
const router = express.Router();

// GET all tenancies for authenticated landlord
router.get('/', async (req, res) => {
  try {
    const { data: tenancies, error } = await req.supabase
      .from('tenancies')
      .select(`
        *,
        property:properties(name, address_line_1),
        tenancy_tenants(
          is_primary,
          tenant:tenants(*)
        )
      `)
      .eq('landlord_id', req.landlord_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(tenancies || []);
  } catch (err) {
    console.error('Error fetching tenancies:', err);
    res.status(500).json({ error: 'Failed to fetch tenancies' });
  }
});

// GET single tenancy
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: tenancy, error } = await req.supabase
      .from('tenancies')
      .select(`
        *,
        property:properties(*),
        tenancy_tenants(
          is_primary,
          tenant:tenants(*)
        ),
        rent_payments(*)
      `)
      .eq('id', id)
      .eq('landlord_id', req.landlord_id)
      .is('deleted_at', null)
      .single();

    if (error || !tenancy) {
      return res.status(404).json({ error: 'Tenancy not found' });
    }

    res.json(tenancy);
  } catch (err) {
    console.error('Error fetching tenancy:', err);
    res.status(500).json({ error: 'Failed to fetch tenancy' });
  }
});

// CREATE tenancy
router.post('/', async (req, res) => {
  try {
    const tenancyData = {
      ...req.body,
      landlord_id: req.landlord_id
    };

    // Verify property belongs to landlord
    const { data: property } = await req.supabase
      .from('properties')
      .select('id')
      .eq('id', tenancyData.property_id)
      .eq('landlord_id', req.landlord_id)
      .single();

    if (!property) {
      return res.status(403).json({ error: 'Property not found or access denied' });
    }

    const { data: tenancy, error } = await req.supabase
      .from('tenancies')
      .insert([tenancyData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(tenancy);
  } catch (err) {
    console.error('Error creating tenancy:', err);
    res.status(500).json({ error: 'Failed to create tenancy' });
  }
});

// UPDATE tenancy
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const allowedFields = [
      'tenancy_type', 'status', 'start_date', 'end_date', 'is_periodic',
      'rent_amount', 'rent_frequency', 'rent_due_day', 'deposit_amount',
      'room_number', 'notes', 'notice_given_date', 'notice_expiry_date'
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

    const { data: tenancy, error } = await req.supabase
      .from('tenancies')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', id)
      .eq('landlord_id', req.landlord_id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    if (!tenancy) {
      return res.status(404).json({ error: 'Tenancy not found' });
    }

    res.json(tenancy);
  } catch (err) {
    console.error('Error updating tenancy:', err);
    res.status(500).json({ error: 'Failed to update tenancy' });
  }
});

// Link tenant to tenancy
router.post('/:id/tenants', async (req, res) => {
  try {
    const { id } = req.params;
    const { tenant_id, is_primary } = req.body;

    // Verify tenancy belongs to landlord
    const { data: tenancy } = await req.supabase
      .from('tenancies')
      .select('id')
      .eq('id', id)
      .eq('landlord_id', req.landlord_id)
      .single();

    if (!tenancy) {
      return res.status(403).json({ error: 'Tenancy not found or access denied' });
    }

    // Verify tenant belongs to landlord
    const { data: tenant } = await req.supabase
      .from('tenants')
      .select('id')
      .eq('id', tenant_id)
      .eq('landlord_id', req.landlord_id)
      .single();

    if (!tenant) {
      return res.status(403).json({ error: 'Tenant not found or access denied' });
    }

    const { data: link, error } = await req.supabase
      .from('tenancy_tenants')
      .insert([{
        tenancy_id: id,
        tenant_id,
        is_primary: is_primary || false
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(link);
  } catch (err) {
    console.error('Error linking tenant:', err);
    res.status(500).json({ error: 'Failed to link tenant' });
  }
});

// Remove tenant from tenancy
router.delete('/:id/tenants/:tenantId', async (req, res) => {
  try {
    const { id, tenantId } = req.params;

    const { error } = await req.supabase
      .from('tenancy_tenants')
      .delete()
      .eq('tenancy_id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    res.json({ message: 'Tenant removed from tenancy' });
  } catch (err) {
    console.error('Error removing tenant:', err);
    res.status(500).json({ error: 'Failed to remove tenant' });
  }
});

module.exports = router;
