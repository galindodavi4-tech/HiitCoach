// Two-way sync of the phone's trainings and history. POST (Bearer app token)
// {data: {sessions, history, deleted}} → {data: merged}
import { bearer, handler, HttpError, readBody, send } from './_lib/http.js';
import { userFromAppToken } from './_lib/auth.js';
import { parseIncoming, syncUserData } from './_lib/data.js';

export default handler(async (req, res) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Método não permitido.');
  const user = await userFromAppToken(bearer(req));
  const merged = await syncUserData(user.id, parseIncoming(await readBody(req)));
  send(res, 200, { data: merged, syncedAt: new Date().toISOString() });
});
