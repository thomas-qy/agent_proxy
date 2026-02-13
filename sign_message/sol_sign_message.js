/**
 * Solana 根据私钥对消息签名的工具
 * 使用 Ed25519 签名，适用于 Solana 链上的身份验证等场景
 * @module sol_sign_message
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * 将十六进制字符串转为 Uint8Array（支持 0x 前缀）
 * @param {string} hex - 十六进制字符串
 * @returns {Uint8Array}
 */
function hexToBytes(hex) {
  const raw = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (raw.length % 2 !== 0) throw new Error("十六进制长度必须为偶数");
  const bytes = new Uint8Array(raw.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(raw.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * 将私钥输入解析为 64 字节 Uint8Array（支持 base58、十六进制或 32/64 字节数组）
 * @param {string | number[] | Uint8Array} privateKey - base58 字符串、0x 十六进制或字节数组
 * @returns {Uint8Array} 64 字节密钥
 */
function parseSecretKey(privateKey) {
  if (typeof privateKey === 'string') {
    const trimmed = privateKey.trim();
    const isHex = /^(0x)?[0-9a-fA-F]+$/.test(trimmed);
    if (isHex) {
      const decoded = hexToBytes(trimmed);
      if (decoded.length === 64) return decoded;
      if (decoded.length === 32) return Keypair.fromSeed(decoded).secretKey;
      throw new Error('私钥十六进制解码后应为 32 或 64 字节（64 或 128 个十六进制字符）');
    }
    const decoded = bs58.decode(trimmed);
    if (decoded.length === 64) return decoded;
    if (decoded.length === 32) return Keypair.fromSeed(decoded).secretKey;
    throw new Error('私钥 base58 解码后应为 32 或 64 字节');
  }
  const arr = Array.isArray(privateKey) ? new Uint8Array(privateKey) : privateKey;
  if (arr.length === 64) return arr;
  if (arr.length === 32) return Keypair.fromSeed(arr).secretKey;
  throw new Error('私钥应为 32 或 64 字节');
}

/**
 * 使用 Solana 私钥对消息进行 Ed25519 签名
 * @param {string | number[] | Uint8Array} privateKey - 私钥（base58 字符串或 32/64 字节）
 * @param {string | Uint8Array} message - 待签名的原始消息（字符串或字节）
 * @returns {{ signature: string, signatureBytes: Uint8Array, publicKey: string }}
 */
function signMessage(privateKey, message) {
  const secretKey = parseSecretKey(privateKey);
  const keypair = Keypair.fromSecretKey(secretKey);
  const messageBytes =
    typeof message === 'string'
      ? new TextEncoder().encode(message)
      : message;
  const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
  const signatureBase64 = Buffer.from(signatureBytes).toString('base64');
  return {
    signature: signatureBase64,
    signatureBytes,
    publicKey: keypair.publicKey.toBase58(),
  };
}

/**
 * 验证签名是否由指定公钥对消息签出
 * @param {string | Uint8Array} message - 原始消息
 * @param {string | Uint8Array} signature - 签名（base64 或 64 字节）
 * @param {string} publicKeyBase58 - 公钥 base58
 * @returns {boolean}
 */
function verifyMessage(message, signature, publicKeyBase58) {
  const messageBytes =
    typeof message === 'string'
      ? new TextEncoder().encode(message)
      : message;
  const sigBytes =
    typeof signature === 'string'
      ? Buffer.from(signature, 'base64')
      : signature;
  const pubkeyBytes = new PublicKey(publicKeyBase58).toBytes();
  return nacl.sign.detached.verify(messageBytes, sigBytes, pubkeyBytes);
}

// CLI：node sol_sign_message.js <privateKey> <message>
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const [,, privateKey, message] = process.argv;
  if (!privateKey || !message) {
    console.error('用法: node sol_sign_message.js <私钥 base58> <消息>');
    console.error('示例: node sol_sign_message.js 5J3... "hello"');
    process.exit(1);
  }
  try {
    const { signature, publicKey } = signMessage(privateKey, message);
    console.log('公钥:', publicKey);
    console.log('签名(base64):', signature);
    console.log('验证:', verifyMessage(message, signature, publicKey));
  } catch (err) {
    console.error('签名失败:', err.message);
    process.exit(1);
  }
}

export { signMessage, verifyMessage, parseSecretKey };
