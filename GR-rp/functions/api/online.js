import { verifyToken } from '../utils/jwt.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  // GET /api/online/count – 获取在线人数
  if (method === 'GET' && url.pathname.endsWith('/count')) {
    const now = Math.floor(Date.now() / 1000);
    const expire = now - 300; // 5分钟不活跃视为离线
    const { results } = await env.DB.prepare('SELECT COUNT(*) as count FROM online_users WHERE last_seen > ?').bind(expire).all();
    return new Response(JSON.stringify({ count: results[0].count }), { status: 200 });
  }

  // POST /api/online/heartbeat – 心跳上报（需登录）
  if (method === 'POST' && url.pathname.endsWith('/heartbeat')) {
    const userPayload = await verifyToken(request, env);
    if (!userPayload) {
      return new Response(JSON.stringify({ error: '未登录' }), { status: 401 });
    }
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(`
      INSERT INTO online_users (username, last_seen) VALUES (?, ?)
      ON CONFLICT(username) DO UPDATE SET last_seen = excluded.last_seen
    `).bind(userPayload.username, now).run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  // POST /api/online/offline – 用户退出时移除
  if (method === 'POST' && url.pathname.endsWith('/offline')) {
    const userPayload = await verifyToken(request, env);
    if (!userPayload) return new Response(JSON.stringify({ error: '未登录' }), { status: 401 });
    await env.DB.prepare('DELETE FROM online_users WHERE username = ?').bind(userPayload.username).run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
}