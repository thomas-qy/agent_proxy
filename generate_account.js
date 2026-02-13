import nacl from 'tweetnacl';
import pkg from 'tweetnacl-util';
const { encodeBase64 } = pkg;
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { sendToAI } from './ai_agent/ai_message.js';
const Base_URL = 'https://botcoin.farm/api';

import { botcoin } from './function/botcoin.js';

function fileWrite(filename, content, dir = '') {
    if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = dir ? path.join(dir, filename) : filename;
    fs.writeFileSync(filePath, content);
}
function generateKeyPair() {  
  const keyPair = nacl.sign.keyPair();
  const publicKey = encodeBase64(keyPair.publicKey);  // 44 chars
  const secretKey = encodeBase64(keyPair.secretKey);  // 88 chars - KEEP SAFE
  return { publicKey, secretKey };
}
async function registerUser(publicKey) {
    const url = `${Base_URL}/register/challenge?publicKey=${encodeURIComponent(publicKey)}`;
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();
    console.log(data);
    return data;
}
async function register(publicKey, tweetUrl, challengeId, challengeAnswer) {
    const url = `${Base_URL}/register`;
    const response = await fetch(url, { 
        method: 'POST', 
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ publicKey, tweetUrl, challengeId, challengeAnswer }) 
    });
    const data = await response.json();
    console.log(data);
    return data;
}
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
function question(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

try {
  const { publicKey, secretKey } = generateKeyPair();

  const registerdata = await registerUser(publicKey);
  const challengeId = registerdata.challengeId;
  const challengeAnswer = await botcoin(registerdata.challenge, sendToAI);
  const tweetUrl = await question('Please enter the tweet URL: ');
  const registerResult = await register(publicKey, tweetUrl, challengeId, challengeAnswer);
  console.log('注册成功');
  console.log('注册结果:', registerResult);

  const secretPayload = {
    secreat: secretKey,
    id: registerResult.id,
    publicKey: registerResult.publicKey,
    xHandle: registerResult.xHandle,
    gas: registerResult.gas
  };
  const filename = `secretKey_${Date.now()}.txt`;
  fileWrite(filename, JSON.stringify(secretPayload, null, 2), 'botcoinsecreat');
  console.log('已保存:', path.join('botcoinsecreat', filename));

  rl.close();
  process.exit(0);
} catch (error) {
    console.error('注册失败:', error);
    rl.close();
    process.exit(1);
}


