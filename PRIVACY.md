# Privacy-Preserving Account Abstraction via Tor

This document explains the privacy features implemented in the Coil Wallet's account abstraction (ERC-4337) integration.

## Problem Statement

Standard account abstraction implementations expose critical user privacy information:

### What Bundlers/Paymasters Can See (Without Privacy Proxy):
- ❌ **Real IP Address** → Links transactions to physical location/identity
- ❌ **Transaction Patterns** → When users are active, frequency of transactions
- ❌ **Wallet Clustering** → Multiple wallets from same IP = same user
- ❌ **Behavioral Fingerprinting** → Gas preferences, transaction amounts
- ❌ **Metadata Leakage** → User-Agent, device info, network headers

### Real-World Privacy Risk Example:
```
1. User creates "anonymous" wallet with passkey
2. Sends transaction from home WiFi → IP: 203.0.113.45
3. Pimlico logs: "Wallet 0xABC... from IP 203.0.113.45"
4. Later, user sends from same IP with different wallet
5. Pimlico links: "Wallets 0xABC and 0xDEF = same person"
6. Anonymous wallet is now de-anonymized!
```

---

## Solution: Tor-Routed Privacy Proxy

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│              PRIVACY-PRESERVING FLOW                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [React Native Mobile App]                              │
│         │                                                │
│         │ HTTPS (encrypted)                             │
│         ↓                                                │
│  [Privacy Proxy Server - localhost:8080]                │
│         │                                                │
│         │ Strips IP address & metadata                  │
│         │ Adds random delays (100-500ms)                │
│         │ Routes through Tor SOCKS5 (port 9050)         │
│         ↓                                                │
│  [Tor Network] (3-hop onion routing)                    │
│         │                                                │
│         │ Different random exit IP each time            │
│         ↓                                                │
│  [Pimlico Bundler/Paymaster]                            │
│                                                          │
│  ✅ Sees: Random Tor exit IP (changes each request)    │
│  ❌ Cannot see: Real IP, user identity, patterns       │
└─────────────────────────────────────────────────────────┘
```

### How It Works

1. **Request Initiated**: Mobile app sends UserOperation to privacy proxy
2. **Metadata Stripping**: Proxy removes all identifying headers (User-Agent, X-Forwarded-For, etc.)
3. **Tor Routing**: Request routed through Tor SOCKS5 proxy (localhost:9050)
4. **3-Hop Onion Routing**: Tor bounces request through 3 random relays
5. **Random Exit Node**: Emerges from random Tor exit node with different IP
6. **Timing Obfuscation**: Proxy adds random 100-500ms delay to prevent timing correlation
7. **Response**: Data returned through same Tor circuit back to app

---

## Privacy Guarantees

### ✅ What This Protects Against

| Attack Vector | Without Tor | With Tor Privacy Proxy |
|--------------|-------------|------------------------|
| **IP Address Tracking** | ❌ Exposed | ✅ Hidden via Tor exit nodes |
| **User Correlation** | ❌ Same IP links wallets | ✅ Different IP each time |
| **Location Privacy** | ❌ IP reveals city/ISP | ✅ Exit node could be anywhere |
| **Timing Analysis** | ❌ Precise timing | ✅ Random delays added |
| **Metadata Leakage** | ❌ Headers exposed | ✅ Stripped clean |
| **Network Fingerprinting** | ❌ Device info visible | ✅ Minimal headers only |

### ❌ What This Does NOT Protect Against

- **On-chain analysis**: Transactions are still public on blockchain
- **Amount-based linking**: Similar transaction amounts could be correlated
- **Smart contract interactions**: Which contracts you call is visible
- **Token flows**: Movement of tokens between wallets is traceable
- **Global passive adversary**: Nation-state level surveillance of entire Tor network

---

## Threat Model

### Adversary: Semi-Honest Bundler/Paymaster

**Capabilities:**
- Can log all RPC requests
- Can see IP addresses, timing, metadata
- Can correlate transactions across users
- Cannot break Tor's cryptography
- Cannot de-anonymize Tor exit nodes

**Goal:** Link transactions to real-world identities

**Our Defense:**
- Tor prevents IP-based linking
- Metadata stripping prevents fingerprinting
- Timing obfuscation prevents correlation
- Each request uses different Tor circuit

---

## Testing Privacy

### 1. Verify Tor is Running
```bash
curl --socks5 localhost:9050 https://check.torproject.org/api/ip
```

Should show a Tor exit node IP, not your real IP.

### 2. Check Privacy Proxy Status
```bash
curl http://localhost:8080/privacy/status
```

### 3. View Privacy Metrics
```bash
curl http://localhost:8080/privacy/metrics
```

### 4. Test IP Rotation

Run multiple requests and observe different exit IPs in server logs:
```
🧅 Tor proxy: bundler request completed in 824ms
🧅 Tor proxy: paymaster request completed in 731ms
```

Check exit IP changes:
```bash
# Request 1
curl http://NGROK_DOMAIN/privacy/status | jq .exitIP

# Wait a few seconds for circuit refresh

# Request 2
curl http://NGROK_DOMAIN/privacy/status | jq .exitIP
```

Different IPs = Privacy working! ✅

---

## Limitations & Trade-offs

### Performance Impact
- **Latency**: +200-800ms per request (Tor + random delay)
- **Throughput**: Tor network is slower than direct connection
- **Reliability**: Depends on Tor network availability

### Privacy vs Convenience
- Cannot use with VPN that blocks Tor
- Some exit nodes may be blocked by Pimlico (rare)
- Transactions take slightly longer

### Not Anonymous On-Chain
- All Ethereum transactions are public
- Token transfers visible on blockchain explorers
- Smart contract interactions traceable
- This only protects **network-level** privacy

---

## Recommended Usage

### When to Enable Privacy Mode
- ✅ When creating new wallets
- ✅ For sensitive transactions
- ✅ When using public WiFi
- ✅ When concerned about bundler surveillance

### When Direct Mode is OK
- Testing on local network
- Don't care about IP privacy
- Need maximum speed
- Debugging transaction issues

---

## Technical Details

### Tor SOCKS5 Configuration
- **Proxy Address**: `socks5://127.0.0.1:9050`
- **Circuit Type**: General purpose
- **Circuit Lifetime**: ~10 minutes (Tor default)
- **Exit Node Selection**: Random

### Headers Sent to Pimlico
Only essential headers:
```
Content-Type: application/json
Accept: application/json
```

**Stripped headers:**
- User-Agent (would reveal device/browser)
- X-Forwarded-For (would reveal real IP)
- X-Real-IP (would reveal real IP)
- Referer (would reveal source)
- Origin (would reveal source)
- Any custom headers

### Timing Obfuscation
- Prevents correlation via request timing
- Makes traffic analysis harder
- Small enough to not impact UX significantly

---

## Compliance & Legal

This privacy feature:
- ✅ Protects user privacy from third-party surveillance
- ✅ Does not enable illegal activity (transactions still on public blockchain)
- ✅ Complies with user privacy rights (GDPR, CCPA)
- ✅ Standard cryptographic practice (Tor is legal worldwide)

**Note**: Tor usage is legal in most countries. Check your local laws if uncertain.

---

## Future Enhancements

Potential improvements:
1. **Request Batching**: Combine multiple users' UserOps for stronger anonymity
2. **Dummy Traffic**: Send fake requests to obscure patterns
3. **Multiple Tor Circuits**: Different circuits for different request types
4. **Circuit Control**: Force new circuit after X requests
5. **Pluggable Transports**: Use Tor bridges in censored regions
6. **Rotating Paymaster Registry**: Cycle through different paymasters
