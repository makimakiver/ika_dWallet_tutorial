import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import {
    getNetworkConfig,
    IkaClient,
    IkaTransaction,
    UserShareEncryptionKeys,
    createRandomSessionIdentifier,
    Curve,
    SignatureAlgorithm,
    Hash,
    createClassGroupsKeypair,
    prepareDKG,
    prepareDKGAsync
} from '@ika.xyz/sdk';
import { Transaction, type TransactionObjectArgument } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import * as dotenv from 'dotenv';
import coordinator_inner = require('../ika/sdk/typescript/dist/esm/generated/ika_dwallet_2pc_mpc/coordinator_inner');
dotenv.config();

const PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;
if (!PRIVATE_KEY) {
    throw new Error('SUI_PRIVATE_KEY is not set');
}
const keypair = Ed25519Keypair.fromSecretKey(PRIVATE_KEY);
const client = new SuiClient({ url: getFullnodeUrl('testnet') }); // mainnet / testnet
const senderAddress = "0x854ec4225b6fa32572f50e622147ef6cf3c6eaa390f6b9c100afa3f1ae76291d"
const testnetIkaCoinType = '0x1f26bb2f711ff82dcda4d02c77d5123089cb7f8418751474b9fb744ce031526a::ika::IKA';
const dWalletObjectID = '0xaf3fdaff8976ff588a847200e1c973de6daf76cf3af9d74c070166bdab85d66c';
const ikaClient = new IkaClient({
    suiClient: client,
    config: getNetworkConfig('testnet'), // mainnet / testnet
});

// Helper function to add delay
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry function with exponential backoff to avoid rate limiting
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 5,
    initialDelay: number = 1000
): Promise<T> {
    let lastError: Error;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            // Check if it's a rate limit error (429)
            if (error?.cause?.status === 429 || error?.status === 429) {
                const delayMs = initialDelay * Math.pow(2, attempt);
                console.log(`Rate limit hit (429). Retrying in ${delayMs}ms... (attempt ${attempt + 1}/${maxRetries})`);
                await delay(delayMs);
            } else {
                // For other errors, throw immediately
                throw error;
            }
        }
    }
    throw lastError!;
}

