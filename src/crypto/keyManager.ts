import { Buffer } from "buffer";
import * as SecureStore from "expo-secure-store";
import crypto from "react-native-quick-crypto";

const PRIVATE_KEY_STORAGE = "e2ee_private_key";
const PUBLIC_KEY_STORAGE = "e2ee_public_key";

export interface E2EEKeyPair {
  privateKey: string;
  publicKey: string;
}

export async function generateKeyPair(): Promise<E2EEKeyPair> {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("x25519", {
    publicKeyEncoding: {
      type: "spki",
      format: "der",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "der",
    },
  });

  if (!publicKey || !privateKey) {
    throw new Error("Failed to generate X25519 key pair");
  }

  const publicKeyBase64 = Buffer.from(publicKey as Uint8Array).toString(
    "base64",
  );
  const privateKeyBase64 = Buffer.from(privateKey as Uint8Array).toString(
    "base64",
  );

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64,
  };
}

export async function initializeKeyPair(): Promise<E2EEKeyPair> {
  const existingPrivateKey =
    await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE);

  const existingPublicKey = await SecureStore.getItemAsync(PUBLIC_KEY_STORAGE);

  if (existingPrivateKey && existingPublicKey) {
    console.log("E2EE: Key pair đã tồn tại");

    return {
      privateKey: existingPrivateKey,
      publicKey: existingPublicKey,
    };
  }

  console.log("E2EE: Đang tạo key pair mới...");

  const keyPair = await generateKeyPair();
  await SecureStore.setItemAsync(PRIVATE_KEY_STORAGE, keyPair.privateKey);
  await SecureStore.setItemAsync(PUBLIC_KEY_STORAGE, keyPair.publicKey);

  console.log("E2EE: Đã tạo key pair");

  return keyPair;
}

export async function getPrivateKey(): Promise<string | null> {
  return SecureStore.getItemAsync(PRIVATE_KEY_STORAGE);
}

export async function getPublicKey(): Promise<string | null> {
  return SecureStore.getItemAsync(PUBLIC_KEY_STORAGE);
}
