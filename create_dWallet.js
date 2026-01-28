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
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var rootSeedKey, tx, userShareKeys, ikaTx, rawUserCoins, rawUserIkaCoins, rawUserSuiCoins, userIkaCoin, userSuiCoin, sessionId, dWalletEncryptionKey, dkgRequestInput, _a, dwalletCap, sign_ID, txJSON, result, waitForTransactionResult, dWalletObjectID, dWalletChange, resultData, outputDir, filename, filepath;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: 
                // Add delay before initialization to avoid concurrent requests
                return [4 /*yield*/, delay(500)];
                case 1:
                    // Add delay before initialization to avoid concurrent requests
                    _b.sent();
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
                    _b.sent();
                    rootSeedKey = new Uint8Array(32);
                    crypto.getRandomValues(rootSeedKey);
                    tx = new transactions_1.Transaction();
                    return [4 /*yield*/, sdk_1.UserShareEncryptionKeys.fromRootSeedKey(rootSeedKey, sdk_1.Curve.SECP256K1)];
                case 3:
                    userShareKeys = _b.sent();
                    ikaTx = new sdk_1.IkaTransaction({
                        ikaClient: ikaClient,
                        transaction: tx,
                        userShareEncryptionKeys: userShareKeys
                    });
                    return [4 /*yield*/, client.getAllCoins({
                            owner: senderAddress
                        })];
                case 4:
                    rawUserCoins = _b.sent();
                    console.log(rawUserCoins);
                    rawUserIkaCoins = rawUserCoins.data.filter(function (coin) { return coin.coinType === testnetIkaCoinType; });
                    rawUserSuiCoins = rawUserCoins.data.filter(function (coin) { return coin.coinType === '0x2::sui::SUI'; });
                    // const rawUserIkaCoins = rawUserCoins.data.filter() //some filtering logic inside it
                    if (!rawUserIkaCoins[0] || !rawUserSuiCoins[1]) {
                        throw new Error('Missing required coins');
                    }
                    userIkaCoin = tx.object(rawUserIkaCoins[0].coinObjectId);
                    userSuiCoin = tx.object(rawUserSuiCoins[1].coinObjectId);
                    sessionId = (0, sdk_1.createRandomSessionIdentifier)();
                    // Register an encryption key before the DKG, or if you did already you can skip this step
                    return [4 /*yield*/, ikaTx.registerEncryptionKey({
                            curve: sdk_1.Curve.SECP256K1,
                        })];
                case 5:
                    // Register an encryption key before the DKG, or if you did already you can skip this step
                    _b.sent();
                    return [4 /*yield*/, ikaClient.getLatestNetworkEncryptionKey()];
                case 6:
                    dWalletEncryptionKey = _b.sent();
                    return [4 /*yield*/, (0, sdk_1.prepareDKGAsync)(ikaClient, sdk_1.Curve.SECP256K1, userShareKeys, sessionId, senderAddress)];
                case 7:
                    dkgRequestInput = _b.sent();
                    // const sessionIdentifier = ikaTx.createSessionIdentifier();
                    // process.exit(0);
                    console.log("sessionId: ", sessionId);
                    return [4 /*yield*/, ikaTx.requestDWalletDKG({
                            dkgRequestInput: dkgRequestInput,
                            sessionIdentifier: ikaTx.registerSessionIdentifier(sessionId),
                            dwalletNetworkEncryptionKeyId: dWalletEncryptionKey.id, // id of dWalletEncryptionKey is the network encryption key ID
                            curve: sdk_1.Curve.SECP256K1, // or Curve.SECP256R1, Curve.ED25519, etc.
                            ikaCoin: userIkaCoin,
                            suiCoin: userSuiCoin
                        })];
                case 8:
                    _a = _b.sent(), dwalletCap = _a[0], sign_ID = _a[1];
                    tx.transferObjects([dwalletCap], senderAddress);
                    // Note: The remaining balance from suiCoin after splitCoins is automatically returned
                    // No need to transfer userSuiCoinRemaining as splitCoins consumes the original coin
                    // tx.transferObjects([userSuiCoin], senderAddress);
                    tx.setSender(senderAddress);
                    return [4 /*yield*/, tx.toJSON()];
                case 9:
                    txJSON = _b.sent();
                    return [4 /*yield*/, client.signAndExecuteTransaction({ signer: keypair, transaction: tx })];
                case 10:
                    result = _b.sent();
                    return [4 /*yield*/, client.waitForTransaction({ digest: result.digest })];
                case 11:
                    waitForTransactionResult = _b.sent();
                    console.log("waitForTransactionResult: ", waitForTransactionResult);
                    console.log("sessionId: ", sessionId);
                    console.log("rootSeedKey: ", rootSeedKey);
                    console.log("dkgRequestInput: ", dkgRequestInput.userPublicOutput);
                    if (waitForTransactionResult.objectChanges) {
                        dWalletChange = waitForTransactionResult.objectChanges.find(function (change) {
                            var _a, _b;
                            return (change.type === 'created' || change.type === 'mutated') &&
                                (((_a = change.objectType) === null || _a === void 0 ? void 0 : _a.includes('DWallet')) || ((_b = change.objectType) === null || _b === void 0 ? void 0 : _b.includes('dwallet')));
                        });
                        if (dWalletChange) {
                            dWalletObjectID = dWalletChange.objectId;
                        }
                    }
                    // If not found in objectChanges, try to get it from the dwalletCap
                    if (!dWalletObjectID && dwalletCap) {
                        // The dwalletCap might have the dWallet ID, or we need to query it
                        // For now, we'll need to extract it from the transaction effects
                        console.log("Warning: Could not extract dWalletObjectID from transaction result");
                    }
                    // Store results in a file
                    console.log("Saving results to file...");
                    resultData = {
                        timestamp: new Date().toISOString(),
                        transactionDigest: result.digest,
                        waitForTransactionResult: waitForTransactionResult,
                        sessionId: sessionId,
                        rootSeedKey: rootSeedKey,
                        dkgRequestInput: {
                            userPublicOutput: dkgRequestInput.userPublicOutput,
                        },
                        senderAddress: senderAddress,
                        dWalletNetworkEncryptionKeyId: dWalletEncryptionKey.id,
                        dWalletObjectID: dWalletObjectID,
                    };
                    outputDir = path.join(process.cwd(), 'output');
                    if (!fs.existsSync(outputDir)) {
                        fs.mkdirSync(outputDir, { recursive: true });
                    }
                    filename = "dwallet_result_".concat(Date.now(), ".json");
                    filepath = path.join(outputDir, filename);
                    fs.writeFileSync(filepath, JSON.stringify(resultData, null, 2), 'utf-8');
                    console.log("Results saved to: ".concat(filepath));
                    return [2 /*return*/];
            }
        });
    });
}
// Execute main with retry logic to avoid concurrency and rate limiting issues
retryWithBackoff(main, 5, 2000).catch(function (error) {
    console.error('Error in main:', error);
    process.exit(1);
});
