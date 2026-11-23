// OAuth 2.1 authorization server for the MCP connector (authorization code + PKCE,
// dynamic client registration). vercel.json maps the public paths onto ?op=:
//   /.well-known/oauth-authorization-server   → metadata
//   /.well-known/oauth-protected-resource...  → resource
//   /oauth/register | /oauth/authorize | /oauth/token
import { baseUrl, handler, HttpError, query, readBody, send } from './_lib/http.js';
import type { Req, Res } from './_lib/http.js';
import { checkLogin, createUser, randomToken, sha256 } from './_lib/auth.js';
import {
  SCOPE,
  checkClientSecret,
  createCode,
  getClient,
  issueTokens,
  pkceMatches,
  saveClient,
  takeCode,
  takeRefresh,
} from './_lib/oauth.js';
import type { OAuthClient } from './_lib/oauth.js';
import { renderAuthorizePage, renderErrorPage } from './_lib/pages.js';

export default handler(async (req, res) => {
  const op = query(req).get('op');
  const base = baseUrl(req);
  switch (op) {
    case 'metadata':
      return send(res, 200, {
        issuer: base,
        authorization_endpoint: `${base}/oauth/authorize`,
        token_endpoint: `${base}/oauth/token`,
        registration_endpoint: `${base}/oauth/register`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
        scopes_supported: [SCOPE],
      });
    case 'resource':
      return send(res, 200, {
        resource: `${base}/api/mcp`,
        authorization_servers: [base],
        scopes_supported: [SCOPE],
        bearer_methods_supported: ['header'],
        resource_name: 'HIITapp',
      });
    case 'register':
      return register(req, res);
    case 'authorize':
      return authorize(req, res, base);
    case 'token':
      return token(req, res);
    default:
      throw new HttpError(404, 'Não encontrado.', 'not_found');
  }
});

function validRedirect(uri: unknown): uri is string {
  if (typeof uri !== 'string' || uri.length > 500) return false;
  try {
    const u = new URL(uri);
    if (u.hash) return false;
    // https everywhere; http only for local development tools
    return u.protocol === 'https:' || (u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname));
  } catch {
    return false;
  }
}

// RFC 7591 dynamic client registration (Claude registers itself here)
async function register(req: Req, res: Res) {
  if (req.method !== 'POST') throw new HttpError(405, 'Método não permitido.');
  const body = await readBody(req);
  const uris = body.redirect_uris;
  if (!Array.isArray(uris) || uris.length === 0 || uris.length > 10 || !uris.every(validRedirect)) {
    return send(res, 400, { error: 'invalid_redirect_uri', error_description: 'redirect_uris inválidas.' });
  }
  const method = (body.token_endpoint_auth_method as string) ?? 'none';
  if (!['none', 'client_secret_post', 'client_secret_basic'].includes(method)) {
    return send(res, 400, { error: 'invalid_client_metadata', error_description: 'Método de autenticação não suportado.' });
  }
  const client: OAuthClient = {
    client_id: randomToken(16),
    client_name: typeof body.client_name === 'string' ? body.client_name.slice(0, 100) : undefined,
    redirect_uris: uris as string[],
    token_endpoint_auth_method: method as OAuthClient['token_endpoint_auth_method'],
    created_at: new Date().toISOString(),
  };
  let secret: string | undefined;
  if (method !== 'none') {
    secret = randomToken();
    client.secretHash = sha256(secret);
  }
  await saveClient(client);
  send(res, 201, {
    client_id: client.client_id,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: client.client_name,
    redirect_uris: client.redirect_uris,
    token_endpoint_auth_method: method,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    ...(secret ? { client_secret: secret, client_secret_expires_at: 0 } : {}),
  });
}

const AUTH_PARAMS = ['client_id', 'redirect_uri', 'state', 'code_challenge', 'code_challenge_method', 'scope', 'resource'];

function html(res: Res, status: number, body: string) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  // The login page must never be framed by another site
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'; form-action 'self' https: http://localhost:* http://127.0.0.1:*");
  res.end(body);
}

function redirectWith(res: Res, uri: string, params: Record<string, string | undefined>) {
  const u = new URL(uri);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) u.searchParams.set(k, v);
  res.statusCode = 302;
  res.setHeader('Location', u.toString());
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}

