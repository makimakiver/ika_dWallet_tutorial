import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import {
    getNetworkConfig,
    IkaClient,
    IkaTransaction,
    UserShareEncryptionKeys,
    Curve,
} from '@ika.xyz/sdk';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
dotenv.config();

const PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;
if (!PRIVATE_KEY) {
    throw new Error('SUI_PRIVATE_KEY is not set');
}

// Load data from JSON file
const DWALLET_RESULT_FILE = process.env.DWALLET_RESULT_FILE || 'output/dwallet_result.json';
console.log(`[Config] Loading dWallet data from: ${DWALLET_RESULT_FILE}`);

let dwalletData: any;
try {
    const filePath = path.join(process.cwd(), DWALLET_RESULT_FILE);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    dwalletData = JSON.parse(fileContent);
    console.log(`[Config] Successfully loaded dWallet data from file`);
} catch (error) {
    throw new Error(`Failed to load dWallet data from ${DWALLET_RESULT_FILE}: ${error}`);
}

// Helper function to convert object with numeric keys to Uint8Array
function objectToUint8Array(obj: any): Uint8Array {
    if (obj instanceof Uint8Array) return obj;
    if (Array.isArray(obj)) return new Uint8Array(obj);
    const keys = Object.keys(obj).map(k => parseInt(k)).sort((a, b) => a - b);
    return new Uint8Array(keys.map(k => obj[k]));
}

// Extract data from JSON file
const ROOT_SEED_KEY = objectToUint8Array(dwalletData.rootSeedKey);
const userPublicOutputFromFile = objectToUint8Array(dwalletData.dkgRequestInput.userPublicOutput);

// Get dWalletObjectID from JSON file or environment variable
let dWalletObjectID: string | undefined = dwalletData.dWalletObjectID;
if (!dWalletObjectID) {
    dWalletObjectID = process.env.DWALLET_OBJECT_ID;
}
if (!dWalletObjectID) {
    throw new Error('dWalletObjectID not found in JSON file or environment variable');
}

console.log(`[Config] dWalletObjectID: ${dWalletObjectID}`);
console.log(`[Config] Root seed key loaded (first 10 bytes): ${Buffer.from(ROOT_SEED_KEY.slice(0, 10)).toString('hex')}`);
console.log(`[Config] User public output loaded, length: ${userPublicOutputFromFile.length}`);

const keypair = Ed25519Keypair.fromSecretKey(PRIVATE_KEY);
const client = new SuiClient({ url: getFullnodeUrl('testnet') });
// const senderAddress = "0x854ec4225b6fa32572f50e622147ef6cf3c6eaa390f6b9c100afa3f1ae76291d";
const ikaClient = new IkaClient({
    suiClient: client,
    config: getNetworkConfig('testnet'),
});

// Helper function to add delay
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry function with exponential backoff
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
            if (error?.cause?.status === 429 || error?.status === 429) {
                const delayMs = initialDelay * Math.pow(2, attempt);
                console.log(`Rate limit hit (429). Retrying in ${delayMs}ms... (attempt ${attempt + 1}/${maxRetries})`);
                await delay(delayMs);
            } else {
                throw error;
            }
        }
    }
    throw lastError!;
}

