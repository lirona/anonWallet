const express = require('express');
const cors = require('cors');

const app = express();
const port = 8080;

// Load environment variables from parent project
require('dotenv').config({ path: '../.env.local' });

// Get environment variables
const APP_ID = process.env.EXPO_PUBLIC_APP_ID || '4G5YQ8G38R.com.anonymous.CoilWalletExpo';
const NGROK_DOMAIN = process.env.EXPO_PUBLIC_ASSOCIATED_DOMAIN || 'rosita-geoponic-dwain.ngrok-free.app';
console.log(`Using App ID: ${APP_ID}`);
console.log(`Using Domain: ${NGROK_DOMAIN}`);

// Enable CORS for all routes
app.use(cors());

// Log ALL incoming requests to debug what iOS is trying to access
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`[${new Date().toISOString()}] Headers:`, req.headers);
  console.log(`[${new Date().toISOString()}] User-Agent: ${req.get('User-Agent')}`);
  next();
});

// Serve the apple-app-site-association file with correct headers
const serveAASA = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');
  
  const association = {
    "webcredentials": {
      "apps": [APP_ID]
    }
  };
  
  res.json(association);
};

// Serve Android assetlinks.json file
const serveAssetLinks = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');

  const assetLinks = [
    {
      "relation": [
        "delegate_permission/common.handle_all_urls",
        "delegate_permission/common.get_login_creds"
      ],
      "target": {
        "namespace": "android_app",
        "package_name": "com.anonymous.CoilWalletExpo",
        "sha256_cert_fingerprints": [
          "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C"
        ]
      }
    }
  ];

  res.json(assetLinks);
};

// Serve AASA file at both standard locations
app.get('/apple-app-site-association', serveAASA);
app.get('/.well-known/apple-app-site-association', serveAASA);

// Serve Android Asset Links file
app.get('/.well-known/assetlinks.json', serveAssetLinks);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Domain association server running' });
});

// Root endpoint with instructions
app.get('/', (req, res) => {
  res.json({ 
    message: 'Domain Association Server for iOS Passkey Development',
    endpoints: {
      '/apple-app-site-association': 'Apple App Site Association file',
      '/.well-known/assetlinks.json': 'Android Asset Links file',
      '/health': 'Health check'
    },
    instructions: [
      `1. Make sure ngrok is running: ngrok http ${port} --domain=${NGROK_DOMAIN}`,
      '2. In Xcode, add Associated Domains capability with:',
      `   - applinks:${NGROK_DOMAIN}`,
      `   - webcredentials:${NGROK_DOMAIN}`,
      '3. Build Capacitor app: npm run build && npx cap sync ios',
      '4. Run in Xcode: npx cap open ios'
    ]
  });
});

// Catch-all route to log any unhandled requests
app.get('*', (req, res) => {
  console.log(`[${new Date().toISOString()}] ⚠️  UNHANDLED REQUEST: ${req.method} ${req.url}`);
  console.log(`[${new Date().toISOString()}] ⚠️  This might be what iOS is looking for!`);
  res.status(404).json({ error: 'Not found', requestedPath: req.url });
});

app.listen(port, () => {
  console.log(`🔗 Domain association server running on http://localhost:${port}`);
  console.log(`📱 Apple App Site Association available at: http://localhost:${port}/apple-app-site-association`);
  console.log('');
  console.log('Next steps:');
  console.log(`1. In another terminal, run: ngrok http ${port} --domain=${NGROK_DOMAIN}`);
  console.log('2. Build your Capacitor app: npm run build && npx cap sync ios');
  console.log('3. Open and run in Xcode: npx cap open ios');
  console.log('');
  console.log('💡 Visit http://localhost:' + port + ' for full instructions');
});
