import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || 'gpt-5.6';

export const modeInstructions = {
  content: 'Create a high-converting product/content asset. Return useful copy, a clear CTA, and practical structure.',
  social: 'Create a platform-ready social media post. Include a hook, concise body, CTA, and 3-5 relevant hashtags.',
  script: 'Create a short-form video script with hook, scene/voiceover beats, on-screen text suggestions, and CTA.',
  branding: 'Create a compact brand direction: positioning, promise, voice, visual direction, tagline ideas, and audience fit.'
};

export function demoOutput({ mode, brief, tone, audience }) {
  const title = brief || 'your product';
  if (mode === 'social') return `HOOK\nStop scrolling — ${title} deserves a clearer story.\n\nBODY\nBuilt for ${audience || 'busy customers'}, this post focuses on a useful benefit without making unsupported promises.\n\nCTA\nDiscover what makes it useful and start a conversation today.\n\nHASHTAGS\n#SellerSpark #SmallBusiness #ContentMarketing`;
  if (mode === 'script') return `HOOK (0–3s)\n“What if ${title} could solve one frustrating part of your day?”\n\nBEAT 1 (3–10s)\nShow the customer problem and name it in one simple sentence.\n\nBEAT 2 (10–20s)\nShow the product and explain its strongest practical benefit in a ${tone || 'friendly'} voice.\n\nON-SCREEN TEXT\nProblem → Benefit → Next step\n\nCTA (20–25s)\n“Ready to make it simpler? Learn more today.”`;
  if (mode === 'branding') return `POSITIONING\n${title} is a practical, customer-first brand designed for ${audience || 'people who want a simpler solution'}.\n\nBRAND PROMISE\nMake the useful feel effortless.\n\nVOICE\nClear, warm, confident, helpful.\n\nVISUAL DIRECTION\nClean layouts, readable typography, human-centered imagery, and one memorable accent.\n\nTAGLINES\n• Make every message matter.\n• Turn ideas into action.\n• Simple content. Stronger brands.`;
  return `CONTENT CONCEPT\n${title}\n\nCORE MESSAGE\nA ${tone || 'clear and engaging'} message for ${audience || 'your target customer'}, focused on one useful benefit rather than hype.\n\nDRAFT\nMeet a simpler way to communicate value. Lead with the customer problem, show the benefit, then make the next step obvious. Keep claims specific and avoid unsupported promises.\n\nCTA\nLearn more, try it, or contact the business today.`;
}

export function factFlags(text = '') {
  const patterns = [
    ['Numeric claim', /\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?x\b/i, 'Check percentages, growth figures, or quantified performance claims.'],
    ['Superlative', /\b(best|#1|number one|world-class|guaranteed|perfect|ultimate)\b/i, 'Check whether this superlative is objectively supportable.'],
    ['Health/safety claim', /\b(cure|treats|prevents|safe for|clinically proven)\b/i, 'Verify health, safety, or clinical claims before publishing.'],
    ['Price/offer', /[$₦€£]\s?\d|\b(free|discount|sale|off)\b/i, 'Confirm current price, promotion, availability, and terms.']
  ];
  return patterns.filter(([, re]) => re.test(text)).map(([type,, note]) => ({ type, note }));
}

function extractOutputText(payload) {
  if (payload?.output_text) return payload.output_text.trim();
  return (payload?.output || []).flatMap(x => x.content || [])
    .filter(x => x.type === 'output_text').map(x => x.text).join('').trim();
}

export async function generate(body = {}, fetchImpl = fetch) {
  const { mode='content', brief='', tone='professional', audience='', platform='Instagram', action='generate', draft='' } = body;
  if (!modeInstructions[mode]) throw new Error('Unsupported assistant mode');
  if (!brief.trim()) throw new Error('A business brief is required');
  const base = action === 'regenerate' ? draft : '';
  const prompt = `You are SellerSpark AI, a human-in-the-loop content and creativity assistant for small businesses.\nMode: ${mode}.\nPlatform: ${platform}.\nTone: ${tone}.\nAudience: ${audience}.\nBrief: ${brief}.\n${base ? `Previous draft:\n${base}\nRegenerate with a meaningfully different angle while preserving useful facts.` : ''}\n${modeInstructions[mode]}\nImportant: do not invent statistics, prices, certifications, testimonials, or guarantees. If a factual claim is uncertain, phrase it cautiously so the app can flag it for human verification. Return only the finished draft. Keep it presentation-ready.`;

  if (!process.env.OPENAI_API_KEY) {
    const text = demoOutput({ mode, brief, tone, audience, platform });
    return { text, provider: 'demo-mode', model: null, flags: factFlags(text), live: false };
  }

  const apiResponse = await fetchImpl('https://api.openai.com/v1/responses', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},
    body:JSON.stringify({ model, input:prompt })
  });
  const payload = await apiResponse.json();
  if (!apiResponse.ok) throw new Error(payload?.error?.message || 'OpenAI request failed');
  const text = extractOutputText(payload);
  if (!text) throw new Error('The AI returned an empty draft');
  return { text, provider: 'OpenAI Responses API', model, responseId: payload.id, flags: factFlags(text), live: true };
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(body);
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/api/health') {
        return json(res, 200, { ok:true, aiConnected:Boolean(process.env.OPENAI_API_KEY), model });
      }
      if (req.method === 'POST' && req.url === '/api/generate') {
        let raw='';
        for await (const chunk of req) {
          raw += chunk;
          if (Buffer.byteLength(raw) > 100_000) return json(res, 413, { error:'Request too large' });
        }
        let data;
        try { data = JSON.parse(raw || '{}'); } catch { return json(res, 400, { error:'Invalid JSON' }); }
        const result = await generate(data);
        return json(res, 200, { ok:true, ...result, generatedAt:new Date().toISOString() });
      }
      if (req.method === 'GET') {
        let file = req.url === '/' ? 'index.html' : req.url.slice(1).split('?')[0];
        if (file.includes('..')) return json(res, 400, {error:'Invalid path'});
        const full = path.join(publicDir, file);
        if (!existsSync(full)) return json(res, 404, {error:'Not found'});
        const ext = path.extname(full);
        const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json'};
        res.writeHead(200, {'Content-Type':types[ext] || 'application/octet-stream'});
        res.end(await readFile(full)); return;
      }
      json(res, 405, {error:'Method not allowed'});
    } catch (e) { console.error(e); json(res, 500, {error:e.message || 'Server error'}); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().listen(port, () => console.log(`SellerSpark AI running at http://localhost:${port}`));
}
