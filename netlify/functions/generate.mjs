
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6";

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

const instructions = {
  content:
    "Create a high-converting marketing content asset for the business.",
  social:
    "Create a platform-ready social media post with an engaging hook and clear call to action.",
  script:
    "Create a short-form video script with a strong hook, clear scenes, and a call to action.",
  branding:
    "Create a compact brand direction covering positioning, voice, promise, and useful tagline ideas."
};

function localDemo({ mode, brief, tone, audience, platform, goal }) {
  const instruction = instructions[mode] || instructions.content;

  return `DEMO DRAFT

${brief}

${instruction}

Target audience: ${audience || "General customers"}
Tone: ${tone || "Professional"}
Platform: ${platform || "Social media"}
Goal: ${goal || "Awareness"}

This is a rehearsal draft. Review and edit it before publishing.`;
}

function extractOutputText(payload) {
  if (payload?.output_text) {
    return payload.output_text.trim();
  }

  return (payload?.output || [])
    .flatMap((item) => item?.content || [])
    .filter((item) => item?.type === "output_text")
    .map((item) => item?.text || "")
    .join("\n")
    .trim();
}

export default async (request) => {
  if (request.method !== "POST") {
    return response({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();

    const {
      mode = "content",
      brief = "",
      tone = "professional",
      audience = "",
      platform = "",
      goal = "",
      action = "generate",
      draft = ""
    } = body;

    if (!instructions[mode]) {
      return response({ error: "Unsupported assistant mode." }, 400);
    }

    if (!brief.trim()) {
      return response(
        { error: "A business brief is required." },
        400
      );
    }

    const instruction = instructions[mode];

    const regenerationInstruction =
      action === "regenerate" && draft.trim()
        ? `

Previous draft:
${draft}

Create a substantially different version. Do not simply repeat the previous wording.`
        : "";

    const prompt = `You are SellerSpark AI, a human-in-the-loop creative assistant.

${instruction}

Business brief:
${brief}

Target audience:
${audience || "General customers"}

Tone:
${tone || "Professional"}

Platform:
${platform || "Social media"}

Goal:
${goal || "Awareness"}
${regenerationInstruction}

Create an original, useful draft.

Do not invent specific facts, prices, statistics, guarantees, medical claims, or unsupported superlatives.

Return only the draft content.`;

    // Demo mode allows the app to work even when no API key is configured.
    if (!process.env.OPENAI_API_KEY) {
      const text = localDemo({
        mode,
        brief,
        tone,
        audience,
        platform,
        goal
      });

      return response({
        ok: true,
        provider: "demo-mode",
        model: null,
        text,
        generatedAt: new Date().toISOString()
      });
    }

    const apiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          input: prompt
        })
      }
    );

    const payload = await apiResponse.json();

    if (!apiResponse.ok) {
      return response(
        {
          error:
            payload?.error?.message ||
            "OpenAI request failed."
        },
        apiResponse.status
      );
    }

    const text = extractOutputText(payload);

    if (!text) {
      return response(
        { error: "The AI returned an empty draft." },
        502
      );
    }

    return response({
      ok: true,
      provider: "OpenAI Responses API",
      model: MODEL,
      text,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("SellerSpark generation error:", error);

    return response(
      {
        error:
          error?.message ||
          "Generation failed."
      },
      500
    );
  }
};
