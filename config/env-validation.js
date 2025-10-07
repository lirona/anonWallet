// Environment variable validation
// This module ensures all required environment variables are set at build time

const requiredEnvVars = [
  'EXPO_PUBLIC_RPC_URL',
  'EXPO_PUBLIC_FACTORY_CONTRACT_ADDRESS',
  'EXPO_PUBLIC_RELAYER_PRIVATE_KEY',
  'EXPO_PUBLIC_PIMLICO_API_KEY',
  'EXPO_PUBLIC_APP_ID',
  'EXPO_PUBLIC_ASSOCIATED_DOMAIN',
];

function validateEnvironment() {
  const missingVars = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    console.error('\n❌ Build failed: Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Make sure to run with the correct npm script:');
    console.error('   - npm start (uses .env.dev)');
    console.error('   - npm run android (uses .env.dev)');
    console.error('   - npm run ios (uses .env.dev)');
    console.error('   - Or use dotenvx directly: dotenvx run --env-file=.env.dev -- expo <command>\n');

    // Crash the build
    process.exit(1);
  }

  console.log('✅ All required environment variables are set');
}

// Run validation immediately when this module is imported
validateEnvironment();