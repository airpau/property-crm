const { createClient } = require('@supabase/supabase-js');

let verifySupabase = null;
let adminSupabase = null;

function getVerifySupabase() {
  if (!verifySupabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase env vars for verify client');
      return null;
    }
    
    verifySupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return verifySupabase;
}

function getAdminSupabase() {
  if (!adminSupabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase env vars for admin client');
      return null;
    }
    
    adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return adminSupabase;
}

const authMiddleware = async (req, res, next) => {
  try {
    const client = getVerifySupabase();
    if (!client) {
      return res.status(500).json({ error: 'Auth service not configured' });
    }
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await client.auth.getUser(token);

    if (error || !user) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Set user info on request
    req.user = user;
    req.landlord_id = user.id;
    
    // Create authenticated Supabase client for this request
    req.supabase = getVerifySupabase();

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Optional auth - doesn't block if no token, but sets user if present
const optionalAuth = async (req, res, next) => {
  try {
    const client = getVerifySupabase();
    if (!client) {
      return next();
    }
    
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user }, error } = await client.auth.getUser(token);
      
      if (!error && user) {
        req.user = user;
        req.landlord_id = user.id;
        req.supabase = client;
      }
    }
    
    next();
  } catch (err) {
    // Continue without auth
    next();
  }
};

module.exports = { authMiddleware, optionalAuth, getAdminSupabase };
