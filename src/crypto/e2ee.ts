import { Buffer } from "@craftzdog/react-native-buffer";
import crypto from "react-native-quick-crypto";
import axiosClient from "../Api/services/axiosClient";
import { getPrivateKey, initializeKeyPair } from "./keyManager";

export interface EncryptedMessage {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export async function initializeE2EE() {
  const keyPair = await initializeKeyPair();

  await axiosClient.put("/api/v1/e2ee/public-key", {
    publicKey: keyPair.publicKey,
    algorithm: "X25519",
  });

  console.log("E2EE: Public key đã upload");
  return keyPair;
}

export async function loadPrivateKey() {
  const privateKey = await getPrivateKey();

  if (!privateKey) {
    throw new Error("Không tìm thấy E2EE private key");
  }

  return privateKey;
}

export function deriveSharedSecret(
  privateKeyBase64: string,
  publicKeyBase64: string,
): Buffer {
  const privateKey = crypto.createPrivateKey({
    key: Buffer.from(privateKeyBase64, "base64"),
    format: "der",
    type: "pkcs8",
  });

  const publicKey = crypto.createPublicKey({
    key: Buffer.from(publicKeyBase64, "base64"),
    format: "der",
    type: "spki",
  });

  const sharedSecret = crypto.diffieHellman({
    privateKey,
    publicKey,
  });

  if (!sharedSecret) {
    throw new Error("Không thể tạo E2EE shared secret");
  }

  return sharedSecret;
}

//dùng HKDF-SHA256 để biến sharedSecret thành một khóa AES 32 byte (256 bit)
export function deriveAESKey(sharedSecret: Buffer): Buffer {
  const derivedKey = crypto.hkdfSync(
    "sha256",
    sharedSecret,
    Buffer.alloc(32, 0), //tạo một Buffer có: 32 byte và tất cả đều bằng 0 vd 00 00 00 ...
    Buffer.from("ChatOnline-E2EE-v1"),
    32,
  );

  return sharedSecret as Buffer;
}

export function encryptMessage(
  plaintext: string,
  aesKey: Buffer,
): EncryptedMessage {
  const iv = crypto.randomBytes(12); // không dùng Nonce/IV 2 lần

  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext, "utf8")),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
} // AES-GCM thường dùng nonce/IV 96-bit: 96 bits = 12 bytes

export function decryptMessage(
  encryptedMessage: EncryptedMessage,
  aesKey: Buffer,
): string {
  const iv = Buffer.from(encryptedMessage.iv, "base64");
  const ciphertext = Buffer.from(encryptedMessage.ciphertext, "base64");
  const authTag = Buffer.from(encryptedMessage.authTag, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, iv);

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export async function encryptForUser(
  receiverUserId: number,
  plaintext: string,
): Promise<EncryptedMessage> {
  const privateKey = await loadPrivateKey();

  const response = await axiosClient.get(
    `/api/v1/e2ee/public-key/${receiverUserId}`,
  );

  const receiverPublicKey = response.data.publicKey;

  const sharedSecret = deriveSharedSecret(privateKey, receiverPublicKey);

  const aesKey = deriveAESKey(sharedSecret);

  return encryptMessage(plaintext, aesKey);
}
