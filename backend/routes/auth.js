const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Create public Supabase client for auth operations
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, company } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Email, password, and name are required' 
      });
    }

    // Register user with Supabase Auth
    const { data: { user, session }, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          company: company || null
        }
      }
    });

    if (error) {
      console.error('Registration error:', error);
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata.name,
        company: user.user_metadata.company
      },
      // Only include session if email confirmation is disabled
      ...(session ? { token: session.access_token } : {})
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: { session, user }, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Login error:', error);
      return res.status(401).json({ error: error.message || 'Invalid credentials' });
    }

    res.json({
      token: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        company: user.user_metadata?.company
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout user
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      });

      await supabaseAuth.auth.signOut();
    }

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    // Even if there's an error, consider logout successful
    res.json({ message: 'Logged out successfully' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token' });
    }

    const token = authHeader.split(' ')[1];
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error } = await supabaseAuth.auth.getUser();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        company: user.user_metadata?.company
      }
    });

  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Password reset request
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });

    if (error) {
      console.error('Reset password error:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      message: 'Password reset instructions sent to your email' 
    });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to send reset instructions' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const { data: { session }, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    res.json({
      token: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at
    });

  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

module.exports = router;
