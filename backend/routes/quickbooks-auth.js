const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Lazy load Supabase client
let supabase = null;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return supabase;
}

const QB_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID;
const QB_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;
const QB_REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI || 'https://property-crm-api-8t0r.onrender.com/api/quickbooks/callback';
const QB_SANDBOX_URL = 'https://oauth.platform.intuit.com/oauth2';
const QB_PRODUCTION_URL = 'https://oauth.platform.intuit.com/oauth2';
const QB_SANDBOX_API = 'https://sandbox-quickbooks.api.intuit.com';
const QB_PRODUCTION_API = 'https://quickbooks.api.intuit.com';

const environment = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox';
const baseUrl = environment === 'production' ? QB_PRODUCTION_URL : QB_SANDBOX_URL;
const apiUrl = environment === 'production' ? QB_PRODUCTION_API : QB_SANDBOX_API;

// Generate QuickBooks OAuth URL
router.get('/auth-url', async (req, res) => {
  try {
    const state = Buffer.from(JSON.stringify({ 
      userId: req.user?.id,
      companyId: process.env.QUICKBOOKS_COMPANY_ID
    })).toString('base64');

    const params = new URLSearchParams({
      client_id: QB_CLIENT_ID,
      redirect_uri: QB_REDIRECT_URI,
      response_type: 'code',
      scope: 'com.intuit.quickbooks.accounting',
      state: state
    });

    const authUrl = `${baseUrl}/v1?${params.toString()}`;
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating QB auth URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if user has connected QuickBooks
router.get('/status', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const { data: tokenData, error } = await getSupabase()
      .from('quickbooks_tokens')
      .select('realm_id, company_name, created_at')
      .eq('landlord_id', userId)
      .single();

    if (error || !tokenData) {
      return res.json({ connected: false });
    }

    res.json({ 
      connected: true, 
      realmId: tokenData.realm_id,
      companyName: tokenData.company_name
    });
  } catch (error) {
    console.error('Error checking QB status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disconnect QuickBooks
router.delete('/disconnect', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    await getSupabase()
      .from('quickbooks_tokens')
      .delete()
      .eq('landlord_id', userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting QB:', error);
    res.status(500).json({ error: error.message });
  }
});

// Connect QuickBooks - exchange code for tokens
router.post('/connect', async (req, res) => {
  try {
    const { code, realmId } = req.body;
    const userId = req.user?.id;
    
    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' });
    }

    // Exchange code for access token
    const tokenResponse = await fetch(`${baseUrl}/v1/tokens/bearer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: QB_REDIRECT_URI
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    // Get company info using the access token
    const companyResponse = await fetch(`${apiUrl}/v3/company/${realmId || 'null'}/companyinfo/${realmId || 'null'}`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });
    
    let companyName = 'Unknown';
    try {
      const companyInfo = await companyResponse.json();
      if (companyInfo.CompanyInfo) {
        companyName = companyInfo.CompanyInfo.CompanyName;
      }
    } catch (e) {
      console.log('Could not fetch company info');
    }

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    // Save tokens
    await getSupabase()
      .from('quickbooks_tokens')
      .upsert({
        landlord_id: userId,
        realm_id: realmId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        company_name: companyName
      });

    res.json({ 
      success: true, 
      companyName,
      realmId 
    });
  } catch (error) {
    console.error('Error connecting QB:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
