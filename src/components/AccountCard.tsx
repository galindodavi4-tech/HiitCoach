import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { getAccount, getSyncStatus, onSyncStatus, signIn, signOut, syncNow } from '../lib/sync';
import type { SyncStatus } from '../lib/sync';
import SectionHeading from './jb/SectionHeading';
import { btnOutline, btnPrimary, btnSecondary, inputClass, labelClass } from './ui';

const TIME = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function statusText(s: SyncStatus): string {
  if (s.state === 'syncing') return 'Sincronizando…';
  if (s.state === 'error') return s.message;
  if (s.state === 'idle' && s.lastSync) return `Sincronizado em ${TIME.format(new Date(s.lastSync))}`;
  return 'Ainda não sincronizado';
}

/** Account sign-in, sync status and how to connect Claude (MCP). */
export default function AccountCard() {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const account = status.state === 'signed-out' ? null : getAccount();
  const mcpUrl = `${window.location.origin}/api/mcp`;

  useEffect(() => onSyncStatus(setStatus), []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(mode, email, password);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the address stays visible to copy by hand
    }
  }

  const tab = (m: 'login' | 'signup', label: string) => (
    <button
      type="button"
      aria-pressed={mode === m}
      onClick={() => setMode(m)}
      className={`min-h-10 rounded-full font-display text-[13px] font-black uppercase transition-colors duration-[140ms] ${
        mode === m ? 'bg-crimson text-white' : 'bg-fill text-secondary'
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="flex flex-col gap-[var(--stack-gap)]">
        <SectionHeading>Conta</SectionHeading>
        {account ? (
          <div className="jb-card flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-1">
              <span className="jb-eyebrow">Conectado</span>
              <span className="truncate text-[18px] font-bold">{account.email}</span>
              <span className={`text-[14px] ${status.state === 'error' ? 'text-[var(--jb-magenta-300)]' : 'text-muted'}`}>
                {status.state === 'idle' || status.state === 'syncing' ? '✓ ' : ''}
                {statusText(status)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className={btnSecondary} disabled={status.state === 'syncing'} onClick={() => void syncNow()}>
                <RefreshCw size={17} strokeWidth={2.4} className={status.state === 'syncing' ? 'animate-spin' : ''} /> Sincronizar
              </button>
              <button className={btnOutline} onClick={() => void signOut()}>Sair</button>
            </div>
          </div>
        ) : (
          <form className="jb-card flex flex-col gap-4 p-4" onSubmit={submit}>
            <p className="text-[15px] text-secondary">
              Entre para guardar seus treinos na nuvem, usar em outro celular e conectar ao Claude. Sem conta, tudo
              continua só neste celular.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {tab('login', 'Entrar')}
              {tab('signup', 'Criar conta')}
            </div>
            <label>
              <span className={labelClass}>E-mail</span>
              <input className={inputClass} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              <span className={labelClass}>Senha {mode === 'signup' && '(mínimo 8 caracteres)'}</span>
              <input
                className={inputClass}
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <p className="rounded-md border border-[var(--border-accent-soft)] bg-[var(--jb-crimson-wash)] px-3.5 py-3 text-[15px] font-semibold text-[var(--jb-magenta-300)]">
                {error}
              </p>
            )}
            <button className={btnPrimary} type="submit" disabled={busy}>
              {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        )}
      </div>

      <div className="flex flex-col gap-[var(--stack-gap)]">
        <SectionHeading>Conectar ao Claude</SectionHeading>
        <div className="jb-card flex flex-col gap-4 p-4">
          <p className="text-[15px] text-secondary">
            Mande o print de um treino para o Claude e ele monta o treino direto em Meus treinos.
          </p>
          <ol className="flex flex-col gap-2 text-[15px]">
            <li><span className="jb-num text-accent">1</span> No Claude, abra Configurações → Conectores → Adicionar conector personalizado.</li>
            <li><span className="jb-num text-accent">2</span> Cole o endereço abaixo e toque em Conectar.</li>
            <li><span className="jb-num text-accent">3</span> Entre com a mesma conta deste app.</li>
            <li><span className="jb-num text-accent">4</span> Envie o print e peça: “monte esse treino no HIITapp”.</li>
          </ol>
          <div className="flex items-center gap-2 rounded-md border border-line bg-[var(--surface-input)] py-1.5 pr-1.5 pl-3.5">
            <code className="min-w-0 flex-1 truncate text-[14px]">{mcpUrl}</code>
            <button className="jb-icon-btn h-10 w-10" aria-label="Copiar endereço" onClick={() => void copy()}>
              {copied ? <Check size={18} strokeWidth={2.6} /> : <Copy size={18} strokeWidth={2.2} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
