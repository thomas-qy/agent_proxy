

import fs from "fs";
import path from "path";
import { getApiKey, solveAndVerify, submitVerification } from "../function/molt.js";
import { sendToAI } from "../ai_agent/ai_message.js";

function loadVerification(filePath) {
  const raw = fs.readFileSync(path.resolve(process.cwd(), filePath), "utf8");
  const data = JSON.parse(raw);
  if (data.verification_required && data.verification) {
    return data.verification;
  }
  if (data.code && data.challenge) {
    return data;
  }
  throw new Error("JSON 中需包含 verification 对象（含 code、challenge）或完整响应（verification_required + verification）");
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const answerArg = process.argv.find((a) => a.startsWith("--answer="));
  const directAnswer = answerArg ? answerArg.replace("--answer=", "").trim() : null;

  const file = args[0] || "verification.json";
  const absFile = path.resolve(process.cwd(), file);
  if (!fs.existsSync(absFile)) {
    console.error("用法: node script/verify_moltbook.js [response.json] [--answer=525.00]");
    console.error("请提供包含 verification 的 JSON 文件路径，或在该目录放置 verification.json");
    process.exit(1);
  }

  const verification = loadVerification(file);
  const apiKey = getApiKey();

  try {
    if (directAnswer !== null) {
      console.log("直接提交答案:", directAnswer);
      const result = await submitVerification(verification.code, directAnswer, apiKey);
      console.log("验证结果:", result);
    } else {
      console.log("验证题目:", verification.challenge?.slice(0, 80) + "...");
      const result = await solveAndVerify(verification, sendToAI, apiKey);
      console.log("验证结果:", result);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
