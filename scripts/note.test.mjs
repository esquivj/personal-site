import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNote,
  verifyTurnstile,
  buildResendPayload,
  sendViaResend,
  handleNote,
} from '../src/lib/note.mjs';

const valid = { email: ' visitor@example.com ', message: ' Hello Juan ' };
const env = { RESEND_API_KEY: 'fake-test-key' };
const request = (input = valid, json = true) =>
  new Request('https://example.com/api/note', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: json ? 'application/json' : 'text/html',
    },
    body: JSON.stringify(input),
  });
const neverFetch = async () => {
  assert.fail('External fetch must not run');
};

test('valid notes are trimmed', () =>
  assert.deepEqual(parseNote(valid), {
    ok: true,
    value: { email: 'visitor@example.com', message: 'Hello Juan' },
  }));
for (const email of [
  '',
  undefined,
  'bad',
  'x@host',
  'a'.repeat(250) + '@example.com',
  'a@example.com\r\nBcc: other@example.com',
  'a@example.com\n',
]) {
  test(`reject invalid email ${JSON.stringify(email)}`, () =>
    assert.ok(parseNote({ ...valid, email }).errors.email));
}
for (const message of ['', '  ', 'a', 'a'.repeat(2001)]) {
  test(`reject message length ${message.length}`, () =>
    assert.ok(parseNote({ ...valid, message }).errors.message));
}
test('honeypot marks spam', () =>
  assert.equal(parseNote({ ...valid, company: 'robot' }).spam, true));
test('Turnstile skips when secret is unset', async () =>
  assert.equal(await verifyTurnstile('', undefined, '', neverFetch), true));
test('Turnstile rejects failure and sends verification fields', async () => {
  assert.equal(
    await verifyTurnstile('token', 'secret', '127.0.0.1', async (url, options) => {
      assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
      assert.equal(options.body.get('secret'), 'secret');
      assert.equal(options.body.get('response'), 'token');
      assert.equal(options.body.get('remoteip'), '127.0.0.1');
      return Response.json({ success: false });
    }),
    false
  );
  assert.equal(await verifyTurnstile('', 'secret', '', neverFetch), false);
  assert.equal(
    await verifyTurnstile('token', 'secret', '', async () => {
      throw new Error('network');
    }),
    false
  );
});
test('Resend payload uses defaults and reply_to', () => {
  const payload = buildResendPayload({ email: 'visitor@example.com', message: 'Hi Juan' }, {});
  assert.equal(payload.from, 'Site notes <onboarding@resend.dev>');
  assert.deepEqual(payload.to, ['juanesquivel138@gmail.com']);
  assert.equal(payload.reply_to, 'visitor@example.com');
  assert.equal(payload.subject, 'New note from juanesquivel.xyz');
  assert.equal(payload.text, 'From: visitor@example.com\n\nHi Juan');
  assert.equal(
    buildResendPayload(valid, {
      NOTE_FROM_EMAIL: 'custom@example.com',
      NOTE_TO_EMAIL: 'target@example.com',
    }).from,
    'custom@example.com'
  );
});
test('JSON success sends through Resend with authorization', async () => {
  let calls = 0;
  const response = await handleNote(request(), env, async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.headers.Authorization, 'Bearer fake-test-key');
    assert.equal(JSON.parse(options.body).reply_to, 'visitor@example.com');
    return Response.json({ id: 'mock' });
  });
  assert.equal(calls, 1);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});
test('native form redirects to sent', async () => {
  const req = new Request('https://example.com/api/note', {
    method: 'POST',
    body: new URLSearchParams(valid),
  });
  const response = await handleNote(req, env, async () => Response.json({}));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('Location'), '/contact?sent=1#note-sent');
});
test('multipart form accepts Turnstile token', async () => {
  const form = new FormData();
  form.set('email', valid.email);
  form.set('message', valid.message);
  form.set('cf-turnstile-response', 'token');
  let calls = 0;
  const response = await handleNote(
    new Request('https://example.com/api/note', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: form,
    }),
    { ...env, TURNSTILE_SECRET_KEY: 'secret' },
    async (url) => {
      calls++;
      return Response.json(url.includes('siteverify') ? { success: true } : {});
    }
  );
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});
test('validation returns 400 or field redirect', async () => {
  const response = await handleNote(request({ message: 'hello' }), env, neverFetch);
  assert.equal(response.status, 400);
  assert.ok((await response.json()).errors.email);
  assert.equal(
    (await handleNote(request({ message: 'hello' }, false), env, neverFetch)).headers.get(
      'Location'
    ),
    '/contact?error=email#note-error'
  );
});
test('missing API key returns 500', async () => {
  const response = await handleNote(request(), {}, neverFetch);
  assert.equal(response.status, 500);
  assert.equal((await response.json()).errors.form, 'Notes are not configured.');
});
test('Resend failure returns 502', async () =>
  assert.equal(
    (await handleNote(request(), env, async () => new Response('', { status: 429 }))).status,
    502
  ));
test('network failure returns 502', async () =>
  assert.deepEqual(
    await sendViaResend(buildResendPayload(valid, {}), 'fake', async () => {
      throw new Error('network');
    }),
    { ok: false, status: 0 }
  ));
test('honeypot pretends success without external fetch', async () => {
  assert.deepEqual(
    await (await handleNote(request({ ...valid, company: 'spam' }), {}, neverFetch)).json(),
    { ok: true }
  );
  assert.equal(
    (await handleNote(request({ company: 'spam' }, false), {}, neverFetch)).headers.get('Location'),
    '/contact?sent=1#note-sent'
  );
});
test('oversized streamed body is rejected', async () =>
  assert.equal(
    (await handleNote(request({ message: 'a'.repeat(11000) }), env, neverFetch)).status,
    413
  ));
test('malformed JSON, unsupported type, and wrong method are rejected', async () => {
  assert.equal(
    (
      await handleNote(
        new Request('https://example.com/api/note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: '{',
        }),
        env,
        neverFetch
      )
    ).status,
    400
  );
  assert.equal(
    (
      await handleNote(
        new Request('https://example.com/api/note', {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: 'text',
        }),
        env,
        neverFetch
      )
    ).status,
    415
  );
  assert.equal(
    (await handleNote(new Request('https://example.com/api/note'), env, neverFetch)).status,
    405
  );
});
