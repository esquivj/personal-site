import { handleNote } from '../src/lib/note.mjs';

const runtime = globalThis as typeof globalThis & {
  process?: { env: Record<string, string | undefined> };
};
export const POST = (request: Request): Promise<Response> =>
  handleNote(request, runtime.process?.env || {});
export const GET = (): Response =>
  new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
