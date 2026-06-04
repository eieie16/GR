-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  reg_date TEXT NOT NULL,
  points INTEGER DEFAULT 100,
  is_admin INTEGER DEFAULT 0,
  is_vip INTEGER DEFAULT 0,
  avatar TEXT,
  title TEXT
);

-- 邀请码表
CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY,
  used_by TEXT
);

-- 兑换码表
CREATE TABLE IF NOT EXISTS redeem_codes (
  code TEXT PRIMARY KEY,
  points INTEGER NOT NULL,
  used_list TEXT DEFAULT '[]'
);

-- 商品表
CREATE TABLE IF NOT EXISTS shop_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL
);

-- 聊天消息表
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  avatar TEXT,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  is_admin INTEGER DEFAULT 0,
  is_vip INTEGER DEFAULT 0,
  title TEXT
);

-- 团队展示表
CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  avatar TEXT
);

-- 插入初始数据
INSERT OR IGNORE INTO invites (code, used_by) VALUES ('GRIMWARD2025', NULL);

INSERT OR IGNORE INTO shop_items (id, name, description, price, stock) VALUES
(1, '限定称号 - 先驱者', '独一无二的身份象征', 500, 10),
(2, '专属皮肤礼包', '多款精美角色皮肤', 200, 20),
(3, '高级车辆通行证', '解锁所有高级载具', 800, 5),
(4, '史诗武器涂装', '让你的武器与众不同', 300, 15);

INSERT OR IGNORE INTO team_members (id, name, role, avatar) VALUES
(1, 'Admin', '系统管理员', 'https://ui-avatars.com/api/?name=Admin&background=f27128&color=fff');