import type { Session } from '../types';
import { newId } from './session';
import { SessionDataError, parseSessionData } from '../shared/sessionSchema';

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

// Reads a .json file and returns a new session with fresh ids, or throws an Error with a clear message
export async function importSessionFile(file: File): Promise<Session> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('Este arquivo não é um JSON válido.');
  }
  try {
    return parseSessionData(data, newId);
  } catch (err) {
    if (err instanceof SessionDataError) throw err;
    throw new Error('Não foi possível ler a sessão deste arquivo.');
  }
}
