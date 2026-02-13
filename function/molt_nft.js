const CHALLENGE_ANALYSIS_SYSTEM_PROMPT = `你是一个AI，需要分析这里存在的挑战题。
请完成以下任务：
1. 识别文本中的挑战题（数学题、逻辑题、验证码题等）；
2. 如有题目，给出尽可能简单、直接的答案（仅答案，不要多余解释）；
3. 若没有明确题目，简要说明文本内容并给出你认为用户可能需要的回答。
回答请简洁，优先给出可填写的答案。`;

export async function analyzeChallengeText(text, askAI) {
  const input = typeof text === "string" ? text.trim() : "";

  const messages = [
    { role: "system", content: CHALLENGE_ANALYSIS_SYSTEM_PROMPT },
    { role: "user", content: input },
  ];

  const answer = await askAI(input, { messages });
  return typeof answer === "string" ? answer.trim() : String(answer).trim();
}

export { CHALLENGE_ANALYSIS_SYSTEM_PROMPT };
