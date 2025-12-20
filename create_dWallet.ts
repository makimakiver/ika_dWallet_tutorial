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
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import * as dotenv from 'dotenv';
dotenv.config();


const PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;
if (!PRIVATE_KEY) {
    throw new Error('SUI_PRIVATE_KEY is not set');
}
const keypair = Ed25519Keypair.fromSecretKey(PRIVATE_KEY);
const client = new SuiClient({ url: getFullnodeUrl('testnet') }); // mainnet / testnet
const senderAddress = "0xaf2c7c81964eaa18c5ab4945333ba6eb047b0441645c805cc340f7a55e4e2cb7"
const testnetIkaCoinType = '0x1f26bb2f711ff82dcda4d02c77d5123089cb7f8418751474b9fb744ce031526a::ika::IKA';
const ikaClient = new IkaClient({
	suiClient: client,
	config: getNetworkConfig('testnet'), // mainnet / testnet
});
async function main() {
    await ikaClient.initialize(); // This will initialize the Ika Client and fetch the Ika protocol state and objects.
    
    // Generate a random seed
    const rootSeedKey = new Uint8Array(32);
    crypto.getRandomValues(rootSeedKey);
    
    // Create UserShareEncryptionKeys from the seed
    // IMPORTANT: Use the curve that matches your dWallet's curve
    const tx = new Transaction();
    const userShareKeys = await UserShareEncryptionKeys.fromRootSeedKey(rootSeedKey, Curve.SECP256K1);
    const ikaTx = new IkaTransaction({
        ikaClient,
        transaction: tx,
        userShareEncryptionKeys: userShareKeys
    });

    // Get user's IKA coin for transaction fees
    const rawUserCoins = await client.getAllCoins({
        owner: senderAddress
    })
    console.log(rawUserCoins);
    const rawUserIkaCoins = rawUserCoins.data.filter((coin) => coin.coinType === testnetIkaCoinType);
    const rawUserSuiCoins = rawUserCoins.data.filter((coin) => coin.coinType === '0x2::sui::SUI');
    // const rawUserIkaCoins = rawUserCoins.data.filter() //some filtering logic inside it
    const userIkaCoin = tx.object(rawUserIkaCoins[0].coinObjectId); // User's IKA coin object ID
    const userSuiCoin = tx.object(rawUserSuiCoins[0].coinObjectId); // User's SUI coin object ID
    
    // Create keypair for SECP256K1
    const { encryptionKey, decryptionKey } = await createClassGroupsKeypair(rootSeedKey, Curve.SECP256K1);
    
    // Get protocol parameters from the network
    const protocolParams = await ikaClient.getProtocolPublicParameters(undefined, Curve.SECP256K1);
    
    // Create session identifier
    const sessionId = createRandomSessionIdentifier();
    console.log("sessionId: ", sessionId);
    // Register an encryption key before the DKG, or if you did already you can skip this step
    await ikaTx.registerEncryptionKey({
        curve: Curve.SECP256K1,
    });
    const dWalletEncryptionKey = await ikaClient.getLatestNetworkEncryptionKey();
    // Prepare DKG data
    const dkgRequestInput = await prepareDKGAsync(
        ikaClient,
        Curve.SECP256K1,
        userShareKeys,
        sessionId,
        senderAddress,
    );
    const sessionIdentifier = ikaTx.createSessionIdentifier();
    console.log("dWalletNetworkEncryptionKeyId: ", dWalletEncryptionKey.id);
    const [dwalletCap, sign_ID] = await ikaTx.requestDWalletDKG({
        dkgRequestInput: dkgRequestInput,
        sessionIdentifier,
        dwalletNetworkEncryptionKeyId: dWalletEncryptionKey.id, // senderAddress is the network encryption key ID
        curve: Curve.SECP256K1, // or Curve.SECP256R1, Curve.ED25519, etc.
        ikaCoin: userIkaCoin,
        suiCoin: userSuiCoin
    });  


    // Explicitly drop the unused value
    tx.moveCall({
        target: '0x1::option::destroy_none',
        typeArguments: ['0x2::object::ID'],
        arguments: [sign_ID],
    });
    tx.transferObjects([dwalletCap], senderAddress);
    // After the Move call that uses suiCoin, transfer the suiCoin to the sender
    // tx.transferObjects([suiCoin], senderAddress);

    const txJSON = await tx.toJSON();
    console.log("txJSON: ", txJSON);
    const result = await client.signAndExecuteTransaction({ signer: keypair, transaction: tx });
    const waitForTransactionResult = await client.waitForTransaction({ digest: result.digest });
    console.log("waitForTransactionResult: ", waitForTransactionResult);
};
main();