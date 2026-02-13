const express = require('express');
const router = express.Router();

// GET all tenants for authenticated landlord
router.get('/', async (req, res) => {
  try {
    const { data: tenants, error } = await req.supabase
      .from('tenants')
      .select(`
        *,
        tenancy_tenants(
          tenancy:tenancies(
            id,
            property:properties(name, id)
          )
        )
      `)
      .eq('landlord_id', req.landlord_id)
      .is('deleted_at', null)
      .order('last_name', { ascending: true });

    if (error) throw error;

    res.json(tenants || []);
  } catch (err) {
    console.error('Error fetching tenants:', err);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// GET single tenant
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: tenant, error } = await req.supabase
      .from('tenants')
      .select(`
        *,
        tenancy_tenants(
          is_primary,
          tenancy:tenancies(
            *,
            property:properties(*)
          )
        )
      `)
      .eq('id', id)
      .eq('landlord_id', req.landlord_id)
      .is('deleted_at', null)
      .single();

    if (error || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(tenant);
  } catch (err) {
    console.error('Error fetching tenant:', err);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

// CREATE tenant
router.post('/', async (req, res) => {
  try {
    const tenantData = {
      ...req.body,
      landlord_id: req.landlord_id
    };

    const { data: tenant, error } = await req.supabase
      .from('tenants')
      .insert([tenantData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(tenant);
  } catch (err) {
    console.error('Error creating tenant:', err);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// UPDATE tenant
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'phone_secondary',
      'date_of_birth', 'emergency_contact_name', 'emergency_contact_phone',
      'emergency_contact_relationship', 'employment_status', 'employer_name',
      'annual_income', 'notes'
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

    const { data: tenant, error } = await req.supabase
      .from('tenants')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', id)
      .eq('landlord_id', req.landlord_id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(tenant);
  } catch (err) {
    console.error('Error updating tenant:', err);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// DELETE tenant (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await req.supabase
      .from('tenants')
      .update({ deleted_at: new Date() })
      .eq('id', id)
      .eq('landlord_id', req.landlord_id);

    if (error) throw error;

    res.json({ message: 'Tenant deleted successfully' });
  } catch (err) {
    console.error('Error deleting tenant:', err);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

module.exports = router;
