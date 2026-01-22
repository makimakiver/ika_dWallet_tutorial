"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@mysten/sui/client");
var sdk_1 = require("@ika.xyz/sdk");
var transactions_1 = require("@mysten/sui/transactions");
var ed25519_1 = require("@mysten/sui/keypairs/ed25519");
var dotenv = require("dotenv");
// import coordinator_inner = require('../ika/sdk/typescript/dist/esm/generated/ika_dwallet_2pc_mpc/coordinator_inner');
dotenv.config();
var PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;
var ROOT_SEED_KEY = process.env.ROOT_SEED_KEY;
if (!PRIVATE_KEY || !ROOT_SEED_KEY) {
    throw new Error('SUI_PRIVATE_KEY or ROOT_SEED_KEY is not set');
}
var keypair = ed25519_1.Ed25519Keypair.fromSecretKey(PRIVATE_KEY);
var client = new client_1.SuiClient({ url: (0, client_1.getFullnodeUrl)('testnet') }); // mainnet / testnet
var senderAddress = "0x854ec4225b6fa32572f50e622147ef6cf3c6eaa390f6b9c100afa3f1ae76291d";
var testnetIkaCoinType = '0x1f26bb2f711ff82dcda4d02c77d5123089cb7f8418751474b9fb744ce031526a::ika::IKA';
var dWalletObjectID = '0xd2872e32f6652551631ae798e1ab552cb61b839711016382f47ca7a87e7949e7';
var ikaClient = new sdk_1.IkaClient({
    suiClient: client,
    config: (0, sdk_1.getNetworkConfig)('testnet'), // mainnet / testnet
});
// Helper function to add delay
function delay(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
// Retry function with exponential backoff to avoid rate limiting
function retryWithBackoff(fn_1) {
    return __awaiter(this, arguments, void 0, function (fn, maxRetries, initialDelay) {
        var lastError, attempt, error_1, delayMs;
        var _a;
        if (maxRetries === void 0) { maxRetries = 5; }
        if (initialDelay === void 0) { initialDelay = 1000; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    attempt = 0;
                    _b.label = 1;
                case 1:
                    if (!(attempt < maxRetries)) return [3 /*break*/, 9];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 8]);
                    return [4 /*yield*/, fn()];
                case 3: return [2 /*return*/, _b.sent()];
                case 4:
                    error_1 = _b.sent();
                    lastError = error_1;
                    if (!(((_a = error_1 === null || error_1 === void 0 ? void 0 : error_1.cause) === null || _a === void 0 ? void 0 : _a.status) === 429 || (error_1 === null || error_1 === void 0 ? void 0 : error_1.status) === 429)) return [3 /*break*/, 6];
                    delayMs = initialDelay * Math.pow(2, attempt);
                    console.log("Rate limit hit (429). Retrying in ".concat(delayMs, "ms... (attempt ").concat(attempt + 1, "/").concat(maxRetries, ")"));
                    return [4 /*yield*/, delay(delayMs)];
                case 5:
                    _b.sent();
                    return [3 /*break*/, 7];
                case 6: 
                // For other errors, throw immediately
                throw error_1;
                case 7: return [3 /*break*/, 8];
                case 8:
                    attempt++;
                    return [3 /*break*/, 1];
                case 9: throw lastError;
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var tx, userShareKeys, ikaTx, rawUserCoins, rawUserIkaCoins, rawUserSuiCoins, userIkaCoin, userSuiCoin, sessionId, dWalletEncryptionKey, dWallet, unverifiedPresignCap, verifiedPresignCap, txJSON, result, waitForTransactionResult;
        var _this = this;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('[Step 1] Starting presign creation process...');
                    // Add delay before initialization to avoid concurrent requests
                    console.log('[Step 2] Adding initial delay (500ms)...');
                    return [4 /*yield*/, delay(500)];
                case 1:
                    _c.sent();
                    console.log('[Step 3] Initializing Ika Client...');
                    return [4 /*yield*/, retryWithBackoff(function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, ikaClient.initialize()];
                                    case 1:
                                        _a.sent(); // This will initialize the Ika Client and fetch the Ika protocol state and objects.
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 2:
                    _c.sent();
                    console.log('[Step 3] Ika Client initialized successfully');
                    tx = new transactions_1.Transaction();
                    return [4 /*yield*/, sdk_1.UserShareEncryptionKeys.fromRootSeedKey(ROOT_SEED_KEY, sdk_1.Curve.SECP256K1)];
                case 3:
                    userShareKeys = _c.sent();
                    console.log('[Step 5] UserShareEncryptionKeys created');
                    ikaTx = new sdk_1.IkaTransaction({
                        ikaClient: ikaClient,
                        transaction: tx,
                        userShareEncryptionKeys: userShareKeys
                    });
                    // Get user's IKA coin and SUI coin for transaction fees
                    console.log('[Step 6] Fetching user coins...');
                    return [4 /*yield*/, client.getAllCoins({
                            owner: senderAddress
                        })];
                case 4:
                    rawUserCoins = _c.sent();
                    console.log("[Step 6] Total coins found: ".concat(rawUserCoins.data.length));
                    rawUserIkaCoins = rawUserCoins.data.filter(function (coin) { return coin.coinType === testnetIkaCoinType; });
                    rawUserSuiCoins = rawUserCoins.data.filter(function (coin) { return coin.coinType === '0x2::sui::SUI'; });
                    console.log("[Step 6] IKA coins found: ".concat(rawUserIkaCoins.length));
                    console.log("[Step 6] SUI coins found: ".concat(rawUserSuiCoins.length));
                    // const rawUserIkaCoins = rawUserCoins.data.filter() //some filtering logic inside it
                    if (!rawUserIkaCoins[0] || !rawUserSuiCoins[1]) {
                        throw new Error('Missing required coins');
                    }
                    userIkaCoin = tx.object(rawUserIkaCoins[0].coinObjectId);
                    userSuiCoin = tx.object(rawUserSuiCoins[1].coinObjectId);
                    console.log("[Step 6] Using IKA coin: ".concat(rawUserIkaCoins[0].coinObjectId));
                    console.log("[Step 6] Using SUI coin: ".concat(rawUserSuiCoins[1].coinObjectId));
                    // Create session identifier
                    console.log('[Step 7] Creating session identifier...');
                    sessionId = (0, sdk_1.createRandomSessionIdentifier)();
                    console.log("[Step 7] Session ID created: ".concat(Buffer.from(sessionId).toString('hex').substring(0, 16), "..."));
                    // Register an encryption key before the DKG, or if you did already you can skip this step
                    console.log('[Step 8] Registering encryption key...');
                    return [4 /*yield*/, ikaTx.registerEncryptionKey({
                            curve: sdk_1.Curve.SECP256K1,
                        })];
                case 5:
                    _c.sent();
                    console.log('[Step 8] Encryption key registered');
                    console.log('[Step 9] Fetching latest network encryption key...');
                    return [4 /*yield*/, ikaClient.getLatestNetworkEncryptionKey()];
                case 6:
                    dWalletEncryptionKey = _c.sent();
                    console.log("[Step 9] dWalletNetworkEncryptionKeyId: ".concat(dWalletEncryptionKey.id));
                    // console.log('[Step 11] Creating session identifier for transaction...');
                    // const sessionIdentifier = ikaTx.createSessionIdentifier();
                    // console.log(`[Step 11] Session identifier created: ${sessionIdentifier}`);
                    console.log("[Step 12] Fetching dWallet: ".concat(dWalletObjectID, "..."));
                    return [4 /*yield*/, retryWithBackoff(function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, ikaClient.getDWallet(dWalletObjectID)];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 7:
                    dWallet = _c.sent();
                    console.log("[Step 12] dWallet fetched. State: ".concat(((_a = dWallet.state) === null || _a === void 0 ? void 0 : _a.$kind) || 'unknown'));
                    console.log('[Step 13] Accepting encrypted user share...');
                    return [4 /*yield*/, ikaTx.acceptEncryptedUserShare({
                            dWallet: dWallet,
                            encryptedUserSecretKeyShareId: '0xec70774ee390c9acf7270cc47f288263fea2db91d20bb3bcc6ce96af5be6cb9f',
                            userPublicOutput: new Uint8Array((_b = dWallet.state.AwaitingKeyHolderSignature) === null || _b === void 0 ? void 0 : _b.public_output),
                        })];
                case 8:
                    _c.sent();
                    console.log('[Step 13] Encrypted user share accepted');
                    console.log('[Step 14] Requesting presign with ECDSASecp256k1 algorithm...');
                    return [4 /*yield*/, ikaTx.requestPresign({
                            dWallet: dWallet, // Use the fetched DWallet object with state
                            signatureAlgorithm: sdk_1.SignatureAlgorithm.ECDSASecp256k1,
                            ikaCoin: userIkaCoin,
                            suiCoin: tx.splitCoins(tx.gas, [1000000]),
                        })];
                case 9:
                    unverifiedPresignCap = _c.sent();
                    console.log("[Step 14] Unverified presign cap created: ".concat(unverifiedPresignCap.$kind));
                    console.log('[Step 15] Verifying presign cap...');
                    return [4 /*yield*/, ikaTx.verifyPresignCap({
                            presign: unverifiedPresignCap, // <-- Directly by providing an object or object ID string
                        })];
                case 10:
                    verifiedPresignCap = _c.sent();
                    console.log("[Step 15] Verified presign cap: ".concat(verifiedPresignCap.$kind));
                    console.log('[Step 16] Transferring verified presign cap to sender...');
                    tx.transferObjects([verifiedPresignCap], senderAddress);
                    console.log('[Step 16] Transfer added to transaction');
                    console.log('[Step 17] Setting transaction sender...');
                    tx.setSender(senderAddress);
                    console.log("[Step 17] Sender set: ".concat(senderAddress));
                    console.log('[Step 18] Converting transaction to JSON...');
                    return [4 /*yield*/, tx.toJSON()];
                case 11:
                    txJSON = _c.sent();
                    console.log('[Step 18] Transaction JSON prepared');
                    console.log('[Step 19] Signing and executing transaction...');
                    return [4 /*yield*/, client.signAndExecuteTransaction({ signer: keypair, transaction: tx })];
                case 12:
                    result = _c.sent();
                    console.log("[Step 19] Transaction executed. Digest: ".concat(result.digest));
                    console.log('[Step 20] Waiting for transaction confirmation...');
                    return [4 /*yield*/, client.waitForTransaction({ digest: result.digest })];
                case 13:
                    waitForTransactionResult = _c.sent();
                    console.log('[Step 20] Transaction confirmed!');
                    console.log('[Step 21] Transaction result:', JSON.stringify(waitForTransactionResult, null, 2));
                    console.log('[Step 21] Presign creation process completed successfully!');
                    return [2 /*return*/];
            }
        });
    });
}
// Execute main with retry logic to avoid concurrency and rate limiting issues
console.log('[Step 0] Starting presign creation script...');
retryWithBackoff(main, 5, 2000).catch(function (error) {
    console.error('[ERROR] Error in main:', error);
    console.error('[ERROR] Stack trace:', error.stack);
    process.exit(1);
});
// ZeroTrust DWallet with unencrypted shares
