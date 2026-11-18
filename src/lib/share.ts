import type { Block, Category, Session, Step, StepKind, StepMode } from '../types';
import { CATEGORIES } from './labels';
import { newId } from './session';

const KINDS: StepKind[] = ['prep', 'work', 'rest', 'cooldown'];
const MODES: StepMode[] = ['time', 'reps', 'manual'];

function fileName(session: Session): string {
  const slug = session.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'sessao'}.json`;
}

function download(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Opens the phone share menu when it can share files, otherwise downloads the file
export async function exportSession(session: Session): Promise<void> {
  const file = new File([JSON.stringify(session, null, 2)], fileName(session), { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: session.name });
      return;
    } catch (err) {
      // The user closed the share menu: nothing else to do
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }
  download(file);
}

// Validation: each check throws a message in Portuguese that is shown to the user

class ImportError extends Error {}

function fail(message: string): never {
  throw new ImportError(message);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function optionalString(v: unknown, where: string, field: string): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string') fail(`${where}: o campo "${field}" deve ser um texto.`);
  return v;
}

function requiredName(v: unknown, where: string): string {
  if (typeof v !== 'string' || v.trim() === '') fail(`${where}: falta o nome.`);
  return v;
}

function positiveInt(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 ? v : null;
}

function parseStep(raw: Record<string, unknown>): Step {
  const name = requiredName(raw.name, 'Um passo');
  const where = `Passo "${name}"`;
  const kind = raw.kind as StepKind;
  const mode = raw.mode as StepMode;
  if (!KINDS.includes(kind)) fail(`${where}: tipo inválido.`);
  if (!MODES.includes(mode)) fail(`${where}: modo inválido.`);

  const step: Step = { type: 'step', id: newId(), name, kind, mode };
  if (mode !== 'manual') {
    const seconds = positiveInt(raw.seconds);
    if (seconds === null) fail(`${where}: o tempo em segundos deve ser um número inteiro maior que zero.`);
    step.seconds = seconds;
  }
  if (mode === 'reps') {
    const reps = positiveInt(raw.reps);
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

function parseBlock(raw: Record<string, unknown>, depth: number): Block {
  if (depth > 20) fail('O arquivo tem blocos demais um dentro do outro.');
  const name = requiredName(raw.name, 'Um bloco');
  const where = `Bloco "${name}"`;
  const repeat = positiveInt(raw.repeat);
  if (repeat === null) fail(`${where}: o número de rodadas deve ser um inteiro maior que zero.`);
  if (!Array.isArray(raw.items)) fail(`${where}: a lista de passos está faltando.`);

  const items = raw.items.map((item): Step | Block => {
    if (!isObject(item)) fail(`${where}: contém um item inválido.`);
    if (item.type === 'step') return parseStep(item);
    if (item.type === 'block') return parseBlock(item, depth + 1);
    fail(`${where}: contém um item que não é passo nem bloco.`);
  });
  return { type: 'block', id: newId(), name, repeat, items };
}

// Reads a .json file and returns a new session with fresh ids, or throws an Error with a clear message
export async function importSessionFile(file: File): Promise<Session> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('Este arquivo não é um JSON válido.');
  }
  try {
    if (!isObject(data)) fail('Este arquivo não contém uma sessão.');
    const name = requiredName(data.name, 'A sessão');
    // Files exported before the JogaBR → HIITCoach rename still say 'JogaBR'
    const category = (data.category === 'JogaBR' ? 'HIITCoach' : data.category) as Category;
    if (!CATEGORIES.includes(category)) fail('A sessão tem uma categoria desconhecida.');
    if (!isObject(data.root) || data.root.type !== 'block') fail('A sessão não tem passos.');

    const now = new Date().toISOString();
    return { id: newId(), name, category, root: parseBlock(data.root, 0), createdAt: now, updatedAt: now };
  } catch (err) {
    if (err instanceof ImportError) throw err;
    throw new Error('Não foi possível ler a sessão deste arquivo.');
  }
}
