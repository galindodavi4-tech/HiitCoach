// App accounts. POST {action: 'signup' | 'login', email, password} → {token, email}
// GET (Bearer) → {email}. DELETE (Bearer) → signs this phone out.
import { bearer, handler, HttpError, readBody, send } from './_lib/http.js';
import { checkLogin, createUser, issueAppToken, revokeAppToken, userFromAppToken } from './_lib/auth.js';

export default handler(async (req, res) => {
  if (req.method === 'GET') {
    const user = await userFromAppToken(bearer(req));
    return send(res, 200, { email: user.email });
  }
  if (req.method === 'DELETE') {
    const token = bearer(req);
    if (token) await revokeAppToken(token);
    return send(res, 200, { ok: true });
  }
  if (req.method !== 'POST') throw new HttpError(405, 'Método não permitido.');

  const body = await readBody(req);
  const user =
    body.action === 'signup'
      ? await createUser(body.email, body.password)
      : body.action === 'login'
        ? await checkLogin(body.email, body.password)
        : null;
  if (!user) throw new HttpError(400, 'Ação desconhecida.');
  send(res, 200, { token: await issueAppToken(user.id), email: user.email });
});
