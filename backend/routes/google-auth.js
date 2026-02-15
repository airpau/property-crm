const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://property-crm-live.onrender.com/auth/callback';

// Generate Google OAuth URL
router.get('/auth/url', async (req, res) => {
  try {
    const state = Buffer.from(JSON.stringify({ 
      userId: req.user?.id 
    })).toString('base64');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.file email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    res.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle OAuth callback
router.post('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    
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

    // Get user info
    const userInfoResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`
    );
    const userInfo = await userInfoResponse.json();

    // Save tokens (user ID from state or auth middleware)
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    await supabase
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
      email: userInfo.email,
      message: 'Google Drive connected successfully'
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({ error: error.message });
  }
});

// Refresh access token
async function refreshAccessToken(userId) {
  try {
    const { data: tokenData, error } = await supabase
      .from('google_drive_tokens')
      .select('*')
      .eq('landlord_id', userId)
      .single();

    if (error || !tokenData) {
      throw new Error('No refresh token found');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token'
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

    await supabase
      .from('google_drive_tokens')
      .update({
        access_token: data.access_token,
        token_expires_at: expiresAt.toISOString()
      })
      .eq('landlord_id', userId);

    return data.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

// Get valid access token (refresh if needed)
router.get('/token', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data: tokenData, error } = await supabase
      .from('google_drive_tokens')
      .select('*')
      .eq('landlord_id', userId)
      .single();

    if (error || !tokenData) {
      return res.status(404).json({ error: 'No Google Drive connection found' });
    }

    // Check if token expired
    const expiresAt = new Date(tokenData.token_expires_at);
    if (expiresAt < new Date()) {
      const newToken = await refreshAccessToken(userId);
      return res.json({ 
        access_token: newToken, 
        email: tokenData.drive_email,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
      });
    }

    res.json({
      access_token: tokenData.access_token,
      email: tokenData.drive_email,
      expires_at: tokenData.token_expires_at
    });
  } catch (error) {
    console.error('Error getting token:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = { router, refreshAccessToken };
