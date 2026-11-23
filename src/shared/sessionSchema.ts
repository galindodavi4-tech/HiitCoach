// Validates session data from untrusted sources (imported files, the MCP server).
// Pure code shared by the app and the API: no browser or Node APIs.
import type { Block, Category, Session, Step, StepKind, StepMode } from '../types.js';

export const CATEGORY_VALUES: Category[] = ['HIITCoach', 'FQB', 'Cardio', 'Custom'];
const KINDS: StepKind[] = ['prep', 'work', 'rest', 'cooldown'];
const MODES: StepMode[] = ['time', 'reps', 'manual'];

// Each check throws a message in Portuguese that is shown to the user
export class SessionDataError extends Error {}

function fail(message: string): never {
  throw new SessionDataError(message);
}

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function optionalString(v: unknown, where: string, field: string): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string') fail(`${where}: o campo "${field}" deve ser um texto.`);
  return v.slice(0, 500);
}

function requiredName(v: unknown, where: string): string {
  if (typeof v !== 'string' || v.trim() === '') fail(`${where}: falta o nome.`);
  return v.trim().slice(0, 120);
}

function positiveInt(v: unknown, max: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= max ? v : null;
}

interface Counter {
  steps: number;
}

function parseStep(raw: Record<string, unknown>, newId: () => string, counter: Counter): Step {
  if (++counter.steps > 500) fail('A sessão tem passos demais.');
  const name = requiredName(raw.name, 'Um passo');
  const where = `Passo "${name}"`;
  const kind = raw.kind as StepKind;
  const mode = raw.mode as StepMode;
  if (!KINDS.includes(kind)) fail(`${where}: tipo inválido (use prep, work, rest ou cooldown).`);
  if (!MODES.includes(mode)) fail(`${where}: modo inválido (use time, reps ou manual).`);

  const step: Step = { type: 'step', id: newId(), name, kind, mode };
  if (mode !== 'manual') {
    const seconds = positiveInt(raw.seconds, 6 * 3600);
    if (seconds === null) fail(`${where}: o tempo em segundos deve ser um número inteiro maior que zero.`);
    step.seconds = seconds;
  }
  if (mode === 'reps') {
    const reps = positiveInt(raw.reps, 10000);
    if (reps === null) fail(`${where}: o número de repetições deve ser um inteiro maior que zero.`);
    step.reps = reps;
  }
  const notes = optionalString(raw.notes, where, 'notes');
  const color = optionalString(raw.color, where, 'color');
  const voiceCue = optionalString(raw.voiceCue, where, 'voiceCue');
  if (color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(color)) fail(`${where}: cor inválida.`);
  if (notes !== undefined) step.notes = notes;
  if (color !== undefined) step.color = color;
  if (voiceCue !== undefined) step.voiceCue = voiceCue;
  return step;
}

function parseBlock(raw: Record<string, unknown>, depth: number, newId: () => string, counter: Counter): Block {
  if (depth > 20) fail('A sessão tem blocos demais um dentro do outro.');
  const name = requiredName(raw.name, 'Um bloco');
  const where = `Bloco "${name}"`;
  const repeat = positiveInt(raw.repeat, 1000);
  if (repeat === null) fail(`${where}: o número de rodadas deve ser um inteiro maior que zero.`);
  if (!Array.isArray(raw.items)) fail(`${where}: a lista de passos está faltando.`);

  const items = raw.items.map((item): Step | Block => {
    if (!isObject(item)) fail(`${where}: contém um item inválido.`);
    if (item.type === 'step') return parseStep(item, newId, counter);
    if (item.type === 'block') return parseBlock(item, depth + 1, newId, counter);
    fail(`${where}: contém um item que não é passo nem bloco.`);
  });
  return { type: 'block', id: newId(), name, repeat, items };
}

// Builds a new session with fresh ids from untrusted data, or throws SessionDataError
export function parseSessionData(data: unknown, newId: () => string, now = new Date().toISOString()): Session {
  if (!isObject(data)) fail('Os dados não contêm uma sessão.');
  const name = requiredName(data.name, 'A sessão');
  // Files exported before the JogaBR → HIITCoach rename still say 'JogaBR'
  const category = (data.category === 'JogaBR' ? 'HIITCoach' : data.category ?? 'Custom') as Category;
  if (!CATEGORY_VALUES.includes(category)) fail('A sessão tem uma categoria desconhecida.');
  if (!isObject(data.root) || data.root.type !== 'block') fail('A sessão não tem passos.');
  const root = parseBlock(data.root, 0, newId, { steps: 0 });
  return { id: newId(), name, category, root, createdAt: now, updatedAt: now };
}