async function main() {
    console.log('[Step 1] Starting dWallet activation process...');

    await delay(500);

    console.log('[Step 2] Initializing Ika Client...');
    await retryWithBackoff(async () => {
        await ikaClient.initialize();
    });
    console.log('[Step 2] Ika Client initialized successfully');

    // Check current dWallet state
    console.log(`[Step 3] Fetching dWallet: ${dWalletObjectID}...`);
    const dWalletCurrent = await retryWithBackoff(async () => {
        return await ikaClient.getDWallet(dWalletObjectID);
    });

    const currentState = dWalletCurrent.state?.$kind || 'unknown';
    console.log(`[Step 3] dWallet current state: ${currentState}`);

    // Check if already Active
    if (currentState === 'Active') {
        console.log('[Step 3] dWallet is already Active. No activation needed.');
        console.log('[SUCCESS] dWallet is ready for presign operations.');
        return;
    }

    // Check if in AwaitingKeyHolderSignature state
    if (currentState !== 'AwaitingKeyHolderSignature') {
        console.log(`[Step 3] dWallet is in ${currentState} state. Waiting for AwaitingKeyHolderSignature...`);
        try {
            const dWallet = await ikaClient.getDWalletInParticularState(
                dWalletObjectID,
                'AwaitingKeyHolderSignature',
                { timeout: 300000, interval: 5000 }
            );
            console.log('[Step 3] dWallet reached AwaitingKeyHolderSignature state');
        } catch (error: any) {
            throw new Error(`Failed to reach AwaitingKeyHolderSignature state: ${error.message}`);
        }
    }

    // Fetch dWallet in AwaitingKeyHolderSignature state
    const dWallet = await retryWithBackoff(async () => {
        return await ikaClient.getDWallet(dWalletObjectID);
    });
    console.log("dWallet: ", dWallet.state.$kind);
    // Create transaction for activation
    console.log('[Step 4] Creating activation transaction...');
    const tx = new Transaction();
    const userShareKeys = await UserShareEncryptionKeys.fromRootSeedKey(ROOT_SEED_KEY, Curve.SECP256K1);
    console.log('[Step 4] UserShareEncryptionKeys created');

    const ikaTx = new IkaTransaction({
        ikaClient,
        transaction: tx,
        userShareEncryptionKeys: userShareKeys
    });


    // Get encryptedUserSecretKeyShareId by querying dynamic fields of the ObjectTable
    const tableId = dWallet.encrypted_user_secret_key_shares?.id?.id;
    if (!tableId) {
        throw new Error('encrypted_user_secret_key_shares table not found on dWallet');
    }
    console.log(`[Step 5] encrypted_user_secret_key_shares table ID: ${tableId}`);

    const dynamicFields = await client.getDynamicFields({ parentId: tableId });
    if (!dynamicFields.data || dynamicFields.data.length === 0) {
        throw new Error('No encrypted user secret key shares found in the table. The network may not have completed DKG yet.');
    }
    console.log(`[Step 5] Found ${dynamicFields.data.length} encrypted share(s) in table`);

    const encryptedUserSecretKeyShareId = dynamicFields.data[0].objectId;
    console.log(`[Step 6] encryptedUserSecretKeyShareId: ${encryptedUserSecretKeyShareId}`);

    // Accept encrypted user share
    console.log('[Step 7] Accepting encrypted user share...');
    await ikaTx.acceptEncryptedUserShare({
        dWallet: dWallet,
        encryptedUserSecretKeyShareId: encryptedUserSecretKeyShareId,
        userPublicOutput: userPublicOutputFromFile,
    });
    console.log('[Step 7] Encrypted user share accepted');

    console.log('[Step 9] Signing and executing transaction...');
    const txJSON = await tx.toJSON();
    console.log("txJSON: ", txJSON);
    const result = await client.signAndExecuteTransaction({ signer: keypair, transaction: tx });
    console.log(`[Step 9] Transaction executed. Digest: ${result.digest}`);

    console.log('[Step 10] Waiting for transaction confirmation...');
    const waitForTransactionResult = await client.waitForTransaction({ digest: result.digest });
    console.log('[Step 10] Transaction confirmed!');

    // Wait for dWallet to become Active
    console.log('[Step 11] Waiting for dWallet to become Active...');
    try {
        const activeDWallet = await ikaClient.getDWalletInParticularState(
            dWalletObjectID,
            'Active',
            { timeout: 120000, interval: 3000 }
        );
        console.log('[Step 11] dWallet is now Active!');
        console.log(`[Step 11] Active dWallet public_output length: ${activeDWallet.state.Active?.public_output?.length || 'N/A'}`);
    } catch (error: any) {
        console.log(`[Step 11] Warning: Timeout waiting for Active state. The dWallet may still be processing.`);
        console.log(`[Step 11] You can check the state later and proceed with create_Presign.ts once Active.`);
    }

    console.log('[SUCCESS] dWallet activation process completed!');
    console.log(`[SUCCESS] Transaction digest: ${result.digest}`);
    console.log('[SUCCESS] You can now run create_Presign.ts to request a presign.');
}

// Execute main
console.log('[Step 0] Starting dWallet activation script...');
retryWithBackoff(main, 5, 2000).catch((error) => {
    console.error('[ERROR] Error in main:', error);
    console.error('[ERROR] Stack trace:', error.stack);
    process.exit(1);
});
