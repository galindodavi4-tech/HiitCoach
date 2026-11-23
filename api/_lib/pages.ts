// Server-rendered pages for the OAuth flow, in the JogaBR look of the app.

function esc(v: string | undefined): string {
  return (v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const STYLE = `
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#1E1E1E;color:#fff;font:15px/1.4 Barlow,system-ui,-apple-system,sans-serif;display:flex;justify-content:center}
main{width:100%;max-width:430px;padding:32px 16px 40px;display:flex;flex-direction:column;gap:24px}
.mark{font:900 20px/1 "Archivo","Arial Black",sans-serif;text-transform:uppercase}
.mark span{color:#F320D7;font:700 16px Barlow,system-ui,sans-serif;text-transform:none;margin-left:2px}
.eyebrow{font-weight:700;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#F320D7;margin:0 0 4px}
h1{margin:0;font:900 40px/.92 "Archivo","Arial Black",sans-serif;font-stretch:78%;text-transform:uppercase}
.card{background:#050505;border:1px solid #333;border-radius:20px;padding:20px;display:flex;flex-direction:column;gap:6px}
.card p{margin:0;color:#A3A3A3}
.card strong{color:#fff}
form{display:flex;flex-direction:column;gap:16px}
label{display:flex;flex-direction:column;gap:8px;font-weight:700;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#767676}
input{width:100%;min-height:48px;padding:12px 14px;background:#303030;border:1px solid #3E3E3E;border-radius:12px;color:#fff;font:16px Barlow,system-ui,sans-serif;outline:none}
input:focus{border-color:#F320D7}
.btn{display:flex;align-items:center;justify-content:center;min-height:56px;border:0;border-radius:999px;font:900 18px "Archivo","Arial Black",sans-serif;text-transform:uppercase;cursor:pointer}
.primary{background:#E30B60;color:#fff;box-shadow:0 6px 20px rgba(227,11,96,.35)}
.ghost{background:transparent;color:#F320D7;min-height:44px;font-size:14px}
.error{background:rgba(227,11,96,.14);border:1px solid rgba(227,11,96,.45);border-radius:12px;padding:12px 14px;color:#FF8FEE;font-weight:600;margin:0}
.tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tab{min-height:40px;border-radius:999px;border:0;font:900 13px "Archivo","Arial Black",sans-serif;text-transform:uppercase;background:#545454;color:#A3A3A3;cursor:pointer}
.tab[aria-pressed=true]{background:#E30B60;color:#fff}
.hint{color:#767676;font-size:14px;margin:0}
`;

function page(title: string, body: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#1E1E1E"><title>${esc(title)} · HIITapp</title>
<style>${STYLE}</style></head><body><main>
<div class="mark">HIIT<span>app</span></div>${body}</main></body></html>`;
}

export function renderErrorPage(message: string): string {
  return page('Erro', `<div><p class="eyebrow">Conexão</p><h1>Não deu certo</h1></div><p class="error">${esc(message)}</p>`);
}

interface AuthorizeView {
  params: Record<string, string | undefined>;
  clientName?: string;
  action: string;
  error?: string;
  email?: string;
  mode?: 'login' | 'signup';
}

export function renderAuthorizePage(v: AuthorizeView): string {
  const mode = v.mode ?? 'login';
  const hidden = Object.entries(v.params)
    .filter(([, val]) => val !== undefined)
    .map(([k, val]) => `<input type="hidden" name="${esc(k)}" value="${esc(val)}">`)
    .join('');
  const app = esc(v.clientName || 'Um aplicativo');
  return page(
    'Conectar',
    `<div><p class="eyebrow">Conectar conta</p><h1>Entrar no HIITapp</h1></div>
<div class="card"><p><strong>${app}</strong> quer acesso aos seus treinos:</p>
<p>· criar treinos em Meus treinos<br>· ver seus treinos e o histórico</p></div>
${v.error ? `<p class="error">${esc(v.error)}</p>` : ''}
<form method="post" action="${esc(v.action)}">
${hidden}
<input type="hidden" name="mode" id="mode" value="${mode}">
<div class="tabs" role="group">
<button type="button" class="tab" data-mode="login" aria-pressed="${mode === 'login'}">Entrar</button>
<button type="button" class="tab" data-mode="signup" aria-pressed="${mode === 'signup'}">Criar conta</button>
</div>
<label>E-mail<input type="email" name="email" autocomplete="email" required value="${esc(v.email)}"></label>
<label>Senha<input type="password" name="password" autocomplete="current-password" minlength="8" required></label>
<p class="hint">Use a mesma conta do app (Ajustes → Conta), para os treinos aparecerem no seu celular.</p>
<button class="btn primary" type="submit" name="decision" value="allow">Permitir acesso</button>
<button class="btn ghost" type="submit" name="decision" value="deny" formnovalidate>Cancelar</button>
</form>
<script>
document.querySelectorAll('.tab').forEach(function(b){b.addEventListener('click',function(){
document.getElementById('mode').value=b.dataset.mode;
document.querySelectorAll('.tab').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});
});});
</script>`,
  );
}
