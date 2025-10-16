# anonWallet

A React Native wallet application built with Expo, featuring Account Abstraction (ERC-4337) and WebAuthn-based authentication using Passkeys. Users can create smart contract wallets secured by biometric authentication without managing private keys directly.

## Features

- **Account Abstraction (ERC-4337)**: Smart contract wallets with gas sponsorship via Pimlico
- **Passkey Authentication**: Secure biometric login using WebAuthn/FIDO2 standards
- **Cross-platform**: iOS and Android support via Expo
- **Redux State Management**: Centralized app state with Redux Toolkit
- **Environment Management**: Multiple deployment environments with dotenvx

## Technology Stack

- **Frontend**: React Native, Expo Router, TypeScript
- **Blockchain**: viem, Account Abstraction (ERC-4337)
- **Authentication**: WebAuthn/Passkeys, react-native-passkeys
- **State Management**: Redux Toolkit
- **Environment**: dotenvx for multi-environment configuration

## Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (Xcode) for iOS development
- Android Studio and Android SDK for Android development
- ngrok account for WebAuthn domain association
```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### Android SDK Setup
For Android development, you need to set the Android SDK location and add tools to PATH:

```bash
# Add to ~/.zshrc or ~/.bashrc
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Linux
# export ANDROID_HOME=$HOME/Android/Sdk
# export PATH=$PATH:$ANDROID_HOME/platform-tools

# Windows (CMD)
# set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
# set PATH=%PATH%;%ANDROID_HOME%\platform-tools

