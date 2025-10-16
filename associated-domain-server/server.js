const express = require('express');
const cors = require('cors');
const { SocksProxyAgent } = require('socks-proxy-agent');
const fetch = require('node-fetch');

const app = express();
const port = 8080;

// Environment variables are injected by dotenvx
const IOS_TEAM_ID = process.env.EXPO_PUBLIC_IOS_TEAM_ID;
const BUNDLE_ID = process.env.EXPO_PUBLIC_BUNDLE_ID;
const NGROK_DOMAIN = process.env.EXPO_PUBLIC_ASSOCIATED_DOMAIN;
const ANDROID_SHA256_FINGERPRINT = process.env.EXPO_PUBLIC_ANDROID_SHA256_FINGERPRINT;
const PIMLICO_API_KEY = process.env.EXPO_PUBLIC_PIMLICO_API_KEY;

// Construct iOS app identifier with Team ID prefix
const IOS_APP_ID = `${IOS_TEAM_ID}.${BUNDLE_ID}`;

console.log(`Using iOS App ID: ${IOS_APP_ID}`);
console.log(`Using Android Package: ${BUNDLE_ID}`);
console.log(`Using Domain: ${NGROK_DOMAIN}`);
console.log(`Using Android SHA-256 Fingerprint: ${ANDROID_SHA256_FINGERPRINT}`);

// Tor SOCKS5 proxy configuration
const TOR_PROXY = 'socks5://127.0.0.1:9050';
const torAgent = new SocksProxyAgent(TOR_PROXY);

