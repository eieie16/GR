import { verifyToken } from '../utils/jwt.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  // GET /api/shop/items – 获取商品列表
  if (method === 'GET' && url.pathname.endsWith('/items')) {
    const items = await env.DB.prepare('SELECT * FROM shop_items ORDER BY id').all();
    return new Response(JSON.stringify(items.results), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/shop/buy – 购买商品
  if (method === 'POST' && url.pathname.endsWith('/buy')) {
    const userPayload = await verifyToken(request, env);
    if (!userPayload) {
      return new Response(JSON.stringify({ error: '请先登录' }), { status: 401 });
    }

    const { itemId } = await request.json();
    if (!itemId) {
      return new Response(JSON.stringify({ error: '缺少商品ID' }), { status: 400 });
    }

    // 获取商品信息
    const item = await env.DB.prepare('SELECT * FROM shop_items WHERE id = ?').bind(itemId).first();
    if (!item) {
      return new Response(JSON.stringify({ error: '商品不存在' }), { status: 404 });
    }
    if (item.stock <= 0) {
      return new Response(JSON.stringify({ error: '商品已售罄' }), { status: 400 });
    }

    // 获取用户当前积分
    const user = await env.DB.prepare('SELECT points FROM users WHERE id = ?').bind(userPayload.id).first();
    if (user.points < item.price) {
      return new Response(JSON.stringify({ error: '积分不足' }), { status: 400 });
    }

    // 扣积分，减库存（使用事务保证一致性）
    const updateUser = env.DB.prepare('UPDATE users SET points = points - ? WHERE id = ?').bind(item.price, userPayload.id);
    const updateStock = env.DB.prepare('UPDATE shop_items SET stock = stock - 1 WHERE id = ?').bind(itemId);
    await env.DB.batch([updateUser, updateStock]);

    return new Response(JSON.stringify({ success: true, message: `成功购买 ${item.name}` }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
}