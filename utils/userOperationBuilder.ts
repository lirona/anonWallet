import { type Hex, parseEther, toHex, encodeAbiParameters, encodePacked } from 'viem';
import { get } from 'react-native-passkeys';
import { p256 } from '@noble/curves/nist.js';
import { fromBase64urlToBytes } from '@/utils/base64';

import { type UserOperation } from '@/types/userOperation';
import { getPasskeyAuthenticationOptions } from '@/config/webauthn';
import {
  getSmartWalletAddress,
  isWalletDeployed,
  getNonce,
  generateInitCode,
  generateTransferCallData,
  estimateUserOperationGas,
  getGasPrices,
  getUserOperationHash,
  submitUserOperation,
} from '@/utils/smartWallet';

/**
 * Build complete UserOperation for transferring 0.0001 ETH back to relayer
 */
export async function buildUserOperation(
  publicKeyArray: readonly [Hex, Hex],
  relayerAddress: Hex
): Promise<UserOperation> {
  console.log('🏗️ Building UserOperation...');
  console.log('📋 Input parameters:', {
    publicKeyArray,
    relayerAddress,
  });

  // 1. Calculate smart wallet address
  const walletAddress: Hex = await getSmartWalletAddress(publicKeyArray);
  console.log('📍 Smart wallet address:', walletAddress);

  // 2. Check if wallet is deployed
  const deployed: boolean = await isWalletDeployed(walletAddress);
  console.log('🔍 Wallet deployed:', deployed);

  // 3. Generate initCode (only if not deployed)
  const initCode: Hex = deployed ? '0x' : generateInitCode(publicKeyArray);
  console.log('⚙️ InitCode:', {
    deployed,
    initCode,
    initCodeLength: initCode.length,
  });

  // 4. Get nonce
  const nonce: bigint = await getNonce(walletAddress);
  console.log('🔢 Nonce:', {
    nonce: nonce.toString(),
    nonceHex: `0x${nonce.toString(16)}`,
  });

  // 5. Generate callData for 0.0001 ETH transfer
  const transferAmount: bigint = parseEther('0.0001');
  const callData: Hex = generateTransferCallData(relayerAddress, transferAmount);
  console.log('📤 Transfer callData:', {
    to: relayerAddress,
    amount: transferAmount.toString(),
    amountEth: '0.0001',
    callData,
    callDataLength: callData.length,
  });

  // 6. Get gas prices
  const { maxFeePerGas, maxPriorityFeePerGas } = await getGasPrices();
  console.log('⛽ Gas prices:', {
    maxFeePerGas: maxFeePerGas.toString(),
    maxFeePerGasGwei: (maxFeePerGas / 1000000000n).toString(),
    maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
    maxPriorityFeePerGasGwei: (maxPriorityFeePerGas / 1000000000n).toString(),
  });

  // 7. Create initial UserOperation with estimated values
  const initialUserOp: UserOperation = {
    sender: walletAddress,
    nonce,
    initCode,
    callData,
    callGasLimit: 100000n, // Initial estimate
    verificationGasLimit: deployed ? 150000n : 300000n, // Higher for deployment
    preVerificationGas: 50000n, // Initial estimate
    maxFeePerGas,
    maxPriorityFeePerGas,
    paymasterAndData: '0x', // No paymaster
    signature: '0x', // Placeholder
  };

  console.log('🏗️ Initial UserOperation:', {
    sender: initialUserOp.sender,
    nonce: initialUserOp.nonce.toString(),
    initCode: initialUserOp.initCode,
    callData: initialUserOp.callData,
    callGasLimit: initialUserOp.callGasLimit.toString(),
    verificationGasLimit: initialUserOp.verificationGasLimit.toString(),
    preVerificationGas: initialUserOp.preVerificationGas.toString(),
    maxFeePerGas: initialUserOp.maxFeePerGas.toString(),
    maxPriorityFeePerGas: initialUserOp.maxPriorityFeePerGas.toString(),
    paymasterAndData: initialUserOp.paymasterAndData,
    signature: initialUserOp.signature,
  });

  // 8. Estimate gas using Pimlico
  console.log('🔍 Estimating gas with Pimlico...');
  try {
    const gasEstimate = await estimateUserOperationGas(initialUserOp);
    console.log('⛽ Gas estimates from Pimlico:', gasEstimate);

    // Apply safety margins (150% as in your reference implementation)
    const safetyMargin = 150n;
    const originalGasLimits = {
      callGasLimit: initialUserOp.callGasLimit,
      verificationGasLimit: initialUserOp.verificationGasLimit,
      preVerificationGas: initialUserOp.preVerificationGas,
    };

    initialUserOp.callGasLimit = (BigInt(gasEstimate.callGasLimit) * safetyMargin) / 100n;
    initialUserOp.verificationGasLimit = (BigInt(gasEstimate.verificationGasLimit) * safetyMargin) / 100n;
    initialUserOp.preVerificationGas = (BigInt(gasEstimate.preVerificationGas) * safetyMargin) / 100n;

    console.log('⛽ Gas limits comparison:', {
      original: {
        callGasLimit: originalGasLimits.callGasLimit.toString(),
        verificationGasLimit: originalGasLimits.verificationGasLimit.toString(),
        preVerificationGas: originalGasLimits.preVerificationGas.toString(),
      },
      estimated: {
        callGasLimit: gasEstimate.callGasLimit,
        verificationGasLimit: gasEstimate.verificationGasLimit,
        preVerificationGas: gasEstimate.preVerificationGas,
      },
      final: {
        callGasLimit: initialUserOp.callGasLimit.toString(),
        verificationGasLimit: initialUserOp.verificationGasLimit.toString(),
        preVerificationGas: initialUserOp.preVerificationGas.toString(),
      },
      safetyMargin: `${safetyMargin}%`,
    });
  } catch (error) {
    console.warn('⚠️ Gas estimation failed, using fallback values');
    console.warn('❌ Gas estimation error:', error);

    // Keep initial estimates with safety margin
    const fallbackGasLimits = {
      callGasLimit: 150000n,
      verificationGasLimit: deployed ? 200000n : 400000n,
      preVerificationGas: 75000n,
    };

    initialUserOp.callGasLimit = fallbackGasLimits.callGasLimit;
    initialUserOp.verificationGasLimit = fallbackGasLimits.verificationGasLimit;
    initialUserOp.preVerificationGas = fallbackGasLimits.preVerificationGas;

    console.log('🔄 Fallback gas limits:', {
      callGasLimit: fallbackGasLimits.callGasLimit.toString(),
      verificationGasLimit: fallbackGasLimits.verificationGasLimit.toString(),
      preVerificationGas: fallbackGasLimits.preVerificationGas.toString(),
    });
  }

  console.log('✅ Final UserOperation built:', {
    sender: initialUserOp.sender,
    nonce: initialUserOp.nonce.toString(),
    initCode: initialUserOp.initCode,
    callData: initialUserOp.callData,
    callGasLimit: initialUserOp.callGasLimit.toString(),
    verificationGasLimit: initialUserOp.verificationGasLimit.toString(),
    preVerificationGas: initialUserOp.preVerificationGas.toString(),
    maxFeePerGas: initialUserOp.maxFeePerGas.toString(),
    maxPriorityFeePerGas: initialUserOp.maxPriorityFeePerGas.toString(),
    paymasterAndData: initialUserOp.paymasterAndData,
    signature: initialUserOp.signature,
  });

  return initialUserOp;
}

