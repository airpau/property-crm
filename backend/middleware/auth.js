const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create JWT verification client (for auth middleware)
const verifySupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Admin client for database operations
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await verifySupabase.auth.getUser(token);

    if (error || !user) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Set user info on request
    req.user = user;
    req.landlord_id = user.id;
    
    // Create authenticated Supabase client for this request
    req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Optional auth - doesn't block if no token, but sets user if present
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user }, error } = await verifySupabase.auth.getUser(token);
      
      if (!error && user) {
        req.user = user;
        req.landlord_id = user.id;
        req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          },
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        });
      }
    }
    
    next();
  } catch (err) {
    // Continue without auth
    next();
  }
};

module.exports = { authMiddleware, optionalAuth, adminSupabase };
