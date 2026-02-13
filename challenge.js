import nacl from 'tweetnacl';
import pkg from 'tweetnacl-util';
const { encodeBase64, decodeBase64 } = pkg;
import fs from 'fs';
import path from 'path';
import readline from 'readline';
const Base_URL = 'https://botcoin.farm';
import { sendToAI } from './ai_agent/ai_message.js';
import { poem } from './function/poem.js';

async function getHunts(publicKey) {
    const url = `${Base_URL}/api/hunts`;
    const response = await fetch(url, { method: 'GET', headers: { 'X-Public-Key': publicKey } });
    const data = await response.json();
    return data;
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function pickHunt(transaction, signature) {
    const url = `${Base_URL}/api/hunts/pick`;
    const body = {
        transaction,
        signature
    };
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    const data = await response.json();
    return data;
}

function signTransaction(tx, secretKey) {
    const message = JSON.stringify(tx);
    const messageBytes = new TextEncoder().encode(message);
    const secretKeyBytes = decodeBase64(secretKey);
    const signature = nacl.sign.detached(messageBytes, secretKeyBytes);
    return encodeBase64(signature);
  }
  


try {
    const threadCount = 1;
    const secretDir = 'botcoinsecreat';
    const allFiles = fs.readdirSync(secretDir)
        .filter(f => f.startsWith('secretKey_') && f.endsWith('.txt'))
        .sort();
    const filesToUse = allFiles.slice(0, threadCount);

    const accounts = filesToUse.map(file => {
        const content = fs.readFileSync(path.join(secretDir, file), 'utf-8');
        const data = JSON.parse(content);
        return { ...data, _file: file };
    });


    for (let i = 0; i < accounts.length; i++) {
        const hunts = await getHunts(accounts[i].publicKey);
        const list = hunts.hunts;  

        console.log(list)
        const transaction = {
            type: "pick",
            huntId: list[list.length - 1].id,
            publicKey: accounts[i].publicKey,
            timestamp: Date.now()
        };
        const signature = signTransaction(transaction, accounts[i].secreat);
        const result = await pickHunt(transaction, signature);
        console.log(result)
        const poemText = result.poem;
        console.log(poemText)
        const answer = await poem(poemText, sendToAI);
        console.log(answer)

    }


    process.exit(0);
} catch (error) {
    console.error('注册失败:', error);
    rl.close();
    process.exit(1);
}


