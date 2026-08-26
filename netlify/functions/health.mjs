export default async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      aiConnected: Boolean(process.env.OPENAI_API_KEY),
      model: "gpt-4.1-mini"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
};
