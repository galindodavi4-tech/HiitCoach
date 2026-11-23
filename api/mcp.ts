// MCP server (Streamable HTTP, stateless, JSON responses), protected by OAuth.
// Add https://<app>/api/mcp as a custom connector in Claude.
import { baseUrl, bearer, handler, readBody, send } from './_lib/http.js';
import { userFromAccessToken } from './_lib/oauth.js';
import { TOOLS, callTool } from './_lib/tools.js';

const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

interface RpcMessage {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

const ok = (id: RpcMessage['id'], result: unknown) => ({ jsonrpc: '2.0', id, result });
const fail = (id: RpcMessage['id'], code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

async function answer(userId: string, msg: RpcMessage) {
  if (msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return fail(msg.id, -32600, 'Invalid Request');
  // Notifications (no id) get no reply
  if (msg.id === undefined || msg.id === null) return null;
  switch (msg.method) {
    case 'initialize': {
      const asked = msg.params?.protocolVersion;
      return ok(msg.id, {
        protocolVersion: typeof asked === 'string' && PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'hiitapp', title: 'HIITapp', version: '1.0.0' },
        instructions:
          'HIITapp é um timer de treino intervalado. Use criar_treino para transformar um treino (por exemplo, de um print) em um treino do app; ele aparece em "Meus treinos".',
      });
    }
    case 'ping':
      return ok(msg.id, {});
    case 'tools/list':
      return ok(msg.id, { tools: TOOLS });
    case 'tools/call': {
      const name = msg.params?.name;
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      if (typeof name !== 'string' || !TOOLS.some((t) => t.name === name)) return fail(msg.id, -32602, `Unknown tool: ${String(name)}`);
      return ok(msg.id, await callTool(userId, name, args));
    }
    default:
      return fail(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

export default handler(async (req, res) => {
  const userId = await userFromAccessToken(bearer(req));
  if (!userId) {
    // Tells Claude where to find the authorization server
    return send(res, 401, { error: 'unauthorized', error_description: 'Entre na sua conta do HIITapp.' }, {
      'WWW-Authenticate': `Bearer resource_metadata="${baseUrl(req)}/.well-known/oauth-protected-resource", scope="treinos"`,
    });
  }
  if (req.method !== 'POST') {
    // Stateless server: no SSE stream to resume and no session to delete
    res.statusCode = 405;
    res.setHeader('Allow', 'POST, OPTIONS');
    res.end();
    return;
  }

  let body: unknown;
  try {
    // A JSON array (batch) comes back as-is
    body = (await readBody(req)) as unknown;
  } catch {
    return send(res, 400, fail(null, -32700, 'Parse error'));
  }
  const batch = Array.isArray(body) ? (body as RpcMessage[]) : null;
  const messages = batch ?? [body as RpcMessage];
  const replies = (await Promise.all(messages.map((m) => answer(userId, m ?? {})))).filter((r) => r !== null);

  if (replies.length === 0) {
    res.statusCode = 202;
    res.end();
    return;
  }
  send(res, 200, batch ? replies : replies[0]);
});
