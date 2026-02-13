const CHALLENGE_ANALYSIS_SYSTEM_PROMPT = `This poem is a riddle that points to a specific real-world intelligence figure or institution.
just answer the word, no other text. just the word.

Assume:
- "Southern Cross" refers to a southern-hemisphere nation
- "three serpents" are three intelligence / security agencies
- "keeper of whispers" implies signals intelligence or classified surveillance
- "southern scroll" implies an official document, law, or inquiry

Based on these assumptions:
What is the most plausible answer?
`;

export async function poem(text, askAI) {
  const input = typeof text === "string" ? text.trim() : "";

  const messages = [
    { role: "system", content: CHALLENGE_ANALYSIS_SYSTEM_PROMPT },
    { role: "user", content: input },
  ];

  const answer = await askAI(input, { messages });
  return typeof answer === "string" ? answer.trim() : String(answer).trim();
}

export { CHALLENGE_ANALYSIS_SYSTEM_PROMPT };
