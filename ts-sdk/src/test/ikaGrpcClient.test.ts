import {
  IkaGrpcClient,
  IkaGrpcTransaction,
  getNetworkConfig,
  Curve,
  SignatureAlgorithm,
  UserShareEncryptionKeys,
} from "@ika.xyz/sdk";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import * as dotenv from "dotenv";

dotenv.config({ quiet: true } as any);

const GRPC_URL = "https://fullnode.testnet.sui.io:443";
const NETWORK = "testnet";

// Shared instances across tests
let suiGrpcClient: SuiGrpcClient;
let ikaClient: IkaGrpcClient;

// ─────────────────────────────────────────────
// 1. Construction
// ─────────────────────────────────────────────
describe("IkaGrpcClient – Construction", () => {
  test("SuiGrpcClient can be constructed", () => {
    suiGrpcClient = new SuiGrpcClient({
      network: NETWORK,
      baseUrl: GRPC_URL,
    });
    expect(suiGrpcClient).toBeDefined();
  });

  test("IkaGrpcClient can be constructed with SuiGrpcClient", () => {
    ikaClient = new IkaGrpcClient({
      suiClient: suiGrpcClient as any,
      config: getNetworkConfig(NETWORK),
    });
    expect(ikaClient).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// 2. Initialisation
// ─────────────────────────────────────────────
describe("IkaGrpcClient – Initialisation", () => {
  test("IkaGrpcClient can be initialised (fetches network objects)", async () => {
    await expect(ikaClient.initialize()).resolves.not.toThrow();
  }, 30_000);

  test("getLatestNetworkEncryptionKey returns a valid key after init", async () => {
    const key = await ikaClient.getLatestNetworkEncryptionKey();
    expect(key).toBeDefined();
    expect(typeof key.id).toBe("string");
    expect(key.id.length).toBeGreaterThan(0);
  }, 15_000);
});

// ─────────────────────────────────────────────
// 3. Transaction – dWallet DKG
// ─────────────────────────────────────────────
describe("IkaGrpcClient – Transaction (dWallet creation)", () => {
  test("UserShareEncryptionKeys can be created for SECP256K1", async () => {
    const rootSeedKey = new Uint8Array(32);
    crypto.getRandomValues(rootSeedKey);
    const keys = await UserShareEncryptionKeys.fromRootSeedKey(
      rootSeedKey,
      Curve.SECP256K1,
    );
    expect(keys).toBeDefined();
  });

  test("UserShareEncryptionKeys can be created for ED25519", async () => {
    const rootSeedKey = new Uint8Array(32);
    crypto.getRandomValues(rootSeedKey);
    const keys = await UserShareEncryptionKeys.fromRootSeedKey(
      rootSeedKey,
      Curve.ED25519,
    );
    expect(keys).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// 4. Signature algorithms
// ─────────────────────────────────────────────
describe("IkaGrpcClient – Signature algorithms", () => {
  test("SignatureAlgorithm.ECDSASecp256k1 is defined", () => {
    expect(SignatureAlgorithm.ECDSASecp256k1).toBeDefined();
  });

  test("SignatureAlgorithm.ECDSARecoverableSecp256k1 is defined", () => {
    expect(SignatureAlgorithm.ECDSARecoverableSecp256k1).toBeDefined();
  });

  test("Curve.SECP256K1 is defined", () => {
    expect(Curve.SECP256K1).toBeDefined();
  });

  test("Curve.ED25519 is defined", () => {
    expect(Curve.ED25519).toBeDefined();
  });
});
