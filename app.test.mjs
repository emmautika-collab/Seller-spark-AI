
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { factFlags, demoOutput } from './server.mjs';

const proc = spawn(process.execPath, ['server.mjs'], {
  cwd: new URL('./', import.meta.url),
  env: { ...process.env, PORT: '3199' },
  stdio: 'ignore'
});

proc.unref();

await new Promise((resolve) => setTimeout(resolve, 450));

test('fact flags identify risky claims', () => {
  const flags = factFlags(
    'Our best product gives you 50% more results and is clinically proven.'
  );

  assert.ok(flags.some((x) => x.type === 'Numeric claim'));
  assert.ok(flags.some((x) => x.type === 'Superlative'));
  assert.ok(flags.some((x) => x.type === 'Health/safety claim'));
});

test('demo output covers every assistant mode', () => {
  for (const mode of ['content', 'social', 'script', 'branding']) {
    const text = demoOutput({
      mode,
      brief: 'weekend celebration cakes',
      audience: 'families',
      tone: 'warm'
    });

    assert.ok(text.length > 80);
  }
});

test('health endpoint works', async () => {
  const r = await fetch('http://localhost:3199/api/health');
  const d = await r.json();

  assert.equal(r.status, 200);
  assert.equal(d.ok, true);
  assert.equal(typeof d.aiConnected, 'boolean');
});

test('generate endpoint returns a draft in demo mode', async () => {
  const r = await fetch('http://localhost:3199/api/generate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      mode: 'content',
      brief: 'A bakery launching weekend celebration cakes',
      audience: 'families',
      tone: 'warm'
    })
  });

  const d = await r.json();

  assert.equal(r.status, 200);
  assert.equal(d.ok, true);
  assert.ok(d.text.length > 50);
  assert.ok(Array.isArray(d.flags));
  assert.equal(d.live, false);
});

test('generate rejects empty briefs', async () => {
  const r = await fetch('http://localhost:3199/api/generate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      mode: 'content',
      brief: '',
      audience: 'families',
      tone: 'warm'
    })
  });

  assert.equal(r.status, 400);
});

after(() => {
  proc.kill();
}
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { factFlags, demoOutput } from './server.mjs';