/**
 * Sign UserOperation with WebAuthn and submit to bundler
 */
export async function signAndSubmitUserOperation(
  userOp: UserOperation,
  rawIdBase64url: string
): Promise<Hex> {
  console.log('✍️ Starting UserOperation signing...');
  console.log('📋 Signing inputs:', {
    userOp: {
      sender: userOp.sender,
      nonce: userOp.nonce.toString(),
      initCode: userOp.initCode,
      callData: userOp.callData,
    },
    rawIdBase64url,
  });

  // 1. Get UserOperation hash for signing
  const userOpHash: Hex = await getUserOperationHash(userOp);
  console.log('🏷️ UserOp hash details:', {
    userOpHash,
    hashLength: userOpHash.length,
  });

  // 2. Create proper challenge that matches what SimpleAccount expects:
  // The contract validates against: abi.encodePacked(version, validUntil, userOpHash)
  const version = 1;
  const validUntil = 0; // Use 0 like working implementation

  const messageToVerify: Hex = encodePacked(
    ['uint8', 'uint48', 'bytes32'],
    [version, validUntil, userOpHash]
  );

  const challengeBytes: Uint8Array = new Uint8Array(
    messageToVerify.slice(2).match(/.{2}/g)!.map(byte => parseInt(byte, 16))
  );
  const challenge: string = btoa(String.fromCharCode(...challengeBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  console.log('🎯 Challenge creation (corrected):', {
    version,
    validUntil,
    userOpHash,
    messageToVerify,
    messageToVerifyLength: messageToVerify.length,
    challengeBytes: Array.from(challengeBytes),
    challengeBytesLength: challengeBytes.length,
    challenge,
    challengeLength: challenge.length,
  });

  // 3. Sign with WebAuthn using existing credential
  console.log('🔐 Preparing WebAuthn authentication...');
  const authOptions = getPasskeyAuthenticationOptions(challenge, rawIdBase64url);
  console.log('📋 WebAuthn auth options:', authOptions);

  console.log('🔐 Prompting user to sign with passkey...');
  const assertion = await get(authOptions);

  if (!assertion) {
    console.error('❌ WebAuthn assertion failed or was cancelled');
    throw new Error('WebAuthn assertion failed or was cancelled');
  }

  console.log('✅ WebAuthn assertion received:', {
    id: assertion.id,
    rawId: assertion.rawId,
    type: assertion.type,
    response: {
      authenticatorData: assertion.response.authenticatorData,
      clientDataJSON: assertion.response.clientDataJSON,
      signature: assertion.response.signature,
      userHandle: assertion.response.userHandle,
    },
  });

  // 4. Format signature for SimpleAccount
  const signature: Hex = formatWebAuthnSignature(assertion);
  console.log('📝 Signature formatting complete:', {
    signature,
    signatureLength: signature.length,
  });

  // 5. Update UserOperation with signature
  const signedUserOp: UserOperation = {
    ...userOp,
    signature,
  };

  console.log('✅ Signed UserOperation:', {
    sender: signedUserOp.sender,
    nonce: signedUserOp.nonce.toString(),
    initCode: signedUserOp.initCode,
    callData: signedUserOp.callData,
    callGasLimit: signedUserOp.callGasLimit.toString(),
    verificationGasLimit: signedUserOp.verificationGasLimit.toString(),
    preVerificationGas: signedUserOp.preVerificationGas.toString(),
    maxFeePerGas: signedUserOp.maxFeePerGas.toString(),
    maxPriorityFeePerGas: signedUserOp.maxPriorityFeePerGas.toString(),
    paymasterAndData: signedUserOp.paymasterAndData,
    signature: signedUserOp.signature,
  });

  // 6. Submit to Pimlico bundler
  console.log('🚀 Submitting UserOperation to Pimlico bundler...');
  const userOpHash_submitted: Hex = await submitUserOperation(signedUserOp);
  console.log('✅ UserOperation submitted successfully:', {
    userOpHash: userOpHash_submitted,
    userOpHashLength: userOpHash_submitted.length,
  });

  return userOpHash_submitted;
}

/**
 * Format WebAuthn assertion for SimpleAccount signature verification
 *
 * The SimpleAccount contract expects a Signature struct:
 * struct Signature {
 *     bytes authenticatorData;
 *     string clientDataJSON;
 *     uint256 challengeLocation;
 *     uint256 responseTypeLocation;
 *     uint256 r;
 *     uint256 s;
 * }
 */
function formatWebAuthnSignature(assertion: any): Hex {
  console.log('📋 Starting WebAuthn signature formatting...');

  try {
    // Extract components from the WebAuthn assertion (these are base64url strings)
    const authenticatorDataB64url: string = assertion.response.authenticatorData;
    const clientDataJSONB64url: string = assertion.response.clientDataJSON;
    const signatureB64url: string = assertion.response.signature;

    console.log('🔍 WebAuthn assertion components (base64url):', {
      authenticatorData: {
        value: authenticatorDataB64url,
        length: authenticatorDataB64url.length,
      },
      clientDataJSON: {
        value: clientDataJSONB64url,
        length: clientDataJSONB64url.length,
      },
      signature: {
        value: signatureB64url,
        length: signatureB64url.length,
      },
    });

    // 1. Convert base64url components to raw bytes/strings
    const authenticatorDataBytes: Uint8Array = fromBase64urlToBytes(authenticatorDataB64url);
    const clientDataJSONBytes: Uint8Array = fromBase64urlToBytes(clientDataJSONB64url);
    const signatureBytes: Uint8Array = fromBase64urlToBytes(signatureB64url);

    // 2. Convert clientDataJSON bytes to string for analysis
    const clientDataJSONString: string = new TextDecoder().decode(clientDataJSONBytes);

    console.log('📄 Decoded clientDataJSON:', {
      clientDataJSONString,
      stringLength: clientDataJSONString.length,
    });

    // 3. Find required locations in clientDataJSON
    const challengeLocation: number = clientDataJSONString.indexOf('"challenge":"');
    const responseTypeLocation: number = clientDataJSONString.indexOf('"type":"webauthn.get"');

    if (challengeLocation === -1) {
      throw new Error('Challenge not found in clientDataJSON');
    }
    if (responseTypeLocation === -1) {
      throw new Error('Response type not found in clientDataJSON');
    }

    // Compare with working implementation's hardcoded values
    const workingImplChallengeLocation = 23;
    const workingImplResponseTypeLocation = 1;

    console.log('📍 ClientDataJSON location analysis:', {
      actual: {
        challengeLocation,
        responseTypeLocation,
      },
      workingImpl: {
        challengeLocation: workingImplChallengeLocation,
        responseTypeLocation: workingImplResponseTypeLocation,
      },
      matches: {
        challenge: challengeLocation === workingImplChallengeLocation,
        responseType: responseTypeLocation === workingImplResponseTypeLocation,
      }
    });

    // Log what's actually at the working impl's hardcoded positions
    console.log('🔍 Verification - What\'s at working impl hardcoded positions:');
    if (clientDataJSONString.length > workingImplChallengeLocation) {
      console.log('  Challenge location 23:', {
        character: clientDataJSONString[workingImplChallengeLocation],
        surrounding: clientDataJSONString.slice(20, 30),
        expected: '"challenge":"',
        found: clientDataJSONString.slice(workingImplChallengeLocation, workingImplChallengeLocation + 12)
      });
    }

    if (clientDataJSONString.length > workingImplResponseTypeLocation) {
      console.log('  Response type location 1:', {
        character: clientDataJSONString[workingImplResponseTypeLocation],
        surrounding: clientDataJSONString.slice(0, 10),
        expected: '"type"',
        found: clientDataJSONString.slice(workingImplResponseTypeLocation, workingImplResponseTypeLocation + 6)
      });
    }

    // 4. Parse ECDSA signature using @noble/curves (React Native compatible)
    const signature = p256.Signature.fromBytes(signatureBytes, 'der');
    const r = signature.r;
    const s = signature.s;

    console.log('🔐 ECDSA signature components:', {
      r: r.toString(),
      s: s.toString(),
    });

    // 5. ABI encode using tuple structure like working implementation with ACTUAL locations
    const credentials = {
      authenticatorData: toHex(authenticatorDataBytes),
      clientDataJSON: clientDataJSONString,
      challengeLocation: BigInt(challengeLocation),     // Use actual found location
      responseTypeLocation: BigInt(responseTypeLocation), // Use actual found location
      r: toHex(r, { size: 32 }), // Convert to bytes32 like working impl
      s: toHex(s, { size: 32 }), // Convert to bytes32 like working impl
    };

    console.log('🏗️ Credentials object (using actual locations):', {
      challengeLocation: credentials.challengeLocation.toString(),
      responseTypeLocation: credentials.responseTypeLocation.toString(),
      r: credentials.r,
      s: credentials.s,
    });

    const webAuthnSignature: Hex = encodeAbiParameters(
      [
        {
          type: "tuple",
          name: "credentials",
          components: [
            { name: "authenticatorData", type: "bytes" },
            { name: "clientDataJSON", type: "string" },
            { name: "challengeLocation", type: "uint256" },
            { name: "responseTypeLocation", type: "uint256" },
            { name: "r", type: "bytes32" },
            { name: "s", type: "bytes32" },
          ],
        },
      ],
      [credentials]
    );

    console.log('🔐 WebAuthn signature encoded:', {
      webAuthnSignature,
      webAuthnSignatureLength: webAuthnSignature.length,
    });

    // 6. Format for SimpleAccount: version (1 byte) + validUntil (6 bytes) + WebAuthn signature
    // Use same values as working implementation
    const version = 1;
    const validUntil = 0; // Match working implementation

    // Use encodePacked to match Solidity's abi.encodePacked behavior
    const finalSignature: Hex = encodePacked(
      ['uint8', 'uint48', 'bytes'],
      [version, validUntil, webAuthnSignature]
    );

    console.log('✅ Final SimpleAccount signature (corrected format):', {
      version,
      validUntil,
      webAuthnSignature,
      webAuthnSignatureLength: webAuthnSignature.length,
      finalSignature,
      finalSignatureLength: finalSignature.length,
    });

    return finalSignature;

  } catch (error) {
    console.error('❌ Failed to format WebAuthn signature:', error);
    console.error('📋 Error details:', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to format WebAuthn signature: ${error}`);
  }
}


/**
 * Execute complete UserOperation flow
 */
export async function executeUserOperation(
  publicKeyArray: readonly [Hex, Hex],
  relayerAddress: Hex,
  rawIdBase64url: string
): Promise<Hex> {
  console.log('🚀 Starting UserOperation execution...');
  console.log('📋 Execution parameters:', {
    publicKeyArray,
    relayerAddress,
    rawIdBase64url,
  });

  try {
    // 1. Build UserOperation
    console.log('📝 Phase 1: Building UserOperation...');
    const userOp: UserOperation = await buildUserOperation(publicKeyArray, relayerAddress);

    // 2. Sign and submit
    console.log('✍️ Phase 2: Signing and submitting UserOperation...');
    const userOpHash: Hex = await signAndSubmitUserOperation(userOp, rawIdBase64url);

    console.log('✅ UserOperation completed successfully:', {
      userOpHash,
      timestamp: new Date().toISOString(),
    });

    return userOpHash;

  } catch (error) {
    console.error('❌ UserOperation failed:', error);
    console.error('📋 Error details:', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}