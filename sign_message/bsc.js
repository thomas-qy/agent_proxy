/**
 * 根据私钥对消息签名的工具
 * 使用 EIP-191 个人消息签名格式，适用于 BSC/EVM 链上的身份验证等场景
 * @module bsc
 */

import { ethers } from 'ethers';

/**
 * 使用私钥对消息进行签名
 * @param {string} privateKey - 私钥（可带或不带 0x 前缀）
 * @param {string} message - 待签名的原始消息（字符串或十六进制）
 * @returns {Promise<{ signature: string, messageHash: string, address: string }>} 签名结果
 */
async function signMessage(privateKey, message) {
  const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const wallet = new ethers.Wallet(key);
  const signature = await wallet.signMessage(message);
  const messageHash = ethers.hashMessage(message);
  return {
    signature,
    messageHash,
    address: wallet.address,
  };
}

/**
 * 将扁平签名拆分为 v, r, s，便于合约端 ecrecover 验证
 * @param {string} signature - signMessage 返回的 signature 十六进制字符串
 * @returns {{ v: number, r: string, s: string }}
 */
function splitSignature(signature) {
  const sig = ethers.Signature.from(signature);
  return {
    v: sig.v,
    r: sig.r,
    s: sig.s,
  };
}

/**
 * 从签名和原始消息恢复签名者地址（本地验证用）
 * @param {string} message - 原始消息
 * @param {string} signature - 签名十六进制
 * @returns {string} 恢复出的地址
 */
function recoverAddress(message, signature) {
  const recovered = ethers.verifyMessage(message, signature);
  return recovered;
}

// CLI：node bsc.js <privateKey> <message>
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const [,, privateKey, message] = process.argv;
  if (!privateKey || !message) {
    console.error('用法: node bsc.js <私钥> <消息>');
    console.error('示例: node bsc.js 0x1234... "hello world"');
    process.exit(1);
  }
  signMessage(privateKey, message)
    .then(({ signature, messageHash, address }) => {
      console.log('地址:', address);
      console.log('消息哈希:', messageHash);
      console.log('签名:', signature);
      const { v, r, s } = splitSignature(signature);
      console.log('v:', v, 'r:', r, 's:', s);
    })
    .catch((err) => {
      console.error('签名失败:', err.message);
      process.exit(1);
    });
}

export { signMessage, splitSignature, recoverAddress };
