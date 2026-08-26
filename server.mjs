const base = action === 'regenerate' ? draft : '';
const prompt = `You are SellerSpark AI, a human-in-the-loop content assistant.

${modeInstructions[mode]}

Brief: ${brief}
Audience: ${audience}
Tone: ${tone}
Previous draft: ${base}`;

if (!process.env.OPENAI_API_KEY) {
  const text = demoOutput({ mode, brief, tone, audience, platform });
  return {
    text,
    provider: 'demo-mode',
    model: null,
    flags: factFlags(text),
    live: false
  };
}

const apiResponse = await fetchImpl(
  'https://api.openai.com/v1/responses',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      input: prompt
    })
  }
);
