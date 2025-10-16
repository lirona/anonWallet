# 🥷 Resilient Activist Technology

## DEMO - https://www.loom.com/share/3cd198e119f94a4ba72af50949e8c326?sid=47dee2ef-43e9-4a47-84a0-5c0b7934d794

## Project Overview
 anonWallet was built by activists, for activists, as part of our bigger vision to create a secure community operating system that empowers activists to interact, organize, and trade freely within their communities. Being tech leaders in our activist community, and after creating a [privacy recommendation doc](https://docs.google.com/document/d/1cEIUkHSyYWG0B9wKeQRk2IgXKWflW0QkZzoSkHvndzw) for the community, we decided to take on the challenge and build this tool as part of the RealFi hackathon.

  anonWallet is the first step in this operating system, and its primary purpose is to establish a Universal Basic Income (UBI) system for activists, enabling us to trade among ourselves in a private, community-based economy. On wallet creation, activists receive an initial amount of community tokens, and every week a coupon code is released to the community allowing them to redeem additional tokens.

  The tool specifically addresses the need for safe, private, and resilient economic infrastructure that supports grassroots organizing and community resilience under adversarial conditions. anonWallet enables activists to:
   - **Opt out of the state financial system** into a private economy
   - **Trade using the community token** without intermediaries
   - **Maintain anonymity** even under sophisticated surveillance
   - **Organize economic alternatives** resistant to censorship

---

## Resilience, Security, and Usability

### Resilience

- **Account Abstraction:** Advanced ERC-4337 smart contract wallets provide enhanced security without traditional private key management, and the ability to fallback on different providers
- **Cross-Platform Compatibility:** Full support for iOS, Android, and Web, ensuring accessibility across different devices and communities. The web version enhances resilience by providing an additional access point that doesn't require app store approval, making the tool available even if mobile versions face restrictions

### Security & Privacy

- **Complete Anonymity:** anonWallet is totally anonymous with no KYC and no identifying data linked to the wallet address, ensuring that wallet creation and usage cannot be tied to any personal information
- **Network-Level Anonymity:** All requests are routed through Tor SOCKS5 proxy with IP address stripping
- **Passkey Authentication:** WebAuthn/FIDO2 standard biometric authentication eliminates private key exposure while providing strong security. Cryptographic keys never leave secure enclave and can't be extracted even under device seizure or forensic analysis
- **No Seed Phrases:** No mnemonic backup phrases to be discovered - complete security through biometric-only access
- **Network Metadata Protection:** Complete elimination of User-Agent, X-Forwarded-For, and other identifying headers that could compromise anonymity
- **Timing Obfuscation:** Random delays (100-500ms) added to requests as an extra security measure to prevent timing-based correlation analysis

### Usability

- **Biometric Authentication:** Simple, familiar face/Touch ID unlock requiring no seed phrases to secure and no passwords to remember
- **Mobile-First Design:** Intuitive mobile interface designed for activists who primarily access services through smartphones
- **Streamlined Onboarding:** No complex setup - just authenticate with biometrics and immediately begin using the wallet
- **Blockchain Abstraction:** All blockchain-related features are abstracted away from the user, making the technology accessible to non-technical users without requiring knowledge of cryptocurrency concepts
- **Gas Sponsorship:** Paymasters sponsor gas fees, removing barriers to entry and ensuring activists can use the wallet without needing prior cryptocurrency
- **Simple Banking UX:** Familiar banking-style interface that feels intuitive to users without crypto experience
- **Secure Backup:** Passkeys are encrypted and backed up in Google Password Manager/iCloud, allowing wallet restoration on other devices

---

## Threat Model and Potential Limitations

### Threat Model: Semi-Honest Blockchain Infrastructure

**Adversary Capabilities:**
- Can log all RPC requests to bundlers/paymasters (from different Tor exit IPs)
- Can potentially analyze transaction timing patterns and behavioral characteristics for correlation
- May attempt to identify and target users based on transaction behavior (despite IP address protection)
- Can seize activist's devices

**Our Defense:**
- Tor routing with different exit IPs and random circuits prevents direct IP-based correlation and enhances anonymity
- Complete metadata stripping prevents fingerprinting and identification
- Request timing obfuscation with random delays (100-500ms) prevents timing-based correlation
- Hardware-bound passkeys in secure enclaves prevent key extraction during device seizure
- No seed phrases eliminate possibility of surrendering credentials under coercion

**Limitations & Trade-offs:**

- **On-chain Privacy:** Transactions remain visible on the public blockchain
- **Performance Impact:** Tor routing adds 200-800ms latency per transaction
- **Infrastructure Dependency:** Relies on Tor network availability and internet connection
- **Regulatory Risk:** Use of privacy tools may attract additional scrutiny in some jurisdictions
- **App Store Access:** Privacy tools may face rejection from app stores due to policies restricting anonymity features; however, our web app provides an accessible backup solution

**Not Protected Against:**

- On-chain transaction analysis and clustering
- Identifying wallets through community token interactions (all transactions on these wallets will involve the same token)
- Global passive surveillance of entire Tor network (state-level adversaries)

---

### On the Roadmap

- Anonymous message board using Waku on web version and (when supported) on mobile versions of the app
- Offline transaction queueing
- Rotating bundler support
- Multiple paymaster integration

## Additional Resources

- **Privacy Architecture**: See `privacy.md` for detailed Tor implementation
- **Logos Forum Post**: [Forum discussion](#)

---

*Built with ❤️ by activists, for activists*
