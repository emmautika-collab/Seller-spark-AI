const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

export default async (request) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const body = await request.json();

    const {
      mode = "content",
      brief = "",
      tone = "professional",
      audience = "",
      action = "generate",
      draft = ""
    } = body;

    if (!brief.trim()) {
      return new Response(
        JSON.stringify({ error: "A business brief is required." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const instructions = {
      content: "Create a high-converting content asset.",
      social: "Create a platform-ready social media post.",
      script: "Create a short-form video script with a strong hook.",
      branding: "Create a compact brand direction with positioning and core message."
    };

    const instruction =
      instructions[mode] || instructions.content;

    const prompt = `
You are SellerSpark AI, a human-in-the-loop creative assistant.

${instruction}

Business brief:
${brief}

Target audience:
${audience || "General customers"}

Tone:
${tone}

${action === "regenerate" && draft
  ? `Previous draft:\n${draft}\nCreate a substantially different version.`
  : ""}

Produce a useful, original draft.
Avoid unsupported factual claims.
Return only the draft content.
`;

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          ok: true,
          provider: "demo-mode",
          model: null,
          text: `DEMO DRAFT\n\n${brief}\n\n${instruction}\n\nTone: ${tone}\nAudience: ${audience || "General customers"}`
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          input: prompt
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: data?.error?.message || "OpenAI request failed."
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const text =
      data?.output_text ||
      data?.output
        ?.flatMap(item => item.content || [])
        ?.filter(item => item.type === "output_text")
        ?.map(item => item.text)
        ?.join("\n")
        ?.trim();

    if (!text) {
      throw new Error("The AI returned an empty draft.");
    }

    return new Response(
      JSON.stringify({
        ok: true,
        provider: "OpenAI Responses API",
        model: MODEL,
        text
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || "Generation failed."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
