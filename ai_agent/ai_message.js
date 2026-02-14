/**
 * AI 消息模块：根据问题调用本地 AI API 并返回回复
 * 使用 OpenAI 兼容接口（/v1/chat/completions）
 */

/** @type {string} API 基础地址 */
const BASE_URL = "https://chat.ainft.com/webapi";

/** @type {string} API 密钥 */
const API_KEY = "sk-1ani5mphu5hev7j5husyuhhwuzgvrswa";

/** @type {string} 使用的模型名称 */
const MODEL = "gpt-5-nano";

/**
 * 向 AI API 发送问题并获取回复
 * @param {string} question - 用户问题或消息内容
 * @param {Object} [options] - 可选参数
 * @param {number} [options.maxTokens=2048] - 最大生成 token 数
 * @param {number} [options.temperature=0.7] - 采样温度 (0-2)
 * @param {Array<{role: string, content: string}>} [options.messages] - 自定义对话历史，不传则仅用当前 question 作为 user 消息
 * @returns {Promise<string>} AI 回复的文本内容
 * @throws {Error} 当请求失败或 API 返回错误时
 */
async function sendToAI(question, options = {}) {
  const {
    maxTokens = 20480,
    temperature = 0.7,
    messages: customMessages,
  } = options;

  const messages = Array.isArray(customMessages) && customMessages.length > 0
    ? customMessages
    : [{ role: "user", content: question }];

  const body = {
    model: MODEL,
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  const url = `${BASE_URL.replace(/\/$/, "")}/chat/openai`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI API 请求失败: ${res.status} ${res.statusText}\n${text}`);
  }

 let fullText = "";

// 检查是否是流式返回
  if (res.headers.get('content-type')?.includes('text/event-stream')) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
  
      while (true) {
          const { done, value } = await reader.read();
          if (done) break;
  
          const chunk = decoder.decode(value, { stream: true });
  
          // 解析返回的这种特殊格式 (id, event, data)
          const lines = chunk.split('\n');
          for (const line of lines) {
              if (line.startsWith('data: ')) {
                  const dataValue = line.replace('data: ', '').trim();
                // 过滤掉非内容数据
                if (dataValue && dataValue !== '"stop"' && !dataValue.startsWith('{')) {
                    // 去掉引号 (如果是 "text" 格式)
                    const content = dataValue.replace(/^"|"$/g, '');
                    fullText += content;
                    // 如果你想在控制台实时看到打印，取消下一行的注释
                    //process.stdout.write(content); 
                    }
                }
            }
        }
    } else {
        // 如果不是流，走常规逻辑
        const data = await res.json();
        fullText = data.choices[0].message.content;
    }

  const content = fullText;
  if (content == null) {
    throw new Error("API 返回中缺少回复内容");
  }

  return typeof content === "string" ? content : String(content);
}

/**
 * 获取当前配置（不暴露密钥时可做只读或脱敏）
 * @returns {{ baseUrl: string, model: string }}
 */
function getConfig() {
  return {
    baseUrl: BASE_URL,
    model: MODEL,
  };
}

export { sendToAI, getConfig, BASE_URL, API_KEY, MODEL };
