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
var fs = require("fs");
var path = require("path");
// import coordinator_inner = require('../ika/sdk/typescript/dist/esm/generated/ika_dwallet_2pc_mpc/coordinator_inner');
dotenv.config();
var PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;
if (!PRIVATE_KEY) {
    throw new Error('SUI_PRIVATE_KEY is not set');
}
// Load data from JSON file
var DWALLET_RESULT_FILE = process.env.DWALLET_RESULT_FILE || 'output/dwallet_result.json';
console.log("[Config] Loading dWallet data from: ".concat(DWALLET_RESULT_FILE));
var dwalletData;
try {
    var filePath = path.join(process.cwd(), DWALLET_RESULT_FILE);
    var fileContent = fs.readFileSync(filePath, 'utf-8');
    dwalletData = JSON.parse(fileContent);
    console.log("[Config] Successfully loaded dWallet data from file");
}
catch (error) {
    throw new Error("Failed to load dWallet data from ".concat(DWALLET_RESULT_FILE, ": ").concat(error));
}
// Helper function to convert object with numeric keys to Uint8Array
function objectToUint8Array(obj) {
    var keys = Object.keys(obj).map(function (k) { return parseInt(k); }).sort(function (a, b) { return a - b; });
    return new Uint8Array(keys.map(function (k) { return obj[k]; }));
}
// Extract data from JSON file
var ROOT_SEED_KEY = objectToUint8Array(dwalletData.rootSeedKey);
var sessionIdFromFile = objectToUint8Array(dwalletData.sessionId);
var userPublicOutputFromFile = objectToUint8Array(dwalletData.dkgRequestInput.userPublicOutput);
// Get dWalletObjectID from JSON file or environment variable
var dWalletObjectID = dwalletData.dWalletObjectID;
if (!dWalletObjectID) {
    dWalletObjectID = process.env.DWALLET_OBJECT_ID;
}
if (!dWalletObjectID) {
    throw new Error('dWalletObjectID not found in JSON file or environment variable');
}
console.log("[Config] dWalletObjectID: ".concat(dWalletObjectID));
console.log("[Config] Session ID loaded: ".concat(sessionIdFromFile));
console.log("[Config] Root seed key loaded: ".concat(ROOT_SEED_KEY));
console.log("[Config] User public output loaded: ".concat(userPublicOutputFromFile));
var keypair = ed25519_1.Ed25519Keypair.fromSecretKey(PRIVATE_KEY);
var client = new client_1.SuiClient({ url: (0, client_1.getFullnodeUrl)('testnet') }); // mainnet / testnet
var senderAddress = "0x854ec4225b6fa32572f50e622147ef6cf3c6eaa390f6b9c100afa3f1ae76291d";
var testnetIkaCoinType = '0x1f26bb2f711ff82dcda4d02c77d5123089cb7f8418751474b9fb744ce031526a::ika::IKA';
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
// Retry until condition is met (for polling)
function retryUntil(fn_1, condition_1) {
    return __awaiter(this, arguments, void 0, function (fn, condition, maxRetries, intervalMs) {
        var attempt, result, error_2;
        if (maxRetries === void 0) { maxRetries = 30; }
        if (intervalMs === void 0) { intervalMs = 2000; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    attempt = 0;
                    _a.label = 1;
                case 1:
                    if (!(attempt < maxRetries)) return [3 /*break*/, 8];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, fn()];
                case 3:
                    result = _a.sent();
                    if (condition(result)) {
                        return [2 /*return*/, result];
                    }
                    console.log("[Polling] Attempt ".concat(attempt + 1, "/").concat(maxRetries, " - condition not met, waiting ").concat(intervalMs, "ms..."));
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _a.sent();
                    console.log("[Polling] Attempt ".concat(attempt + 1, "/").concat(maxRetries, " - error: ").concat(error_2.message, ", waiting ").concat(intervalMs, "ms..."));
                    return [3 /*break*/, 5];
                case 5: return [4 /*yield*/, delay(intervalMs)];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    attempt++;
                    return [3 /*break*/, 1];
                case 8: throw new Error("Condition not met after ".concat(maxRetries, " attempts"));
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var tx, userShareKeys, ikaTx, rawUserCoins, rawUserIkaCoins, rawUserSuiCoins, userIkaCoin, userSuiCoin, sessionId, dWalletEncryptionKey, dWallet, dkgRequestInput, encryptedUserSecretKeyShareId, feeCoin, unverifiedPresignCap, txJSON, result, waitForTransactionResult, presignEvent, parsedPresignEvent, presignId, completedPresign, presignResult, presignFilename, presignFilepath;
        var _this = this;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    console.log('[Step 1] Starting presign creation process...');
                    // Add delay before initialization to avoid concurrent requests
                    console.log('[Step 2] Adding initial delay (500ms)...');
                    return [4 /*yield*/, delay(500)];
                case 1:
                    _e.sent();
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
                    _e.sent();
                    console.log('[Step 3] Ika Client initialized successfully');
                    tx = new transactions_1.Transaction();
                    return [4 /*yield*/, sdk_1.UserShareEncryptionKeys.fromRootSeedKey(ROOT_SEED_KEY, sdk_1.Curve.SECP256K1)];
                case 3:
                    userShareKeys = _e.sent();
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
                    rawUserCoins = _e.sent();
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
                    // Use the session ID from dWallet creation (loaded from JSON file)
                    console.log('[Step 7] Using session ID from dWallet creation file...');
                    sessionId = sessionIdFromFile;
                    console.log("[Step 7] Session ID: ".concat(Buffer.from(sessionId).toString('hex').substring(0, 16), "..."));
                    // // Register an encryption key before the DKG, or if you did already you can skip this step
                    // console.log('[Step 8] Registering encryption key...');
                    // await ikaTx.registerEncryptionKey({
                    //     curve: Curve.SECP256K1,
                    // });
                    // console.log('[Step 8] Encryption key registered');
                    console.log('[Step 9] Fetching latest network encryption key...');
                    return [4 /*yield*/, ikaClient.getLatestNetworkEncryptionKey()];
                case 5:
                    dWalletEncryptionKey = _e.sent();
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
                case 6:
                    dWallet = _e.sent();
                    console.log("[Step 12] dWallet fetched. State: ".concat(((_a = dWallet.state) === null || _a === void 0 ? void 0 : _a.$kind) || 'unknown'));
                    console.log('[Step 13] Using user public output from dWallet creation file...');
                    dkgRequestInput = {
                        userPublicOutput: userPublicOutputFromFile
                    };
                    console.log("[Step 13] User public output loaded, length: ".concat(dkgRequestInput.userPublicOutput.length));
                    console.log('[Step 13] dkgRequestInput.userPublicOutput:', dkgRequestInput.userPublicOutput);
                    encryptedUserSecretKeyShareId = (_c = (_b = dWallet.encrypted_user_secret_key_shares) === null || _b === void 0 ? void 0 : _b.id) === null || _c === void 0 ? void 0 : _c.id;
                    console.log("[Step 13] encryptedUserSecretKeyShareId: ".concat(encryptedUserSecretKeyShareId));
                    if (!encryptedUserSecretKeyShareId) {
                        throw new Error("Missing encryptedUserSecretKeyShareId");
                    }
                    feeCoin = tx.splitCoins(tx.gas, [1000000]);
                    console.log('[Step 14] Requesting presign with ECDSASecp256k1 algorithm...');
                    return [4 /*yield*/, ikaTx.requestGlobalPresign({
                            curve: sdk_1.Curve.SECP256K1, // Use the fetched DWallet object with state
                            signatureAlgorithm: sdk_1.SignatureAlgorithm.ECDSASecp256k1,
                            ikaCoin: userIkaCoin,
                            suiCoin: feeCoin, // User's SUI coin object ID
                            dwalletNetworkEncryptionKeyId: dWalletEncryptionKey.id
                        })];
                case 7:
                    unverifiedPresignCap = _e.sent();
                    // Presign with specific dWallet
                    // const unverifiedPresignCap = await ikaTx.requestPresign({
                    //     dWallet: dWallet, // Use the fetched DWallet object with state
                    //     signatureAlgorithm: SignatureAlgorithm.ECDSASecp256k1,
                    //     ikaCoin: userIkaCoin,
                    //     suiCoin: feeCoin // User's SUI coin object ID
                    // });
                    tx.mergeCoins(tx.gas, [feeCoin]);
                    console.log("[Step 14] Unverified presign cap created");
                    // NOTE: Cannot verify presign in the same transaction!
                    // The presign must complete on the network (MPC computation) first.
                    // Transfer unverified cap, wait for completion, then verify in a separate transaction.
                    console.log('[Step 15] Transferring UNVERIFIED presign cap to sender...');
                    tx.transferObjects([unverifiedPresignCap], senderAddress);
                    console.log('[Step 15] Transfer added to transaction');
                    console.log('[Step 16] Setting transaction sender...');
                    tx.setSender(senderAddress);
                    console.log("[Step 16] Sender set: ".concat(senderAddress));
                    console.log('[Step 17] Converting transaction to JSON...');
                    return [4 /*yield*/, tx.toJSON()];
                case 8:
                    txJSON = _e.sent();
                    console.log('[Step 17] Transaction JSON prepared');
                    console.log("txJSON: ", txJSON);
                    console.log('[Step 18] Signing and executing transaction...');
                    return [4 /*yield*/, client.signAndExecuteTransaction({
                            signer: keypair,
                            transaction: tx,
                            options: { showEvents: true }
                        })];
                case 9:
                    result = _e.sent();
                    console.log("[Step 18] Transaction executed. Digest: ".concat(result.digest));
                    console.log('[Step 19] Waiting for transaction confirmation...');
                    return [4 /*yield*/, client.waitForTransaction({
                            digest: result.digest,
                            options: { showEvents: true }
                        })];
                case 10:
                    waitForTransactionResult = _e.sent();
                    console.log('[Step 19] Transaction confirmed!');
                    // Extract presign ID from the event
                    console.log('[Step 20] Extracting presign ID from events...');
                    presignEvent = (_d = waitForTransactionResult.events) === null || _d === void 0 ? void 0 : _d.find(function (event) { return event.type.includes('PresignRequestEvent'); });
                    if (!presignEvent) {
                        throw new Error('PresignRequestEvent not found in transaction events');
                    }
                    parsedPresignEvent = sdk_1.SessionsManagerModule.DWalletSessionEvent(sdk_1.CoordinatorInnerModule.PresignRequestEvent).fromBase64(presignEvent.bcs);
                    presignId = parsedPresignEvent.event_data.presign_id;
                    console.log("[Step 20] Presign ID: ".concat(presignId));
                    // Wait for presign to complete on the network
                    console.log('[Step 21] Waiting for presign to complete on the network...');
                    console.log('[Step 21] This may take some time as the MPC protocol runs...');
                    return [4 /*yield*/, retryUntil(function () { return ikaClient.getPresignInParticularState(presignId, 'Completed'); }, function (presign) { return presign !== null; }, 60, // max retries
                        3000 // interval in ms (3 seconds)
                        )];
                case 11:
                    completedPresign = _e.sent();
                    console.log('[Step 21] Presign completed!');
                    console.log("[Step 21] Presign state: ".concat(completedPresign.state.$kind));
                    presignResult = {
                        timestamp: new Date().toISOString(),
                        transactionDigest: result.digest,
                        presignId: presignId,
                        presignCapId: completedPresign.cap_id,
                        dWalletObjectID: dWalletObjectID,
                        curve: 'SECP256K1',
                        signatureAlgorithm: 'ECDSASecp256k1',
                    };
                    presignFilename = "presign_result.json";
                    presignFilepath = path.join(process.cwd(), 'output', presignFilename);
                    fs.writeFileSync(presignFilepath, JSON.stringify(presignResult, null, 2), 'utf-8');
                    console.log("[Step 22] Presign result saved to: ".concat(presignFilepath));
                    console.log('[Step 22] Presign creation process completed successfully!');
                    console.log('[Step 22] You can now use this presign for signing in a separate transaction.');
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