# Windows (PowerShell)
# $env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
# $env:PATH="$env:PATH;$env:ANDROID_HOME\platform-tools"
```

After adding, reload your shell:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

## API Keys Required

You'll need to obtain the following API keys:

### 1. Alchemy (RPC Provider)
1. Visit [Alchemy.com](https://alchemy.com) and create an account
2. Generate an API key for Sepolia testnet
3. Use in `EXPO_PUBLIC_RPC_URL`

### 2. Pimlico (Account Abstraction)
1. Visit [Pimlico.io](https://pimlico.io) and create an account
2. Generate an API key for Sepolia testnet
3. Use in `EXPO_PUBLIC_PIMLICO_API_KEY` (should start with `pim_`)

## ngrok Setup (Required for WebAuthn)

WebAuthn requires a valid domain for associated domain verification. For local development, we use ngrok:

1. Visit [ngrok.com](https://ngrok.com) and sign up
2. Get your auth token from [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)
3. Configure ngrok:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```
4. Go to [ngrok dashboard > Domains](https://dashboard.ngrok.com/domains)
5. Create a new domain (free tier allows 1 static domain)
6. Note your domain (e.g., `your-app-12345.ngrok-free.app`)

## Local Development Setup

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd anonWallet
npm install
```

### 2. Environment Configuration
1. Copy the environment template:
```bash
cp .env.dev.example .env.dev
```

2. Fill in your API keys and configuration in `.env.dev`:
```env
EXPO_PUBLIC_ENV=development

# Your Alchemy API key
EXPO_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key-here

# Deploy factory contract or use existing - below is the Ethereum Sepolia testnet address of the factory contract
EXPO_PUBLIC_FACTORY_CONTRACT_ADDRESS=0xDD0f9cB4Cf53d28b976C13e7ee4a169F841924c0

# The private key of the relayer account - this account pays for gas before the user's wallet is deployed. This can be eliminated in the future.
# Make sure this is funded with Sepolia ETH
EXPO_PUBLIC_RELAYER_PRIVATE_KEY=0xYourPrivateKey

# Your Pimlico API key
EXPO_PUBLIC_PIMLICO_API_KEY=pim_your_api_key

# iOS App ID
EXPO_PUBLIC_BUNDLE_ID=demo.com.anonymous.anonWallet

# Your ngrok domain
EXPO_PUBLIC_ASSOCIATED_DOMAIN=your-ngrok-domain.app
```

### 3. Start the Associated Domain Server
The WebAuthn flow requires a server to serve domain association files:

```bash
# In a separate terminal
cd associated-domain-server
npm install && npm start
```

### 4. Start ngrok
Point ngrok to the associated domain server:

```bash
# In another terminal - use your reserved domain
ngrok http 8080 --domain=your-app-12345.ngrok-free.app

# Or without reserved domain (domain will change each time)
ngrok http 8080
```

### 5. Configure Emulator/Simulator for Passkeys

#### iOS Simulator Setup
1. **Enable Face ID/Touch ID:**
   - In iOS Simulator menu bar: **Features** → **Face ID** → **Enrolled** (toggle ON)
   - During passkey prompt, use: **Features** → **Face ID** → **Matching Face** to authenticate

#### Android Emulator Setup (Required)

**⚠️ CRITICAL:** Passkeys on Android require proper emulator configuration. Without these steps, passkeys will silently fail to save.

1. **Sign in with Google Account:**
   - Open emulator
   - Go to **Settings** → **Passwords & accounts** → **Add account** → **Google**
   - Sign in with your Google account (required for Google Password Manager)

2. **Enable Biometric Authentication (Optional but Recommended):**
   - Once PIN is set, go to **Settings** → **Security** → **Device Unlock** → **Pixel Imprint (set up fingerprint)**
   - Follow enrollment wizard (you can use extended controls (three dots on side menu) → Fingerprint to simulate fingerprints)
   - During passkey authentication, use the fingerprint sensor overlay or enter PIN

3. **Configure Android SHA-256 Certificate Fingerprint:**

   The Android App Links (for passkeys) require a SHA-256 certificate fingerprint to verify your app. This fingerprint must match your signing keystore.

   **For Development (Debug Keystore):**
   ```bash
   # From the project root, extract SHA-256 fingerprint from debug keystore
   keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA256
   ```

   **For Production (Release Keystore):**
   ```bash
   # From the project root, extract SHA-256 fingerprint from your release keystore
   keytool -list -v -keystore android/app/your-release.keystore -alias your-key-alias -storepass your-store-password -keypass your-key-password | grep SHA256
   ```

   **Copy the SHA-256 fingerprint** (format: `AA:BB:CC:DD:...`) and add it to your `.env.dev` or `.env.prod` file:
   ```env
   EXPO_PUBLIC_ANDROID_SHA256_FINGERPRINT=FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C
   ```

   ⚠️ **Important Notes:**
   - Development and production keystores have **different fingerprints**
   - You must update the fingerprint when switching between debug and release builds
   - The fingerprint is used by the associated-domain-server for Android App Links verification
   - Without the correct fingerprint, passkeys will not work on Android

### 6. Run the Application

For development:
```bash
# iOS
npm run prebuild && npm run ios
## To see logs go to Device -> Shake -> Devtools in the top bar of the iOS Simulator

# Android (make sure ANDROID_HOME is in PATH)
npm run prebuild && npm run android
```

For production builds:
```bash
# iOS
npm run ios:prod

# Android
npm run android:prod
```

## Project Structure

```
├── app/                    # Expo Router pages
├── components/            # Reusable UI components
├── config/               # Configuration files
├── constants/            # App constants
├── contracts/            # Smart contract ABIs
├── hooks/                # Custom React hooks
├── slices/               # Redux Toolkit slices
├── types/                # TypeScript type definitions
├── utils/                # Utility functions
├── associated-domain-server/ # WebAuthn domain server
└── polyfills.ts          # Required polyfills
```

## Troubleshooting

### WebAuthn Issues
- Ensure ngrok is running and accessible
- Verify associated domains are correctly configured in Xcode
- Check that the domain in `.env.dev` matches your ngrok domain

### Build Issues
- Run `npx expo doctor` to check for common issues
- Ensure all environment variables are set
- Try clearing Metro cache: `npx expo start --clear`

### iOS Simulator Issues
- Passkeys require iOS 16+ simulator or device

### Common errors
- `IOS: Biometrics must be enabled`
  - In the iOS Simulator top bar, go to Features -> FaceID (Enrolled must be toggled on)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both iOS and Android
5. Submit a pull request

## License
[MIT](https://choosealicense.com/licenses/mit/)
