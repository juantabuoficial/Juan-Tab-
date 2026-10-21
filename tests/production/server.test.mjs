import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

test('el artefacto de producción arranca en PORT y sirve la app, rutas y recursos', { timeout: 15000 }, async () => {
  const port = 43821;
  const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, NODE_ENV: 'production', PORT: String(port) }, stdio: 'pipe' });
  let errorLog = '';
  child.stderr.on('data', b => { errorLog += b; });
  child.stdout.resume();
  const exited = once(child, 'exit');
  try {
    let response;
    for (let i = 0; i < 200; i++) {
      if (child.exitCode !== null) assert.fail(`El servidor terminó antes de arrancar: ${errorLog}`);
      try { response = await fetch(`http://127.0.0.1:${port}/`); break; } catch { await delay(25); }
    }
    assert.equal(response?.status, 200, errorLog);
    const html = await response.text();
    assert.match(html, /PLANIFICA|Planifica/);
    const asset = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
    assert.ok(asset, 'La página debe referenciar el JavaScript compilado');
    const js = await fetch(`http://127.0.0.1:${port}${asset}`);
    assert.equal(js.status, 200);
    assert.match(js.headers.get('content-type'), /javascript/);
    const route = await fetch(`http://127.0.0.1:${port}/planes`);
    assert.equal(route.status, 200);
    assert.equal(await route.text(), html);
  } finally {
    child.kill('SIGTERM');
    await exited;
  }
});

test('un PORT inválido detiene el arranque con error explícito', async () => {
  const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, NODE_ENV: 'production', PORT: 'no-es-un-puerto' }, stdio: 'pipe' });
  let stderr = '';
  child.stdout.resume();
  child.stderr.on('data', b => { stderr += b; });
  const [code] = await once(child, 'exit');
  assert.equal(code, 1);
  assert.match(stderr, /Puerto de servidor no válido/);
});