// Privacy metrics tracking
let privacyMetrics = {
  totalRequests: 0,
  bundlerRequests: 0,
  paymasterRequests: 0,
  averageDelay: 0,
  torEnabled: true,
  errors: 0,
  recentRequests: [] // Store last 10 requests with entry/exit IPs
};

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve the apple-app-site-association file with correct headers
const serveAASA = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');

  const association = {
    "webcredentials": {
      "apps": [IOS_APP_ID]
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
        "package_name": BUNDLE_ID,
        "sha256_cert_fingerprints": [
          ANDROID_SHA256_FINGERPRINT
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

// Privacy proxy helper functions
function randomDelay(min = 100, max = 500) {
  const delay = Math.random() * (max - min) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

async function proxyThroughTor(url, body, requestType, entryIP) {
  const startTime = Date.now();

  try {
    // Get Tor exit IP (what Pimlico sees)
    let exitIP = 'unknown';
    try {
      const ipCheckResponse = await fetch('https://api.ipify.org?format=json', {
        agent: torAgent
      });
      const ipData = await ipCheckResponse.json();
      exitIP = ipData.ip;
    } catch (e) {
      console.warn('⚠️ Could not fetch exit IP:', e.message);
    }

    // Strip identifying headers - only send essential ones
    const cleanHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
      // NO User-Agent, NO X-Forwarded-For, NO other identifying headers
    };

    // Make request through Tor
    const response = await fetch(url, {
      method: 'POST',
      headers: cleanHeaders,
      body: JSON.stringify(body),
      agent: torAgent
    });

    const data = await response.json();

    // Add random timing obfuscation
    await randomDelay();

    const duration = Date.now() - startTime;

    // Log privacy protection details
    console.log(`🧅 Tor proxy: ${requestType} request completed`);
    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log(`   📍 Entry IP (real user): ${entryIP}`);
    console.log(`   🌍 Exit IP (Pimlico sees): ${exitIP}`);
    console.log(`   ✅ Privacy protected: ${entryIP !== exitIP ? 'YES' : 'NO'}`);

    // Update metrics
    privacyMetrics.totalRequests++;
    privacyMetrics.averageDelay =
      (privacyMetrics.averageDelay * (privacyMetrics.totalRequests - 1) + duration) /
      privacyMetrics.totalRequests;

    // Store in recent requests (last 10)
    privacyMetrics.recentRequests.unshift({
      timestamp: new Date().toISOString(),
      type: requestType,
      entryIP,
      exitIP,
      duration,
      privacyProtected: entryIP !== exitIP
    });
    if (privacyMetrics.recentRequests.length > 10) {
      privacyMetrics.recentRequests.pop();
    }

    return { success: true, data };
  } catch (error) {
    privacyMetrics.errors++;
    console.error('❌ Tor proxy error:', error.message);
    return { success: false, error: error.message };
  }
}

// Privacy Proxy Routes

// Bundler RPC endpoint (Pimlico v1)
app.post('/rpc/bundler', async (req, res) => {
  console.log('🔒 Privacy proxy: Bundler request received');
  privacyMetrics.bundlerRequests++;

  // Get entry IP (real user IP from ngrok/reverse proxy or direct connection)
  const entryIP = req.headers['x-forwarded-for']?.split(',')[0] ||
                   req.headers['x-real-ip'] ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   'unknown';

  // Forward the entire JSON-RPC request (viem adds jsonrpc and id automatically)
  const rpcRequest = req.body;

  if (!rpcRequest.method || !rpcRequest.params) {
    return res.status(400).json({ error: 'Missing method or params' });
  }

  const pimlicoUrl = `https://api.pimlico.io/v1/sepolia/rpc?apikey=${PIMLICO_API_KEY}`;

  const result = await proxyThroughTor(pimlicoUrl, rpcRequest, 'bundler', entryIP);

  if (result.success) {
    res.json(result.data);
  } else {
    res.status(500).json({ error: 'Proxy failed', message: result.error });
  }
});

// Paymaster RPC endpoint (Pimlico v2)
app.post('/rpc/paymaster', async (req, res) => {
  console.log('🔒 Privacy proxy: Paymaster request received');
  privacyMetrics.paymasterRequests++;

  // Get entry IP (real user IP from ngrok/reverse proxy or direct connection)
  const entryIP = req.headers['x-forwarded-for']?.split(',')[0] ||
                   req.headers['x-real-ip'] ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   'unknown';

  // Forward the entire JSON-RPC request (viem adds jsonrpc and id automatically)
  const rpcRequest = req.body;

  if (!rpcRequest.method || !rpcRequest.params) {
    return res.status(400).json({ error: 'Missing method or params' });
  }

  const pimlicoUrl = `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`;

  const result = await proxyThroughTor(pimlicoUrl, rpcRequest, 'paymaster', entryIP);

  if (result.success) {
    res.json(result.data);
  } else {
    res.status(500).json({ error: 'Proxy failed', message: result.error });
  }
});

// Privacy metrics endpoint
app.get('/privacy/metrics', (req, res) => {
  res.json({
    ...privacyMetrics,
    torProxy: TOR_PROXY,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Privacy status check
app.get('/privacy/status', async (req, res) => {
  try {
    // Test if Tor is working by checking current IP through Tor
    const response = await fetch('https://api.ipify.org?format=json', {
      agent: torAgent
    });
    const data = await response.json();

    res.json({
      torConnected: true,
      torProxy: TOR_PROXY,
      exitIP: data.ip,
      message: 'Tor connection is working! Exit IP shown above.'
    });
  } catch (error) {
    res.status(500).json({
      torConnected: false,
      torProxy: TOR_PROXY,
      error: error.message,
      message: 'Tor connection failed. Is Tor running on port 9050?'
    });
  }
});

// Catch-all route to log any unhandled requests
app.get('*', (req, res) => {
  console.log(`[${new Date().toISOString()}] ⚠️  UNHANDLED REQUEST: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not found', requestedPath: req.url });
});

app.listen(port, () => {
  console.log(`🔗 Domain association server running on http://localhost:${port}`);
  console.log(`📱 Apple App Site Association available at: http://localhost:${port}/apple-app-site-association`);
  console.log('');
  console.log('🔒 Privacy Proxy Endpoints:');
  console.log(`   POST http://localhost:${port}/rpc/bundler - Pimlico bundler via Tor`);
  console.log(`   POST http://localhost:${port}/rpc/paymaster - Pimlico paymaster via Tor`);
  console.log(`   GET  http://localhost:${port}/privacy/status - Check Tor connection`);
  console.log(`   GET  http://localhost:${port}/privacy/metrics - View privacy metrics`);
  console.log('');
  console.log('Next steps:');
  console.log(`In another terminal, run: ngrok http ${port} --domain=${NGROK_DOMAIN}`);
  console.log('');
  console.log('💡 Visit http://localhost:' + port + ' for full instructions');
  console.log('🧅 Tor proxy: ' + TOR_PROXY);
});
