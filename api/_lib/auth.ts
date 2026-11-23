import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { getStore } from './store.js';
import { HttpError } from './http.js';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

const APP_TOKEN_TTL = 180 * 24 * 3600;

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

// Tokens are stored only as hashes, so a database leak does not leak live tokens
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('base64url');
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return ['scrypt', salt.toString('base64url'), hash.toString('base64url')].join(':');
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [, salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = await scrypt(password, Buffer.from(salt, 'base64url'), expected.length);
  return timingSafeEqual(actual, expected);
}

export function normalizeEmail(v: unknown): string {
  const email = typeof v === 'string' ? v.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    throw new HttpError(400, 'E-mail inválido.');
  }
  return email;
}

function checkPassword(v: unknown): string {
  if (typeof v !== 'string' || v.length < 8) throw new HttpError(400, 'A senha precisa ter pelo menos 8 caracteres.');
  if (v.length > 200) throw new HttpError(400, 'Senha longa demais.');
  return v;
}

// At most `max` attempts per key in the window
export async function rateLimit(key: string, max: number, windowSeconds: number) {
  const n = await getStore().incr(`ratelimit:${key}`, windowSeconds);
  if (n > max) throw new HttpError(429, 'Muitas tentativas. Espere alguns minutos e tente de novo.', 'rate_limited');
}

export async function createUser(emailRaw: unknown, passwordRaw: unknown): Promise<User> {
  const email = normalizeEmail(emailRaw);
  const password = checkPassword(passwordRaw);
  await rateLimit(`signup:${email}`, 5, 15 * 60);
  const store = getStore();
  const id = randomToken(12);
  if (!(await store.setNew(`user:email:${email}`, id))) {
    throw new HttpError(409, 'Já existe uma conta com este e-mail. Entre com a sua senha.', 'account_exists');
  }
  const user: User = { id, email, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() };
  await store.set(`user:${id}`, user);
  return user;
}

export async function checkLogin(emailRaw: unknown, passwordRaw: unknown): Promise<User> {
  const email = normalizeEmail(emailRaw);
  await rateLimit(`login:${email}`, 10, 15 * 60);
  const store = getStore();
  const id = await store.get<string>(`user:email:${email}`);
  const user = id ? await store.get<User>(`user:${id}`) : null;
  const ok = user && typeof passwordRaw === 'string' && (await verifyPassword(passwordRaw, user.passwordHash));
  if (!ok || !user) throw new HttpError(401, 'E-mail ou senha incorretos.', 'invalid_credentials');
  return user;
}

export async function getUser(id: string): Promise<User | null> {
  return getStore().get<User>(`user:${id}`);
}

// App login tokens: the phone keeps one after signing in
export async function issueAppToken(userId: string): Promise<string> {
  const token = randomToken();
  await getStore().set(`apptoken:${sha256(token)}`, userId, APP_TOKEN_TTL);
  return token;
}

export async function revokeAppToken(token: string) {
  await getStore().del(`apptoken:${sha256(token)}`);
}

export async function userFromAppToken(token: string | null): Promise<User> {
  const id = token ? await getStore().get<string>(`apptoken:${sha256(token)}`) : null;
  const user = id ? await getUser(id) : null;
  if (!user) throw new HttpError(401, 'Sessão expirada. Entre de novo na sua conta.', 'unauthorized');
  return user;
}
