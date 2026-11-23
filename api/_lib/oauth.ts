// Token storage for the OAuth 2.1 server that protects the MCP endpoint.
import { createHash, timingSafeEqual } from 'node:crypto';
import { getStore } from './store.js';
import { randomToken, sha256 } from './auth.js';

export const SCOPE = 'treinos';
const ACCESS_TTL = 7 * 24 * 3600;
const REFRESH_TTL = 180 * 24 * 3600;
const CODE_TTL = 600;

export interface OAuthClient {
  client_id: string;
  client_name?: string;
  redirect_uris: string[];
  token_endpoint_auth_method: 'none' | 'client_secret_post' | 'client_secret_basic';
  secretHash?: string;
  created_at: string;
}

export interface AuthCode {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  resource?: string;
}

interface TokenRecord {
  userId: string;
  clientId: string;
  scope: string;
}

export async function getClient(id: string): Promise<OAuthClient | null> {
  if (!id || id.length > 100) return null;
  return getStore().get<OAuthClient>(`oauth:client:${id}`);
}

export async function saveClient(client: OAuthClient) {
  await getStore().set(`oauth:client:${client.client_id}`, client);
}

export function checkClientSecret(client: OAuthClient, secret: string | undefined): boolean {
  if (client.token_endpoint_auth_method === 'none') return true;
  if (!secret || !client.secretHash) return false;
  const a = Buffer.from(sha256(secret));
  const b = Buffer.from(client.secretHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createCode(data: AuthCode): Promise<string> {
  const code = randomToken();
  await getStore().set(`oauth:code:${sha256(code)}`, data, CODE_TTL);
  return code;
}

// Codes are single use: read and delete in one step
export async function takeCode(code: string): Promise<AuthCode | null> {
  return code ? getStore().getDel<AuthCode>(`oauth:code:${sha256(code)}`) : null;
}

// PKCE S256: base64url(sha256(verifier)) must equal the challenge sent to /authorize
export function pkceMatches(verifier: string, challenge: string): boolean {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  return createHash('sha256').update(verifier).digest('base64url') === challenge;
}

export async function issueTokens(rec: TokenRecord) {
  const access = randomToken();
  const refresh = randomToken();
  const store = getStore();
  await Promise.all([
    store.set(`oauth:access:${sha256(access)}`, rec, ACCESS_TTL),
    store.set(`oauth:refresh:${sha256(refresh)}`, rec, REFRESH_TTL),
  ]);
  return {
    access_token: access,
    token_type: 'Bearer',
    expires_in: ACCESS_TTL,
    refresh_token: refresh,
    scope: rec.scope,
  };
}

// Refresh tokens rotate: each one works once
export async function takeRefresh(token: string): Promise<TokenRecord | null> {
  return token ? getStore().getDel<TokenRecord>(`oauth:refresh:${sha256(token)}`) : null;
}

export async function userFromAccessToken(token: string | null): Promise<string | null> {
  if (!token) return null;
  const rec = await getStore().get<TokenRecord>(`oauth:access:${sha256(token)}`);
  return rec?.userId ?? null;
}
