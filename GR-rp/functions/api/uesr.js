import { verifyToken } from '../utils/jwt.js';

export async function onRequest(context) {
  const { request, env } = context;
  const userPayload = await verifyToken(request, env);
  if (!userPayload) {
    return new Response(JSON.stringify({ error: '未登录' }), { status: 401 });
  }

  const url = new URL(request.url);
  const method = request.method;

  // GET /api/user/profile
  if (method === 'GET' && url.pathname.endsWith('/profile')) {
    const dbUser = await env.DB.prepare('SELECT username, points, is_vip, is_admin, avatar, reg_date, title FROM users WHERE id = ?').bind(userPayload.id).first();
    return new Response(JSON.stringify(dbUser), { status: 200 });
  }

  // POST /api/user/avatar
  if (method === 'POST' && url.pathname.endsWith('/avatar')) {
    const { avatar } = await request.json();
    await env.DB.prepare('UPDATE users SET avatar = ? WHERE id = ?').bind(avatar, userPayload.id).run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  // POST /api/user/redeem
  if (method === 'POST' && url.pathname.endsWith('/redeem')) {
    const { code } = await request.json();
    const redeem = await env.DB.prepare('SELECT * FROM redeem_codes WHERE code = ?').bind(code).first();
    if (!redeem) {
      return new Response(JSON.stringify({ error: '无效兑换码' }), { status: 400 });
    }
    let usedList = JSON.parse(redeem.used_list);
    if (usedList.includes(userPayload.username)) {
      return new Response(JSON.stringify({ error: '你已使用过此兑换码' }), { status: 400 });
    }
    await env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(redeem.points, userPayload.id).run();
    usedList.push(userPayload.username);
    await env.DB.prepare('UPDATE redeem_codes SET used_list = ? WHERE code = ?').bind(JSON.stringify(usedList), code).run();
    return new Response(JSON.stringify({ success: true, pointsAdded: redeem.points }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
}