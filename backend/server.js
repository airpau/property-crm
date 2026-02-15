const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const { authMiddleware } = require('./middleware/auth');
const authRouter = require('./routes/auth');
const propertiesRouter = require('./routes/properties');
const tenantsRouter = require('./routes/tenants');
const tenanciesRouter = require('./routes/tenancies');
const rentPaymentsRouter = require('./routes/rent-payments');
const driveDocumentsRouter = require('./routes/drive-documents');
const googleAuthRouter = require('./routes/google-auth');
const quickbooksAuthRouter = require('./routes/quickbooks-auth');
const expensesRouter = require('./routes/expenses');
const saBookingsRouter = require('./routes/sa-bookings');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration for production
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://propangel.co.uk',
  'https://www.propangel.co.uk',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
].filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

// Health check - no auth required
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Public auth routes
app.use('/api/auth', authRouter);

// OAuth callback must be PUBLIC (Google redirects here without auth token)
// This must be BEFORE mounting the protected /api/google router
app.get('/api/google/callback', (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  const error = req.query.error;
  
  if (error) {
    return res.send(`
      <script>
        window.opener && window.opener.postMessage({type: 'GOOGLE_AUTH_ERROR', error: '${error}'}, '*');
        window.close();
      </script>
      <body>Authorization failed. Please close this window.</body>
    `);
  }
  
  if (!code) {
    return res.send(`
      <script>
        window.opener && window.opener.postMessage({type: 'GOOGLE_AUTH_ERROR', error: 'no_code'}, '*');
        window.close();
      </script>
      <body>Invalid callback. Please close this window.</body>
    `);
  }
  
  // Show success page that sends code to parent and auto-closes
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Connecting Google Drive...</title>
      <style>
        body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
        .container { text-align: center; padding: 20px; }
        h2 { color: #333; }
        p { color: #666; margin: 10px 0; }
        .loading { font-size: 40px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="loading">✓</div>
        <h2>Google Drive Connected!</h2>
        <p>Closing this window automatically...</p>
      </div>
      <script>
        const code = '${code}';
        try {
          if (window.opener) {
            window.opener.postMessage({type: 'GOOGLE_AUTH_SUCCESS', code: code}, '*');
          }
        } catch(e) {}
        try {
          localStorage.setItem('google_auth_code', code);
        } catch(e) {}
        setTimeout(() => { window.close(); }, 2000);
      </script>
    </body>
    </html>
  `);
});

// Protected routes - require authentication
app.use('/api/properties', authMiddleware, propertiesRouter);
app.use('/api/tenants', authMiddleware, tenantsRouter);
app.use('/api/tenancies', authMiddleware, tenanciesRouter);
app.use('/api/rent-payments', authMiddleware, rentPaymentsRouter);
app.use('/api/drive', authMiddleware, driveDocumentsRouter);
// Note: callback is already handled above, rest of /api/google routes are protected
app.use('/api/google', authMiddleware, googleAuthRouter);

// QuickBooks OAuth callback (public, no auth required)
app.get('/api/quickbooks/callback', (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  const error = req.query.error;
  const realmId = req.query.realmId;
  
  if (error) {
    return res.send(`
      <script>
        window.opener && window.opener.postMessage({type: 'QB_AUTH_ERROR', error: '${error}'}, '*');
        window.close();
      </script>
      <body>QuickBooks authorization failed. Please close this window.</body>
    `);
  }
  
  if (!code) {
    return res.send(`
      <script>
        window.opener && window.opener.postMessage({type: 'QB_AUTH_ERROR', error: 'no_code'}, '*');
        window.close();
      </script>
      <body>Invalid callback. Please close this window.</body>
    `);
  }
  
  // Show success page that sends code and realmId to parent
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Connecting QuickBooks...</title>
      <style>
        body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #2ca01c; }
        .container { text-align: center; padding: 20px; background: white; border-radius: 8px; }
        h2 { color: #333; }
        p { color: #666; margin: 10px 0; }
        .icon { font-size: 60px; margin-bottom: 20px; color: #2ca01c; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">✓</div>
        <h2>QuickBooks Connected!</h2>
        <p>Syncing your data...</p>
      </div>
      <script>
        const code = '${code}';
        const realmId = '${realmId || ''}';
        try {
          if (window.opener) {
            window.opener.postMessage({type: 'QB_AUTH_SUCCESS', code: code, realmId: realmId}, '*');
          }
        } catch(e) {}
        setTimeout(() => { window.close(); }, 3000);
      </script>
    </body>
    </html>
  `);
});

// Protected QuickBooks routes
app.use('/api/quickbooks', authMiddleware, quickbooksAuthRouter);

// Expense tracking routes
app.use('/api/expenses', authMiddleware, expensesRouter);

// Serviced accommodation bookings
app.use('/api/sa-bookings', authMiddleware, saBookingsRouter);

// Serve static files from frontend build in production
if (process.env.NODE_ENV === 'production') {
  // Check multiple possible paths
  const possiblePaths = [
    path.join(__dirname, '../frontend/build'),
    path.join(__dirname, '../../frontend/build'),
    '/opt/render/project/src/frontend/build'
  ];
  
  let frontendBuildPath = null;
  for (const p of possiblePaths) {
    try {
      if (require('fs').existsSync(p)) {
        frontendBuildPath = p;
        break;
      }
    } catch (e) {}
  }
  
  if (frontendBuildPath) {
    console.log('Serving frontend from:', frontendBuildPath);
    app.use(express.static(frontendBuildPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
  } else {
    console.log('Frontend build not found in any of:', possiblePaths);
  }
}

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message 
  });
});

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`Property CRM API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`========================================`);
});
