import type { IncomingMessage, ServerResponse } from 'node:http';
import { StoreNotConfigured } from './store.js';

export type Req = IncomingMessage & { body?: unknown };
export type Res = ServerResponse;

// Public origin of this deployment, e.g. https://hiitcoach-mauve.vercel.app
export function baseUrl(req: Req): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] ?? 'https';
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host ?? 'localhost';
  return `${proto}://${host}`;
}

export function query(req: Req): URLSearchParams {
  return new URL(req.url ?? '/', 'http://x').searchParams;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'invalid_request',
  ) {
    super(message);
  }
}

// JSON or form body, whether or not the platform already parsed it
export async function readBody(req: Req): Promise<Record<string, unknown>> {
  let raw: unknown = req.body;
  if (raw === undefined) {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const c of req) {
      size += (c as Buffer).length;
      if (size > 2_000_000) throw new HttpError(413, 'Requisição grande demais.');
      chunks.push(c as Buffer);
    }
    raw = Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.isBuffer(raw)) raw = raw.toString('utf8');
  if (typeof raw === 'string') {
    if (!raw) return {};
    const type = req.headers['content-type'] ?? '';
    if (type.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(raw));
    try {
      raw = JSON.parse(raw);
    } catch {
      throw new HttpError(400, 'JSON inválido.');
    }
  }
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function send(res: Res, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export function cors(res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID',
  );
  res.setHeader('Access-Control-Expose-Headers', 'WWW-Authenticate, Mcp-Session-Id');
}

export function bearer(req: Req): string | null {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? '');
  return m ? m[1].trim() : null;
}

// Wraps a handler: CORS preflight, and errors turned into JSON responses
export function handler(fn: (req: Req, res: Res) => Promise<void>) {
  return async (req: Req, res: Res) => {
    cors(res);
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof HttpError) {
        return send(res, err.status, { error: err.code, error_description: err.message });
      }
      if (err instanceof StoreNotConfigured) {
        return send(res, 503, {
          error: 'not_configured',
          error_description: 'O servidor ainda não tem banco de dados. Conecte o Upstash Redis ao projeto na Vercel.',
        });
      }
      console.error(err);
      send(res, 500, { error: 'server_error', error_description: 'Erro interno.' });
    }
  };
}
