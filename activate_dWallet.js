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
    if (obj instanceof Uint8Array)
        return obj;
    if (Array.isArray(obj))
        return new Uint8Array(obj);
    var keys = Object.keys(obj).map(function (k) { return parseInt(k); }).sort(function (a, b) { return a - b; });
    return new Uint8Array(keys.map(function (k) { return obj[k]; }));
}
// Extract data from JSON file
var ROOT_SEED_KEY = objectToUint8Array(dwalletData.rootSeedKey);
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
console.log("[Config] Root seed key loaded (first 10 bytes): ".concat(Buffer.from(ROOT_SEED_KEY.slice(0, 10)).toString('hex')));
console.log("[Config] User public output loaded, length: ".concat(userPublicOutputFromFile.length));
var keypair = ed25519_1.Ed25519Keypair.fromSecretKey(PRIVATE_KEY);
var client = new client_1.SuiClient({ url: (0, client_1.getFullnodeUrl)('testnet') });
// const senderAddress = "0x854ec4225b6fa32572f50e622147ef6cf3c6eaa390f6b9c100afa3f1ae76291d";
var ikaClient = new sdk_1.IkaClient({
    suiClient: client,
    config: (0, sdk_1.getNetworkConfig)('testnet'),
});
// Helper function to add delay
function delay(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
// Retry function with exponential backoff
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
                case 6: throw error_1;
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
        var dWalletCurrent, currentState, dWallet_1, error_2, dWallet, tx, userShareKeys, ikaTx, tableId, dynamicFields, encryptedUserSecretKeyShareId, txJSON, result, waitForTransactionResult, activeDWallet, error_3;
        var _this = this;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    console.log('[Step 1] Starting dWallet activation process...');
                    return [4 /*yield*/, delay(500)];
                case 1:
                    _f.sent();
                    console.log('[Step 2] Initializing Ika Client...');
                    return [4 /*yield*/, retryWithBackoff(function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, ikaClient.initialize()];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 2:
                    _f.sent();
                    console.log('[Step 2] Ika Client initialized successfully');
                    // Check current dWallet state
                    console.log("[Step 3] Fetching dWallet: ".concat(dWalletObjectID, "..."));
                    return [4 /*yield*/, retryWithBackoff(function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, ikaClient.getDWallet(dWalletObjectID)];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 3:
                    dWalletCurrent = _f.sent();
                    currentState = ((_a = dWalletCurrent.state) === null || _a === void 0 ? void 0 : _a.$kind) || 'unknown';
                    console.log("[Step 3] dWallet current state: ".concat(currentState));
                    // Check if already Active
                    if (currentState === 'Active') {
                        console.log('[Step 3] dWallet is already Active. No activation needed.');
                        console.log('[SUCCESS] dWallet is ready for presign operations.');
                        return [2 /*return*/];
                    }
                    if (!(currentState !== 'AwaitingKeyHolderSignature')) return [3 /*break*/, 7];
                    console.log("[Step 3] dWallet is in ".concat(currentState, " state. Waiting for AwaitingKeyHolderSignature..."));
                    _f.label = 4;
                case 4:
                    _f.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, ikaClient.getDWalletInParticularState(dWalletObjectID, 'AwaitingKeyHolderSignature', { timeout: 300000, interval: 5000 })];
                case 5:
                    dWallet_1 = _f.sent();
                    console.log('[Step 3] dWallet reached AwaitingKeyHolderSignature state');
                    return [3 /*break*/, 7];
                case 6:
                    error_2 = _f.sent();
                    throw new Error("Failed to reach AwaitingKeyHolderSignature state: ".concat(error_2.message));
                case 7: return [4 /*yield*/, retryWithBackoff(function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, ikaClient.getDWallet(dWalletObjectID)];
                                case 1: return [2 /*return*/, _a.sent()];
                            }
                        });
                    }); })];
                case 8:
                    dWallet = _f.sent();
                    console.log("dWallet: ", dWallet.state.$kind);
                    // Create transaction for activation
                    console.log('[Step 4] Creating activation transaction...');
                    tx = new transactions_1.Transaction();
                    return [4 /*yield*/, sdk_1.UserShareEncryptionKeys.fromRootSeedKey(ROOT_SEED_KEY, sdk_1.Curve.SECP256K1)];
                case 9:
                    userShareKeys = _f.sent();
                    console.log('[Step 4] UserShareEncryptionKeys created');
                    ikaTx = new sdk_1.IkaTransaction({
                        ikaClient: ikaClient,
                        transaction: tx,
                        userShareEncryptionKeys: userShareKeys
                    });
                    tableId = (_c = (_b = dWallet.encrypted_user_secret_key_shares) === null || _b === void 0 ? void 0 : _b.id) === null || _c === void 0 ? void 0 : _c.id;
                    if (!tableId) {
                        throw new Error('encrypted_user_secret_key_shares table not found on dWallet');
                    }
                    console.log("[Step 5] encrypted_user_secret_key_shares table ID: ".concat(tableId));
                    return [4 /*yield*/, client.getDynamicFields({ parentId: tableId })];
                case 10:
                    dynamicFields = _f.sent();
                    if (!dynamicFields.data || dynamicFields.data.length === 0) {
                        throw new Error('No encrypted user secret key shares found in the table. The network may not have completed DKG yet.');
                    }
                    console.log("[Step 5] Found ".concat(dynamicFields.data.length, " encrypted share(s) in table"));
                    encryptedUserSecretKeyShareId = dynamicFields.data[0].objectId;
                    console.log("[Step 6] encryptedUserSecretKeyShareId: ".concat(encryptedUserSecretKeyShareId));
                    // Accept encrypted user share
                    console.log('[Step 7] Accepting encrypted user share...');
                    return [4 /*yield*/, ikaTx.acceptEncryptedUserShare({
                            dWallet: dWallet,
                            encryptedUserSecretKeyShareId: encryptedUserSecretKeyShareId,
                            userPublicOutput: userPublicOutputFromFile,
                        })];
                case 11:
                    _f.sent();
                    console.log('[Step 7] Encrypted user share accepted');
                    console.log('[Step 9] Signing and executing transaction...');
                    return [4 /*yield*/, tx.toJSON()];
                case 12:
                    txJSON = _f.sent();
                    console.log("txJSON: ", txJSON);
                    return [4 /*yield*/, client.signAndExecuteTransaction({ signer: keypair, transaction: tx })];
                case 13:
                    result = _f.sent();
                    console.log("[Step 9] Transaction executed. Digest: ".concat(result.digest));
                    console.log('[Step 10] Waiting for transaction confirmation...');
                    return [4 /*yield*/, client.waitForTransaction({ digest: result.digest })];
                case 14:
                    waitForTransactionResult = _f.sent();
                    console.log('[Step 10] Transaction confirmed!');
                    // Wait for dWallet to become Active
                    console.log('[Step 11] Waiting for dWallet to become Active...');
                    _f.label = 15;
                case 15:
                    _f.trys.push([15, 17, , 18]);
                    return [4 /*yield*/, ikaClient.getDWalletInParticularState(dWalletObjectID, 'Active', { timeout: 120000, interval: 3000 })];
                case 16:
                    activeDWallet = _f.sent();
                    console.log('[Step 11] dWallet is now Active!');
                    console.log("[Step 11] Active dWallet public_output length: ".concat(((_e = (_d = activeDWallet.state.Active) === null || _d === void 0 ? void 0 : _d.public_output) === null || _e === void 0 ? void 0 : _e.length) || 'N/A'));
                    return [3 /*break*/, 18];
                case 17:
                    error_3 = _f.sent();
                    console.log("[Step 11] Warning: Timeout waiting for Active state. The dWallet may still be processing.");
                    console.log("[Step 11] You can check the state later and proceed with create_Presign.ts once Active.");
                    return [3 /*break*/, 18];
                case 18:
                    console.log('[SUCCESS] dWallet activation process completed!');
                    console.log("[SUCCESS] Transaction digest: ".concat(result.digest));
                    console.log('[SUCCESS] You can now run create_Presign.ts to request a presign.');
                    return [2 /*return*/];
            }
        });
    });
}
// Execute main
console.log('[Step 0] Starting dWallet activation script...');
retryWithBackoff(main, 5, 2000).catch(function (error) {
    console.error('[ERROR] Error in main:', error);
    console.error('[ERROR] Stack trace:', error.stack);
    process.exit(1);
});