// Shows the login page (GET) and, after a valid login (POST), redirects back to the client with a code
async function authorize(req: Req, res: Res, base: string) {
  const source = req.method === 'POST' ? await readBody(req) : Object.fromEntries(query(req));
  const p = Object.fromEntries(AUTH_PARAMS.map((k) => [k, typeof source[k] === 'string' ? (source[k] as string) : undefined]));

  // Until the client and redirect URI are known to be valid, errors are shown here, never redirected
  const client = await getClient(p.client_id ?? '');
  if (!client) return html(res, 400, renderErrorPage('Aplicativo desconhecido. Tente conectar de novo pelo Claude.'));
  if (!p.redirect_uri || !client.redirect_uris.includes(p.redirect_uri)) {
    return html(res, 400, renderErrorPage('Endereço de retorno inválido para este aplicativo.'));
  }
  if (source.response_type !== undefined && source.response_type !== 'code' && req.method === 'GET') {
    return redirectWith(res, p.redirect_uri, { error: 'unsupported_response_type', state: p.state });
  }
  if (!p.code_challenge || p.code_challenge_method !== 'S256') {
    return redirectWith(res, p.redirect_uri, {
      error: 'invalid_request',
      error_description: 'PKCE S256 é obrigatório',
      state: p.state,
    });
  }

  if (req.method === 'GET') {
    return html(res, 200, renderAuthorizePage({ params: p, clientName: client.client_name, action: `${base}/oauth/authorize` }));
  }
  if (req.method !== 'POST') throw new HttpError(405, 'Método não permitido.');

  if (source.decision === 'deny') return redirectWith(res, p.redirect_uri, { error: 'access_denied', state: p.state });
  try {
    const user =
      source.mode === 'signup'
        ? await createUser(source.email, source.password)
        : await checkLogin(source.email, source.password);
    const code = await createCode({
      clientId: client.client_id,
      userId: user.id,
      redirectUri: p.redirect_uri,
      codeChallenge: p.code_challenge,
      scope: SCOPE,
      resource: p.resource,
    });
    redirectWith(res, p.redirect_uri, { code, state: p.state });
  } catch (err) {
    if (!(err instanceof HttpError)) throw err;
    html(
      res,
      err.status,
      renderAuthorizePage({
        params: p,
        clientName: client.client_name,
        action: `${base}/oauth/authorize`,
        error: err.message,
        email: typeof source.email === 'string' ? source.email : '',
        mode: source.mode === 'signup' ? 'signup' : 'login',
      }),
    );
  }
}

function tokenError(res: Res, status: number, error: string, description: string) {
  send(res, status, { error, error_description: description });
}

// Client credentials from the form body or an HTTP Basic header
function clientCredentials(req: Req, body: Record<string, unknown>) {
  const m = /^Basic\s+(.+)$/i.exec(req.headers.authorization ?? '');
  if (m) {
    const [id, secret] = Buffer.from(m[1], 'base64').toString('utf8').split(':');
    return { id: decodeURIComponent(id ?? ''), secret: decodeURIComponent(secret ?? '') };
  }
  return {
    id: typeof body.client_id === 'string' ? body.client_id : '',
    secret: typeof body.client_secret === 'string' ? body.client_secret : undefined,
  };
}

async function token(req: Req, res: Res) {
  if (req.method !== 'POST') throw new HttpError(405, 'Método não permitido.');
  const body = await readBody(req);
  const creds = clientCredentials(req, body);
  const client = await getClient(creds.id);
  if (!client || !checkClientSecret(client, creds.secret)) {
    return tokenError(res, 401, 'invalid_client', 'Cliente inválido.');
  }

  if (body.grant_type === 'authorization_code') {
    const code = await takeCode(typeof body.code === 'string' ? body.code : '');
    if (!code || code.clientId !== client.client_id) return tokenError(res, 400, 'invalid_grant', 'Código inválido ou expirado.');
    if (body.redirect_uri !== undefined && body.redirect_uri !== code.redirectUri) {
      return tokenError(res, 400, 'invalid_grant', 'redirect_uri não confere.');
    }
    if (typeof body.code_verifier !== 'string' || !pkceMatches(body.code_verifier, code.codeChallenge)) {
      return tokenError(res, 400, 'invalid_grant', 'code_verifier inválido.');
    }
    return send(res, 200, await issueTokens({ userId: code.userId, clientId: client.client_id, scope: code.scope }));
  }

  if (body.grant_type === 'refresh_token') {
    const rec = await takeRefresh(typeof body.refresh_token === 'string' ? body.refresh_token : '');
    if (!rec || rec.clientId !== client.client_id) return tokenError(res, 400, 'invalid_grant', 'Refresh token inválido.');
    return send(res, 200, await issueTokens(rec));
  }

  tokenError(res, 400, 'unsupported_grant_type', 'grant_type não suportado.');
}
