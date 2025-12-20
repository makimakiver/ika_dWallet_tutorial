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
var PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;
if (!PRIVATE_KEY) {
    throw new Error('SUI_PRIVATE_KEY is not set');
}
var keypair = ed25519_1.Ed25519Keypair.fromSecretKey(PRIVATE_KEY);
var client = new client_1.SuiClient({ url: (0, client_1.getFullnodeUrl)('testnet') }); // mainnet / testnet
var senderAddress = "0xaf2c7c81964eaa18c5ab4945333ba6eb047b0441645c805cc340f7a55e4e2cb7";
var testnetIkaCoinType = '0x1f26bb2f711ff82dcda4d02c77d5123089cb7f8418751474b9fb744ce031526a::ika::IKA';
var ikaClient = new sdk_1.IkaClient({
    suiClient: client,
    config: (0, sdk_1.getNetworkConfig)('testnet'), // mainnet / testnet
});
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var rootSeedKey, tx, userShareKeys, ikaTx, rawUserCoins, rawUserIkaCoins, rawUserSuiCoins, userIkaCoin, userSuiCoin, _a, encryptionKey, decryptionKey, protocolParams, sessionId, dWalletEncryptionKey, dkgRequestInput, sessionIdentifier, _b, dwalletCap, sign_ID, txJSON, result, waitForTransactionResult;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, ikaClient.initialize()];
                case 1:
                    _c.sent(); // This will initialize the Ika Client and fetch the Ika protocol state and objects.
                    rootSeedKey = new Uint8Array(32);
                    crypto.getRandomValues(rootSeedKey);
                    tx = new transactions_1.Transaction();
                    return [4 /*yield*/, sdk_1.UserShareEncryptionKeys.fromRootSeedKey(rootSeedKey, sdk_1.Curve.SECP256K1)];
                case 2:
                    userShareKeys = _c.sent();
                    ikaTx = new sdk_1.IkaTransaction({
                        ikaClient: ikaClient,
                        transaction: tx,
                        userShareEncryptionKeys: userShareKeys
                    });
                    return [4 /*yield*/, client.getAllCoins({
                            owner: senderAddress
                        })];
                case 3:
                    rawUserCoins = _c.sent();
                    console.log(rawUserCoins);
                    rawUserIkaCoins = rawUserCoins.data.filter(function (coin) { return coin.coinType === testnetIkaCoinType; });
                    rawUserSuiCoins = rawUserCoins.data.filter(function (coin) { return coin.coinType === '0x2::sui::SUI'; });
                    // const rawUserIkaCoins = rawUserCoins.data.filter() //some filtering logic inside it
                    if (!rawUserIkaCoins[0] || !rawUserSuiCoins[0]) {
                        throw new Error('Missing required coins');
                    }
                    userIkaCoin = tx.object(rawUserIkaCoins[0].coinObjectId);
                    userSuiCoin = tx.object(rawUserSuiCoins[0].coinObjectId);
                    return [4 /*yield*/, (0, sdk_1.createClassGroupsKeypair)(rootSeedKey, sdk_1.Curve.SECP256K1)];
                case 4:
                    _a = _c.sent(), encryptionKey = _a.encryptionKey, decryptionKey = _a.decryptionKey;
                    return [4 /*yield*/, ikaClient.getProtocolPublicParameters(undefined, sdk_1.Curve.SECP256K1)];
                case 5:
                    protocolParams = _c.sent();
                    sessionId = (0, sdk_1.createRandomSessionIdentifier)();
                    console.log("sessionId: ", sessionId);
                    // Register an encryption key before the DKG, or if you did already you can skip this step
                    return [4 /*yield*/, ikaTx.registerEncryptionKey({
                            curve: sdk_1.Curve.SECP256K1,
                        })];
                case 6:
                    // Register an encryption key before the DKG, or if you did already you can skip this step
                    _c.sent();
                    return [4 /*yield*/, ikaClient.getLatestNetworkEncryptionKey()];
                case 7:
                    dWalletEncryptionKey = _c.sent();
                    return [4 /*yield*/, (0, sdk_1.prepareDKGAsync)(ikaClient, sdk_1.Curve.SECP256K1, userShareKeys, sessionId, senderAddress)];
                case 8:
                    dkgRequestInput = _c.sent();
                    sessionIdentifier = ikaTx.createSessionIdentifier();
                    console.log("dWalletNetworkEncryptionKeyId: ", dWalletEncryptionKey.id);
                    return [4 /*yield*/, ikaTx.requestDWalletDKG({
                            dkgRequestInput: dkgRequestInput,
                            sessionIdentifier: sessionIdentifier,
                            dwalletNetworkEncryptionKeyId: dWalletEncryptionKey.id, // senderAddress is the network encryption key ID
                            curve: sdk_1.Curve.SECP256K1, // or Curve.SECP256R1, Curve.ED25519, etc.
                            ikaCoin: userIkaCoin,
                            suiCoin: userSuiCoin
                        })];
                case 9:
                    _b = _c.sent(), dwalletCap = _b[0], sign_ID = _b[1];
                    tx.transferObjects([dwalletCap], senderAddress);
                    return [4 /*yield*/, tx.toJSON()];
                case 10:
                    txJSON = _c.sent();
                    console.log("txJSON: ", txJSON);
                    return [4 /*yield*/, client.signAndExecuteTransaction({ signer: keypair, transaction: tx })];
                case 11:
                    result = _c.sent();
                    return [4 /*yield*/, client.waitForTransaction({ digest: result.digest })];
                case 12:
                    waitForTransactionResult = _c.sent();
                    console.log("waitForTransactionResult: ", waitForTransactionResult);
                    return [2 /*return*/];
            }
        });
    });
}
;
main();
