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

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://property-crm-live.onrender.com/api/google/callback';

// Generate Google OAuth URL - returns URL for frontend to redirect to
router.get('/auth-url', async (req, res) => {
  try {
    const state = Buffer.from(JSON.stringify({ 
      userId: req.user?.id 
    })).toString('base64');

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive.file email',
      state: state,
      access_type: 'offline',
      prompt: 'consent'
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if user has connected Google Drive
router.get('/status', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const { data: tokenData, error } = await getSupabase()
      .from('google_drive_tokens')
      .select('drive_email, created_at')
      .eq('landlord_id', userId)
      .single();

    if (error || !tokenData) {
      return res.json({ connected: false });
    }

    res.json({ 
      connected: true, 
      email: tokenData.drive_email 
    });
  } catch (error) {
    console.error('Error checking Drive status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle OAuth callback (called by frontend after Google redirect)
router.post('/connect', async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user?.id;
    
    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    // Get user email
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const userInfo = await userInfoResponse.json();

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    // Save tokens
    await getSupabase()
      .from('google_drive_tokens')
      .upsert({
        landlord_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        drive_email: userInfo.email
      });

    res.json({ 
      success: true, 
      email: userInfo.email 
    });
  } catch (error) {
    console.error('Error in connect:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disconnect Google Drive
router.delete('/disconnect', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    await getSupabase()
      .from('google_drive_tokens')
      .delete()
      .eq('landlord_id', userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get access token (with auto-refresh)
router.get('/token', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const { data: tokenData, error } = await getSupabase()
      .from('google_drive_tokens')
      .select('*')
      .eq('landlord_id', userId)
      .single();

    if (error || !tokenData) {
      return res.status(404).json({ error: 'Not connected' });
    }

    // Check if expired
    const expiresAt = new Date(tokenData.token_expires_at);
    if (expiresAt < new Date()) {
      // Refresh token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      const refreshData = await refreshResponse.json();
      
      if (refreshData.error) {
        return res.status(401).json({ error: 'Token expired, please reconnect' });
      }

      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in);

      await getSupabase()
        .from('google_drive_tokens')
        .update({
          access_token: refreshData.access_token,
          token_expires_at: newExpiresAt.toISOString()
        })
        .eq('landlord_id', userId);

      return res.json({
        access_token: refreshData.access_token,
        email: tokenData.drive_email
      });
    }

    res.json({
      access_token: tokenData.access_token,
      email: tokenData.drive_email
    });
  } catch (error) {
    console.error('Error getting token:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
