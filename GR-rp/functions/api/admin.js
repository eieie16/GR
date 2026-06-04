import { verifyToken } from '../utils/jwt.js';

export async function onRequest(context) {
  const { request, env } = context;
  const userPayload = await verifyToken(request, env);
  if (!userPayload || !userPayload.isAdmin) {
    return new Response(JSON.stringify({ error: '无权限' }), { status: 403 });
  }

  const url = new URL(request.url);
  const method = request.method;

  // ========== 用户管理 ==========
  // GET /api/admin/users?search=xxx
  if (method === 'GET' && url.pathname.endsWith('/users')) {
    const search = url.searchParams.get('search') || '';
    let query = 'SELECT id, username, points, is_vip, is_admin, reg_date FROM users';
    let params = [];
    if (search) {
      query += ' WHERE username LIKE ?';
      params.push(`%${search}%`);
    }
    query += ' ORDER BY id';
    const { results } = await env.DB.prepare(query).bind(...params).all();
    return new Response(JSON.stringify(results), { status: 200 });
  }

  // POST /api/admin/set-vip
  if (method === 'POST' && url.pathname.endsWith('/set-vip')) {
    const { username, isVip } = await request.json();
    await env.DB.prepare('UPDATE users SET is_vip = ? WHERE username = ?').bind(isVip ? 1 : 0, username).run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  // POST /api/admin/set-admin
  if (method === 'POST' && url.pathname.endsWith('/set-admin')) {
    const { username, isAdmin } = await request.json();
    // 防止移除自己的管理员权限
    if (username === userPayload.username && !isAdmin) {
      return new Response(JSON.stringify({ error: '不能移除自己的管理员权限' }), { status: 400 });
    }
    await env.DB.prepare('UPDATE users SET is_admin = ? WHERE username = ?').bind(isAdmin ? 1 : 0, username).run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  // ========== 商品管理 ==========
  // POST /api/admin/add-shop-item
  if (method === 'POST' && url.pathname.endsWith('/add-shop-item')) {
    const { name, description, price, stock } = await request.json();
    if (!name || price === undefined || stock === undefined) {
      return new Response(JSON.stringify({ error: '缺少必要字段' }), { status: 400 });
    }
    await env.DB.prepare('INSERT INTO shop_items (name, description, price, stock) VALUES (?, ?, ?, ?)')
      .bind(name, description || '', price, stock).run();
    return new Response(JSON.stringify({ success: true }), { status: 201 });
  }

  // POST /api/admin/delete-shop-item
  if (method === 'POST' && url.pathname.endsWith('/delete-shop-item')) {
    const { id } = await request.json();
    await env.DB.prepare('DELETE FROM shop_items WHERE id = ?').bind(id).run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  // ========== 兑换码管理 ==========
  // POST /api/admin/generate-redeem
  if (method === 'POST' && url.pathname.endsWith('/generate-redeem')) {
    const { code, points } = await request.json();
    if (!code || !points) {
      return new Response(JSON.stringify({ error: '缺少兑换码或积分值' }), { status: 400 });
    }
    const existing = await env.DB.prepare('SELECT code FROM redeem_codes WHERE code = ?').bind(code).first();
    if (existing) {
      return new Response(JSON.stringify({ error: '兑换码已存在' }), { status: 400 });
    }
    await env.DB.prepare('INSERT INTO redeem_codes (code, points, used_list) VALUES (?, ?, ?)')
      .bind(code, points, '[]').run();
    return new Response(JSON.stringify({ success: true }), { status: 201 });
  }

  // GET /api/admin/redeem-codes
  if (method === 'GET' && url.pathname.endsWith('/redeem-codes')) {
    const codes = await env.DB.prepare('SELECT code, points, used_list FROM redeem_codes').all();
    return new Response(JSON.stringify(codes.results), { status: 200 });
  }

  // ========== 团队管理 ==========
  // GET /api/admin/team
  if (method === 'GET' && url.pathname.endsWith('/team')) {
    const team = await env.DB.prepare('SELECT * FROM team_members ORDER BY id').all();
    return new Response(JSON.stringify(team.results), { status: 200 });
  }

  // POST /api/admin/add-team
  if (method === 'POST' && url.pathname.endsWith('/add-team')) {
    const { name, role, avatar } = await request.json();
    if (!name || !role) {
      return new Response(JSON.stringify({ error: '缺少姓名或职位' }), { status: 400 });
    }
    await env.DB.prepare('INSERT INTO team_members (name, role, avatar) VALUES (?, ?, ?)')
      .bind(name, role, avatar || '').run();
    return new Response(JSON.stringify({ success: true }), { status: 201 });
  }

  // POST /api/admin/delete-team
  if (method === 'POST' && url.pathname.endsWith('/delete-team')) {
    const { id } = await request.json();
    await env.DB.prepare('DELETE FROM team_members WHERE id = ?').bind(id).run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  // ========== 维护模式（状态存储在环境变量或单独的表中，这里简单用数据库） ==========
  // 我们可以创建一个 config 表，但为简单，直接返回当前状态并允许修改
  // 为了方便，维护模式的状态可以存在一个名为 site_config 的表中，这里略，或者直接使用变量。
  // 你可以根据需要扩展。

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
}