import nacl from 'tweetnacl';
import pkg from 'tweetnacl-util';
const { encodeBase64, decodeBase64 } = pkg;
import fs from 'fs';
import path from 'path';
import readline from 'readline';
const Base_URL = 'https://botcoin.farm';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function solveHunt(transaction, signature) {
    const url = `${Base_URL}/api/hunts/solve`;
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
    const fileIndex = 1;
    const secretDir = 'botcoinsecreat';
    const answer = "";
    const id = 1;
    const allFiles = fs.readdirSync(secretDir)
        .filter(f => f.startsWith('secretKey_') && f.endsWith('.txt'))
        .sort();
    
    if (fileIndex < 1 || fileIndex > allFiles.length) {
        throw new Error('fileIndex out of range');
    }
    
    const selectedFile = allFiles[fileIndex - 1];
    
    const content = fs.readFileSync(path.join(secretDir, selectedFile), 'utf-8');
    const data = JSON.parse(content);
    const accounts = [{ ...data, _file: selectedFile }];

    for (let i = 0; i < accounts.length; i++) {        

        const solveTransaction = {
            type: "solve",
            huntId: id,
            answer: answer,
            publicKey: accounts[i].publicKey,
            timestamp: Date.now()
        };
        const solveSignature = signTransaction(solveTransaction, accounts[i].secreat);
        const solveResult = await solveHunt(solveTransaction, solveSignature);
        console.log(solveResult);

    }


    process.exit(0);
} catch (error) {
    console.error('注册失败:', error);
    rl.close();
    process.exit(1);
}


