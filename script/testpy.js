/**
 * 测试 AI 消息模块：调用 sendToAI 与 getConfig
 * 运行: node script/testpy.js
 */

const path = require("path");
const { sendToAI, getConfig } = require(path.join(__dirname, "..", "ai_agent", "ai_message.js"));

async function main() {
  console.log("=== 配置 ===");
  const config = getConfig();
  console.log("baseUrl:", config.baseUrl);
  console.log("model:", config.model);

  console.log("\n=== 发送测试问题 ===");
  const question = "用一句话介绍你自己。";
  console.log("问题:", question);

  try {
    const reply = await sendToAI(question);
    console.log("回复:", reply);
  } catch (err) {
    console.error("请求失败:", err.message);
    process.exit(1);
  }

  console.log("\n测试完成。");
}

main();
