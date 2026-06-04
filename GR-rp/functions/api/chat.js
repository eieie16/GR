import { verifyToken } from '../utils/jwt.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  // GET /api/chat/messages – 获取最近 100 条消息
  if (method === 'GET' && url.pathname.endsWith('/messages')) {
    const messages = await env.DB.prepare(`
      SELECT username, avatar, content, timestamp, is_admin, is_vip, title 
      FROM chat_messages 
      ORDER BY id DESC LIMIT 100
    `).all();
    // 反转顺序让最早的在上面
    const results = messages.results.reverse();
    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/chat/send – 发送新消息
  if (method === 'POST' && url.pathname.endsWith('/send')) {
    const userPayload = await verifyToken(request, env);
    if (!userPayload) {
      return new Response(JSON.stringify({ error: '请先登录' }), { status: 401 });
    }

    const { content } = await request.json();
    if (!content || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: '消息不能为空' }), { status: 400 });
    }

    // 获取用户详细信息（头像、VIP、管理员状态等）
    const user = await env.DB.prepare('SELECT username, avatar, is_vip, is_admin, title FROM users WHERE id = ?').bind(userPayload.id).first();
    const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });

    await env.DB.prepare(`
      INSERT INTO chat_messages (username, avatar, content, timestamp, is_admin, is_vip, title)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(user.username, user.avatar, content, timestamp, user.is_admin, user.is_vip, user.title).run();

    return new Response(JSON.stringify({ success: true }), { status: 201 });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
}