import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const body = await request.json();

  // 注册
  if (url.pathname.endsWith('/register')) {
    const { username, password, inviteCode } = body;
    if (!username || !password || !inviteCode) {
      return new Response(JSON.stringify({ error: '缺少必要字段' }), { status: 400 });
    }
    // 检查邀请码
    const invite = await env.DB.prepare('SELECT * FROM invites WHERE code = ? AND used_by IS NULL').bind(inviteCode).first();
    if (!invite) {
      return new Response(JSON.stringify({ error: '无效邀请码' }), { status: 400 });
    }
    // 检查用户是否存在
    const exist = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
    if (exist) {
      return new Response(JSON.stringify({ error: '用户名已存在' }), { status: 400 });
    }
    const hashed = await bcrypt.hash(password, 10);
    const regDate = new Date().toISOString();
    await env.DB.prepare('INSERT INTO users (username, password, reg_date, points) VALUES (?, ?, ?, 100)').bind(username, hashed, regDate).run();
    // 标记邀请码已使用
    await env.DB.prepare('UPDATE invites SET used_by = ? WHERE code = ?').bind(username, inviteCode).run();
    return new Response(JSON.stringify({ success: true }), { status: 201 });
  }

  // 登录
  if (url.pathname.endsWith('/login')) {
    const { username, password } = body;
    const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return new Response(JSON.stringify({ error: '用户名或密码错误' }), { status: 401 });
    }
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const token = await new SignJWT({ id: user.id, username: user.username, isAdmin: user.is_admin === 1 })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);
    return new Response(JSON.stringify({ token, username: user.username, isAdmin: user.is_admin === 1 }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
}