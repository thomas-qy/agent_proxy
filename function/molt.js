import fs from "fs";
import path from "path";

/** @type {string} API 基础地址（必须带 www） */
const BASE = "https://www.moltbook.com/api/v1";

/** 凭证文件路径：项目根目录（运行 node 时的 cwd）下的 credentials.json */
const CREDENTIALS_FILE = path.join(process.cwd(), "credentials.json");

/**
 * 调用注册接口，创建新 Agent
 * @param {string} name - Agent 名称
 * @param {string} description - Agent 描述
 * @returns {Promise<{ agent: { api_key: string, claim_url: string, verification_code: string }, important?: string }>}
 */
export async function register(name, description) {
  const res = await fetch(`${BASE}/agents/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error || data.message || res.statusText;
    throw new Error(`注册失败 (${res.status}): ${msg}`);
  }

  return data;
}

/**
 * 注册并立即将 API Key 写入凭证文件（推荐：注册后调用此函数一次即可用 getApiKey()）
 * @param {string} name - Agent 名称
 * @param {string} description - Agent 描述
 * @returns {Promise<{ agent: Object, credentialsPath: string }>}
 */
export async function registerAndSave(name, description) {
  const data = await register(name, description);
  const apiKey = data?.agent?.api_key;
  const agentName = data?.agent?.name ?? name;
  if (!apiKey) throw new Error("注册返回中缺少 agent.api_key");
  const credentialsPath = saveCredentials(apiKey, agentName);
  return { ...data, credentialsPath };
}

/**
 * 将凭证写入项目根目录下的 credentials.json
 * @param {string} apiKey - API 密钥
 * @param {string} agentName - Agent 名称
 * @returns {string} 写入的文件路径
 */
export function saveCredentials(apiKey, agentName) {
  const dir = path.dirname(CREDENTIALS_FILE);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      CREDENTIALS_FILE,
      JSON.stringify({ api_key: apiKey, agent_name: agentName }, null, 2),
      "utf8"
    );
    return CREDENTIALS_FILE;
  } catch (e) {
    throw new Error(`写入凭证失败: ${e.message}`);
  }
}

/**
 * 获取 API Key（优先环境变量，否则读凭证文件）
 * @returns {string}
 */
export function getApiKey() {
  if (process.env.MOLTBOOK_API_KEY) return process.env.MOLTBOOK_API_KEY;
  try {
    const data = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf8"));
    if (data.api_key) return data.api_key;
  } catch (_) {}
  throw new Error(
    "未找到 API Key，请设置 MOLTBOOK_API_KEY 或先调用 molt.register() 并 saveCredentials()"
  );
}

/**
 * 发布一篇帖子
 * @param {string} apiKey - API 密钥
 * @param {Object} options - 发帖参数
 * @param {string} [options.submolt='general'] - 版块名
 * @param {string} options.title - 标题
 * @param {string} [options.content] - 正文（与 url 二选一）
 * @param {string} [options.url] - 链接（链接帖时使用）
 * @returns {Promise<Object>} API 返回
 */
export async function createPost(apiKey, options) {
  const { submolt = "general", title, content, url } = options;
  const body = url ? { submolt, title, url } : { submolt, title, content };

  const res = await fetch(`${BASE}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error || data.message || data.hint || res.statusText;
    throw new Error(`发帖失败 (${res.status}): ${msg}`);
  }

  return data;
}

/**
 * 提交验证答案到 Moltbook（验证接口）
 * @param {string} verificationCode - 验证码（verification.code）
 * @param {string} answer - 答案，建议为保留两位小数的数字字符串，如 "525.00"
 * @param {string} [apiKey] - API 密钥（从 credentials 或环境变量获取），验证接口需要
 * @returns {Promise<Object>} API 返回
 */
export async function submitVerification(verificationCode, answer, apiKey) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(`${BASE}/verify`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      verification_code: verificationCode,
      answer: String(answer).trim(),
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error || data.message || data.hint || res.statusText;
    throw new Error(`验证提交失败 (${res.status}): ${msg}`);
  }

  return data;
}


/** 验证解题时使用的系统 prompt，强制 AI 只回复一个两位小数数字 */
const VERIFY_SYSTEM_PROMPT =
  "You are a verification solver. The challenge may be in obfuscated or word form (e.g. 'twenty three + seven' means 23+7=30). Decode the meaning, do the math, then respond with ONLY one number with exactly 2 decimal places (e.g. 30.00 or 525.00). No explanation, no other text, no code—just the number.";

function parseAnswerToTwoDecimals(text) {
  const s = String(text).trim();
  const match = s.match(/-?[\d]+\.?[\d]*/);
  if (!match) throw new Error(`无法从 AI 回复中解析数字: ${s.slice(0, 80)}`);
  const num = parseFloat(match[0]);
  if (Number.isNaN(num)) throw new Error(`解析结果非数字: ${match[0]}`);
  return num.toFixed(2);
}

/**
 * 使用 system prompt 调用 askAI，确保只返回两位小数数字
 * @param {string} prompt - 用户侧题目内容
 * @param {(q: string, opts?: { messages?: Array<{role: string, content: string}> }) => Promise<string>} askAI
 * @returns {Promise<string>}
 */
async function askAIForVerify(prompt, askAI) {
  const messages = [
    { role: "system", content: VERIFY_SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];
  return askAI(prompt, { messages });
}

export async function solveAndVerify(verification, askAI, apiKey) {
  const { code, challenge, instructions = "" } = verification;
  if (!code || !challenge) {
    throw new Error("verification 缺少 code 或 challenge");
  }

  const prompt = [
    instructions,
    "",
    "Challenge (solve and respond with ONLY the number with 2 decimal places, e.g. 525.00):",
    challenge,
  ]
    .filter(Boolean)
    .join("\n");

  const aiAnswer = await askAIForVerify(prompt, askAI);
  const answer = parseAnswerToTwoDecimals(aiAnswer);

  return submitVerification(code, answer, apiKey);
}

export async function handleVerificationResponse(response, askAI) {
  if (!response?.verification_required || !response?.verification) return null;
  const apiKey = getApiKey();
  return solveAndVerify(response.verification, askAI, apiKey);
}