async function main() {
    // Add delay before initialization to avoid concurrent requests
    await delay(500);
    await retryWithBackoff(async () => {
        await ikaClient.initialize(); // This will initialize the Ika Client and fetch the Ika protocol state and objects.
    });
    
    // Generate a random seed
    const rootSeedKey = [
        151, 84, 196, 151, 232,  96, 255, 224,
         19, 29, 255,  62, 101, 232, 220,  70,
        115, 79,  39,  90,  43, 105, 240, 192,
         64, 25, 240,  12, 162, 209, 102,   8
      ];
    
    // Create UserShareEncryptionKeys from the seed
    // IMPORTANT: Use the curve that matches your dWallet's curve
    const tx = new Transaction();
    
    const userShareKeys = await UserShareEncryptionKeys.fromRootSeedKey(rootSeedKey, Curve.SECP256K1);
    const ikaTx = new IkaTransaction({
        ikaClient,
        transaction: tx,
        userShareEncryptionKeys: userShareKeys
    });
    // Get user's IKA coin and SUI coin for transaction fees
    const rawUserCoins = await client.getAllCoins({
        owner: senderAddress
    })
    console.log(rawUserCoins);
    const rawUserIkaCoins = rawUserCoins.data.filter((coin) => coin.coinType === testnetIkaCoinType);
    const rawUserSuiCoins = rawUserCoins.data.filter((coin) => coin.coinType === '0x2::sui::SUI');
    // const rawUserIkaCoins = rawUserCoins.data.filter() //some filtering logic inside it
    if (!rawUserIkaCoins[0] || !rawUserSuiCoins[1]) {
        throw new Error('Missing required coins');
    }
    const userIkaCoin = tx.object(rawUserIkaCoins[0].coinObjectId); // User's IKA coin object ID
    const userSuiCoin = tx.object(rawUserSuiCoins[1].coinObjectId); // User's SUI coin object ID
    // Create session identifier
    const sessionId = createRandomSessionIdentifier();
    // Register an encryption key before the DKG, or if you did already you can skip this step
    await ikaTx.registerEncryptionKey({
        curve: Curve.SECP256K1,
    });
    const dWalletEncryptionKey = await ikaClient.getLatestNetworkEncryptionKey();

    const sessionIdentifier = ikaTx.createSessionIdentifier();
    console.log("dWalletNetworkEncryptionKeyId: ", dWalletEncryptionKey.id);
 
    // First, check the current state of the DWallet
    const dWalletCurrent = await retryWithBackoff(async () => {
        return await ikaClient.getDWallet(dWalletObjectID);
    });
    
    console.log("DWallet current state:", dWalletCurrent.state ? Object.keys(dWalletCurrent.state)[0] : "no state");
    console.log("DWallet full state:", JSON.stringify(dWalletCurrent.state, null, 2));
    
    // Check if DWallet is already Active (past AwaitingKeyHolderSignature)
    if (dWalletCurrent.state?.Active) {
        console.log("DWallet is already Active. No need to accept encrypted share.");
        return; // DWallet is already activated
    }
    
    // Check if DWallet is in AwaitingKeyHolderSignature state
    if (dWalletCurrent.state?.AwaitingKeyHolderSignature) {
        console.log("DWallet is in AwaitingKeyHolderSignature state. Proceeding to accept encrypted share.");
        const dWallet = dWalletCurrent;
        // The encryptedUserSecretKeyShareId should be in the DWallet state
        // It's typically in the AwaitingKeyHolderSignature state as encrypted_user_secret_key_share_id
        const encryptedUserSecretKeyShareId = dWallet.state.AwaitingKeyHolderSignature.encrypted_user_secret_key_share_id?.id || 
                                              dWallet.state.AwaitingKeyHolderSignature.encrypted_user_secret_key_share_id;
        
        if (!encryptedUserSecretKeyShareId) {
            throw new Error(`encryptedUserSecretKeyShareId not found in DWallet state. ` +
                `DWallet state: ${JSON.stringify(dWallet.state.AwaitingKeyHolderSignature, null, 2)}`);
        }
        
        await ikaTx.acceptEncryptedUserShare({
            dWallet: dWallet,
            encryptedUserSecretKeyShareId: encryptedUserSecretKeyShareId,
            userPublicOutput: new Uint8Array(dWallet.state.AwaitingKeyHolderSignature.public_output),
        });
    } else {
        // Try to wait for AwaitingKeyHolderSignature state with a longer timeout
        console.log(`DWallet is in state: ${dWalletCurrent.state ? Object.keys(dWalletCurrent.state)[0] : "unknown"}. Waiting for AwaitingKeyHolderSignature...`);
        try {
            const dWallet = await ikaClient.getDWalletInParticularState(
                dWalletObjectID,
                'AwaitingKeyHolderSignature',
                {
                    timeout: 300000, // 5 minutes timeout
                    pollInterval: 5000, // Check every 5 seconds
                }
            );
            
            // Get the encryptedUserSecretKeyShareId from the DWallet state
            const encryptedUserSecretKeyShareId = dWallet.state.AwaitingKeyHolderSignature.encrypted_user_secret_key_share_id?.id || 
                                                  dWallet.state.AwaitingKeyHolderSignature.encrypted_user_secret_key_share_id;
            
            if (!encryptedUserSecretKeyShareId) {
                throw new Error(`encryptedUserSecretKeyShareId not found in DWallet state after reaching AwaitingKeyHolderSignature.`);
            }
            
            await ikaTx.acceptEncryptedUserShare({
                dWallet: dWallet,
                encryptedUserSecretKeyShareId: encryptedUserSecretKeyShareId,
                userPublicOutput: new Uint8Array(dWallet.state.AwaitingKeyHolderSignature.public_output),
            });
        } catch (error: any) {
            if (error.message?.includes('Timeout')) {
                const currentState = await ikaClient.getDWallet(dWalletObjectID);
                throw new Error(`Timeout waiting for DWallet to reach AwaitingKeyHolderSignature. ` +
                    `Current state: ${currentState.state ? Object.keys(currentState.state)[0] : "unknown"}. ` +
                    `The DWallet may need more time to complete DKG, or it may be in a different state. ` +
                    `Full state: ${JSON.stringify(currentState.state, null, 2)}`);
            }
            throw error;
        }
    }
    
    // const signatureId = await ikaTx.requestSign({
    //     dWallet: dwalletObject,
    //     messageApproval: messageApprovalObject,
    //     hashScheme: Hash.KECCAK256,
    //     verifiedPresignCap: verifiedPresignCap,
    //     presign: presignObject,
    //     secretShare: secretShareBytes,
    //     publicOutput: publicOutputBytes,
    //     message: messageBytes,
    //     signatureScheme: SignatureAlgorithm.ECDSASecp256k1,
    //     ikaCoin: userIkaCoin,
    //     suiCoin: tx.splitCoins(tx.gas, [1000000]),
    // });
    tx.setSender(senderAddress);
    const txJSON = await tx.toJSON();
    console.log("txJSON: ", txJSON);
    const result = await client.signAndExecuteTransaction({ signer: keypair, transaction: tx });
    const waitForTransactionResult = await client.waitForTransaction({ digest: result.digest });
    console.log("waitForTransactionResult: ", waitForTransactionResult);
}

// Execute main with retry logic to avoid concurrency and rate limiting issues
retryWithBackoff(main, 5, 2000).catch((error) => {
    console.error('Error in main:', error);
    process.exit(1);
});
// ZeroTrust DWallet with unencrypted shares