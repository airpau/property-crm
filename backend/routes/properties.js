const express = require('express');
const router = express.Router();
const { updateTenancyStatuses } = require('../utils/tenancy-helpers');

// GET all properties for authenticated landlord
router.get('/', async (req, res) => {
  try {
    // Auto-update tenancy statuses before returning
    await updateTenancyStatuses(req.landlord_id);
    
    console.log('Fetching properties for landlord:', req.landlord_id);
    
    const { data: properties, error } = await req.supabase
      .from('properties')
      .select(`
        *,
        tenancies!tenancies_property_id_fkey(
          id,
          status,
          rent_amount,
          tenancy_tenants(
            tenant:tenants(*)
          )
        )
      `)
      .eq('landlord_id', req.landlord_id)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log('Found properties:', properties?.length || 0);

    // Format response with counts and monthly income
    const formattedProperties = properties.map(p => {
      const activeTenancies = p.tenancies?.filter(t => t.status === 'active') || [];
      const monthlyIncome = activeTenancies.reduce((sum, t) => sum + parseFloat(t.rent_amount || 0), 0);
      const activeTenants = activeTenancies.reduce((count, t) => count + (t.tenancy_tenants?.length || 0), 0);
      
      return {
        ...p,
        active_tenancies: activeTenancies.length,
        active_tenants: activeTenants,
        monthly_income: monthlyIncome
      };
    });

    res.json(formattedProperties);
  } catch (err) {
    console.error('Error fetching properties:', err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// GET single property with full details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Auto-update tenancy statuses before returning
    await updateTenancyStatuses(req.landlord_id);
    
    // Property details
    const { data: property, error: propertyError } = await req.supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .eq('landlord_id', req.landlord_id)
      .is('deleted_at', null)
      .single();

    if (propertyError || !property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Active tenancies with tenants
    const { data: tenancies, error: tenanciesError } = await req.supabase
      .from('tenancies')
      .select(`
        *,
        tenancy_tenants(
          is_primary,
          tenant:tenants(*)
        )
      `)
      .eq('property_id', id)
      .eq('landlord_id', req.landlord_id)
      .eq('status', 'active')
      .is('deleted_at', null);

    // Flatten tenancy_tenants to tenants
    const formattedTenancies = tenancies?.map(t => ({
      ...t,
      tenants: t.tenancy_tenants?.map(tt => ({
        ...tt.tenant,
        is_primary: tt.is_primary
      })) || []
    })) || [];

    // Compliance certificates
    const { data: compliance, error: complianceError } = await req.supabase
      .from('compliance_certificates')
      .select('*')
      .eq('property_id', id)
      .eq('landlord_id', req.landlord_id)
      .order('expiry_date', { ascending: true });

    // Recent rent payments
    const { data: payments, error: paymentsError } = await req.supabase
      .from('rent_payments')
      .select(`
        *,
        tenancy:tenancies(rent_amount)
      `)
      .eq('property_id', id)
      .eq('landlord_id', req.landlord_id)
      .order('due_date', { ascending: false })
      .limit(12);

    res.json({
      ...property,
      tenancies: formattedTenancies,
      compliance: compliance || [],
      recent_payments: payments || []
    });
  } catch (err) {
    console.error('Error fetching property:', err);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// CREATE property
router.post('/', async (req, res) => {
  try {
    const propertyData = {
      ...req.body,
      landlord_id: req.landlord_id
    };

    const { data: property, error } = await req.supabase
      .from('properties')
      .insert([propertyData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(property);
  } catch (err) {
    console.error('Error creating property:', err);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// UPDATE property
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      'name', 'address_line_1', 'address_line_2', 'city', 'postcode',
      'property_type', 'bedrooms', 'bathrooms', 'receptions', 'total_rooms',
      'purchase_price', 'purchase_date', 'current_value',
      'mortgage_lender', 'mortgage_reference', 'monthly_mortgage', 'interest_rate',
      'status', 'is_hmo', 'hmo_license_number', 'hmo_license_expiry', 'max_occupants',
      'epc_rating', 'epc_expiry', 'council_tax_band'
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

    const { data: property, error } = await req.supabase
      .from('properties')
      .update({ ...updates, updated_at: new Date() })
      .eq('id', id)
      .eq('landlord_id', req.landlord_id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(property);
  } catch (err) {
    console.error('Error updating property:', err);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

// DELETE property (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await req.supabase
      .from('properties')
      .update({ deleted_at: new Date() })
      .eq('id', id)
      .eq('landlord_id', req.landlord_id);

    if (error) throw error;

    res.json({ message: 'Property deleted successfully' });
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

// GET property summary for dashboard
router.get('/:id/summary', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: property, error } = await req.supabase
      .from('properties')
      .select(`
        id,
        name,
        status,
        address_line_1,
        tenancies!tenancies_property_id_fkey(
          id,
          status,
          rent_amount,
          tenancy_tenants(
            tenant_id
          )
        ),
        compliance_certificates(
          id,
          expiry_date
        )
      `)
      .eq('id', id)
      .eq('landlord_id', req.landlord_id)
      .is('deleted_at', null)
      .single();

    if (error || !property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Calculate summary stats
    const activeTenancies = property.tenancies?.filter(t => t.status === 'active') || [];
    const totalMonthlyRent = activeTenancies.reduce((sum, t) => sum + parseFloat(t.rent_amount || 0), 0);
    const activeTenants = activeTenancies.reduce((count, t) => count + (t.tenancy_tenants?.length || 0), 0);
    const expiringCerts = property.compliance_certificates?.filter(c => {
      const expiry = new Date(c.expiry_date);
      const daysUntilExpiry = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 60;
    }).length || 0;

    res.json({
      id: property.id,
      name: property.name,
      status: property.status,
      address_line_1: property.address_line_1,
      active_tenancies: activeTenancies.length,
      total_monthly_rent: totalMonthlyRent,
      active_tenants: activeTenants,
      expiring_certs: expiringCerts
    });
  } catch (err) {
    console.error('Error fetching property summary:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

module.exports = router;
