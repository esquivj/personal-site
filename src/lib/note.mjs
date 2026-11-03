/** @typedef {{email?: string, message?: string, form?: string}} Errors */
/** @typedef {{email: string, message: string}} Note */
/** @typedef {Record<string, string | undefined>} Env */
/** @param {{email?: unknown, message?: unknown, company?: unknown, token?: unknown}} input
 * @returns {{ok: true, value: Note} | {ok: false, errors: Errors, spam?: boolean}} */
export function parseNote(input) {
  const clean = (value) => (typeof value === 'string' ? value.trim() : '');
  if (clean(input.company)) return { ok: false, errors: {}, spam: true };
  const email = clean(input.email);
  const message = clean(input.message);
  /** @type {Errors} */
  const errors = {};
  if (
    !email ||
    email.length > 254 ||
    /[\r\n]/.test(String(input.email ?? '')) ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
  )
    errors.email = 'Enter a valid email address.';
  if (message.length < 2) errors.message = 'Write a note of at least 2 characters.';
  else if (message.length > 2000) errors.message = 'Keep your note to 2,000 characters.';
  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, value: { email, message } };
}
/** Verification is skipped when no secret is set, so local development works.
 * @param {string} token @param {string | undefined} secret @param {string} ip @param {typeof fetch} fetchImpl */
export async function verifyTurnstile(token, secret, ip, fetchImpl = fetch) {
  if (!secret) return true;
  if (!token) return false;
  try {
    const response = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    return response.ok && (await response.json()).success === true;
  } catch {
    return false;
  }
}
/** @param {Note} note @param {Env} env */
export function buildResendPayload({ email, message }, env) {
  return {
    from: env.NOTE_FROM_EMAIL || 'Site notes <onboarding@resend.dev>',
    to: [env.NOTE_TO_EMAIL || 'juanesquivel138@gmail.com'],
    reply_to: email,
    subject: 'New note from juanesquivel.xyz',
    text: `From: ${email}\n\n${message}`,
  };
}
/** @param {ReturnType<typeof buildResendPayload>} payload @param {string} apiKey @param {typeof fetch} fetchImpl */
export async function sendViaResend(payload, apiKey, fetchImpl = fetch) {
  try {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
/** @param {Request} request @param {Env} env @param {typeof fetch} fetchImpl */
export async function handleNote(request, env, fetchImpl = fetch) {
  const json = (request.headers.get('accept') || '').includes('application/json');
  /** @param {number} status @param {Errors | undefined} errors */
  const respond = (status, errors = undefined) => {
    if (json)
      return Response.json(errors ? { ok: false, errors } : { ok: true }, {
        status,
        headers: { 'Cache-Control': 'no-store' },
      });
    const code = errors ? (errors.email ? 'email' : errors.message ? 'message' : '1') : '';
    return new Response(null, {
      status: 303,
      headers: {
        Location: `/contact?${errors ? `error=${code}#note-error` : 'sent=1#note-sent'}`,
        'Cache-Control': 'no-store',
      },
    });
  };
  if (request.method !== 'POST')
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (
    !['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data'].includes(type)
  )
    return respond(415, { form: 'Unsupported form format.' });
  let input;
  try {
    if (Number(request.headers.get('content-length')) > 10240)
      return respond(413, { form: 'Your note is too large.' });
    const reader = request.body?.getReader();
    const chunks = [];
    let size = 0;
    if (reader)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 10240) {
          await reader.cancel();
          return respond(413, { form: 'Your note is too large.' });
        }
        chunks.push(value);
      }
    const body = new Blob(chunks);
    const parsed = new Response(body, {
      headers: { 'Content-Type': request.headers.get('content-type') || type },
    });
    if (type === 'application/json') input = await parsed.json();
    else {
      const form = await parsed.formData();
      input = Object.fromEntries(form);
      input.token = form.get('cf-turnstile-response');
    }
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new Error('Invalid body');
  } catch {
    return respond(400, { form: 'Could not read your note.' });
  }
  const result = parseNote(input);
  if (!result.ok) return result.spam ? respond(200) : respond(400, result.errors);
  if (
    !(await verifyTurnstile(
      typeof input.token === 'string' ? input.token : '',
      env.TURNSTILE_SECRET_KEY,
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '',
      fetchImpl
    ))
  )
    return respond(400, { form: 'Please complete the verification and try again.' });
  if (!env.RESEND_API_KEY) {
    console.error('Notes are not configured: missing RESEND_API_KEY.');
    return respond(500, { form: 'Notes are not configured.' });
  }
  const sent = await sendViaResend(
    buildResendPayload(result.value, env),
    env.RESEND_API_KEY,
    fetchImpl
  );
  if (!sent.ok) {
    console.error('Note delivery failed:', sent.status);
    return respond(502, { form: 'Could not send your note.' });
  }
  return respond(200);
}
