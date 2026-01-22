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
// import coordinator_inner = require('../ika/sdk/typescript/dist/esm/generated/ika_dwallet_2pc_mpc/coordinator_inner');
dotenv.config();

const PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;
const ROOT_SEED_KEY = process.env.ROOT_SEED_KEY;
if (!PRIVATE_KEY || !ROOT_SEED_KEY) {
    throw new Error('SUI_PRIVATE_KEY or ROOT_SEED_KEY is not set');
}
const keypair = Ed25519Keypair.fromSecretKey(PRIVATE_KEY);
const client = new SuiClient({ url: getFullnodeUrl('testnet') }); // mainnet / testnet
const senderAddress = "0x854ec4225b6fa32572f50e622147ef6cf3c6eaa390f6b9c100afa3f1ae76291d"
const testnetIkaCoinType = '0x1f26bb2f711ff82dcda4d02c77d5123089cb7f8418751474b9fb744ce031526a::ika::IKA';
const dWalletObjectID = '0xd2872e32f6652551631ae798e1ab552cb61b839711016382f47ca7a87e7949e7';
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
    console.log('[Step 1] Starting presign creation process...');
    
    // Add delay before initialization to avoid concurrent requests
    console.log('[Step 2] Adding initial delay (500ms)...');
    await delay(500);
    
    console.log('[Step 3] Initializing Ika Client...');
    await retryWithBackoff(async () => {
        await ikaClient.initialize(); // This will initialize the Ika Client and fetch the Ika protocol state and objects.
    });
    console.log('[Step 3] Ika Client initialized successfully');
    
    const tx = new Transaction();
    const userShareKeys = await UserShareEncryptionKeys.fromRootSeedKey(ROOT_SEED_KEY, Curve.SECP256K1);
    console.log('[Step 5] UserShareEncryptionKeys created');
    const ikaTx = new IkaTransaction({
        ikaClient,
        transaction: tx,
        userShareEncryptionKeys: userShareKeys
    });

    // Get user's IKA coin and SUI coin for transaction fees
    console.log('[Step 6] Fetching user coins...');
    const rawUserCoins = await client.getAllCoins({
        owner: senderAddress
    })
    console.log(`[Step 6] Total coins found: ${rawUserCoins.data.length}`);
    const rawUserIkaCoins = rawUserCoins.data.filter((coin) => coin.coinType === testnetIkaCoinType);
    const rawUserSuiCoins = rawUserCoins.data.filter((coin) => coin.coinType === '0x2::sui::SUI');
    console.log(`[Step 6] IKA coins found: ${rawUserIkaCoins.length}`);
    console.log(`[Step 6] SUI coins found: ${rawUserSuiCoins.length}`);
    // const rawUserIkaCoins = rawUserCoins.data.filter() //some filtering logic inside it
    if (!rawUserIkaCoins[0] || !rawUserSuiCoins[1]) {
        throw new Error('Missing required coins');
    }
    const userIkaCoin = tx.object(rawUserIkaCoins[0].coinObjectId); // User's IKA coin object ID
    const userSuiCoin = tx.object(rawUserSuiCoins[1].coinObjectId); // User's SUI coin object ID
    console.log(`[Step 6] Using IKA coin: ${rawUserIkaCoins[0].coinObjectId}`);
    console.log(`[Step 6] Using SUI coin: ${rawUserSuiCoins[1].coinObjectId}`);
    // Create session identifier
    console.log('[Step 7] Creating session identifier...');
    const sessionId = createRandomSessionIdentifier();
    console.log(`[Step 7] Session ID created: ${Buffer.from(sessionId).toString('hex').substring(0, 16)}...`);
    
    // Register an encryption key before the DKG, or if you did already you can skip this step
    console.log('[Step 8] Registering encryption key...');
    await ikaTx.registerEncryptionKey({
        curve: Curve.SECP256K1,
    });
    console.log('[Step 8] Encryption key registered');
    
    console.log('[Step 9] Fetching latest network encryption key...');
    const dWalletEncryptionKey = await ikaClient.getLatestNetworkEncryptionKey();
    console.log(`[Step 9] dWalletNetworkEncryptionKeyId: ${dWalletEncryptionKey.id}`);
    
    // console.log('[Step 11] Creating session identifier for transaction...');
    // const sessionIdentifier = ikaTx.createSessionIdentifier();
    // console.log(`[Step 11] Session identifier created: ${sessionIdentifier}`);

    console.log(`[Step 12] Fetching dWallet: ${dWalletObjectID}...`);
    const dWallet = await retryWithBackoff(async () => {
        return await ikaClient.getDWallet(dWalletObjectID);
    });
    console.log(`[Step 12] dWallet fetched. State: ${dWallet.state?.$kind || 'unknown'}`);
    
    console.log('[Step 13] Accepting encrypted user share...');
    await ikaTx.acceptEncryptedUserShare({
        dWallet: dWallet,
        encryptedUserSecretKeyShareId: userShareKeys.encryptedUserSecretKeyShareId,
        userPublicOutput: new Uint8Array(dWallet.state.AwaitingKeyHolderSignature?.public_output),
    });
    console.log('[Step 13] Encrypted user share accepted');
    
    console.log('[Step 14] Requesting presign with ECDSASecp256k1 algorithm...');
    const unverifiedPresignCap = await ikaTx.requestPresign({
        dWallet: dWallet, // Use the fetched DWallet object with state
        signatureAlgorithm: SignatureAlgorithm.ECDSASecp256k1,
        ikaCoin: userIkaCoin,
        suiCoin: tx.splitCoins(tx.gas, [1000000]),
    });
    console.log(`[Step 14] Unverified presign cap created: ${unverifiedPresignCap.$kind}`);
    
    console.log('[Step 15] Verifying presign cap...');
    const verifiedPresignCap = await ikaTx.verifyPresignCap({
        presign: unverifiedPresignCap, // <-- Directly by providing an object or object ID string
    });
    console.log(`[Step 15] Verified presign cap: ${verifiedPresignCap.$kind}`);
    
    console.log('[Step 16] Transferring verified presign cap to sender...');
    tx.transferObjects([verifiedPresignCap], senderAddress);
    console.log('[Step 16] Transfer added to transaction');

    console.log('[Step 17] Setting transaction sender...');
    tx.setSender(senderAddress);
    console.log(`[Step 17] Sender set: ${senderAddress}`);
    
    console.log('[Step 18] Converting transaction to JSON...');
    const txJSON = await tx.toJSON();
    console.log('[Step 18] Transaction JSON prepared');
    
    console.log('[Step 19] Signing and executing transaction...');
    const result = await client.signAndExecuteTransaction({ signer: keypair, transaction: tx });
    console.log(`[Step 19] Transaction executed. Digest: ${result.digest}`);
    
    console.log('[Step 20] Waiting for transaction confirmation...');
    const waitForTransactionResult = await client.waitForTransaction({ digest: result.digest });
    console.log('[Step 20] Transaction confirmed!');
    console.log('[Step 21] Transaction result:', JSON.stringify(waitForTransactionResult, null, 2));
    console.log('[Step 21] Presign creation process completed successfully!');
}

// Execute main with retry logic to avoid concurrency and rate limiting issues
console.log('[Step 0] Starting presign creation script...');
retryWithBackoff(main, 5, 2000).catch((error) => {
    console.error('[ERROR] Error in main:', error);
    console.error('[ERROR] Stack trace:', error.stack);
    process.exit(1);
});
// ZeroTrust DWallet with unencrypted shares