const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

// Create Supabase admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database helper functions
const db = {
  // Query wrapper for PostgreSQL queries via Supabase
  query: async (sql, params) => {
    try {
      // Use Supabase RPC for custom queries or table operations
      // For read operations with RLS, use the authenticated client's JWT
      const { data, error } = await supabase.rpc('exec_sql', { 
        query: sql, 
        params: params 
      });
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Database query error:', err);
      throw err;
    }
  },

  // Table operations with RLS support
  from: (table) => supabase.from(table),
  
  // Raw SQL execution (requires exec_sql function in Supabase)
  sql: async (strings, ...values) => {
    const query = strings.reduce((acc, str, i) => 
      acc + str + (values[i] !== undefined ? `$${i + 1}` : ''), 
      ''
    );
    return db.query(query, values);
  }
};

module.exports = { supabase, db };
