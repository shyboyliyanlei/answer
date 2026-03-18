import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// 注册
router.post('/register', async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: '用户名、邮箱和密码均为必填项' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: '密码至少 8 位字符' });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [result]: any = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );
    const userId = result.insertId;
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ id: userId, username, token });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      const field = err.message.includes('username') ? '用户名' : '邮箱';
      res.status(409).json({ error: `该${field}已被注册` });
      return;
    }
    throw err;
  }
});

// 登录
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: '邮箱和密码均为必填项' });
    return;
  }

  const [rows]: any = await pool.query(
    'SELECT id, username, password FROM users WHERE email = ?',
    [email]
  );
  if (!rows.length) {
    res.status(401).json({ error: '邮箱或密码错误' });
    return;
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: '邮箱或密码错误' });
    return;
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ id: user.id, username: user.username, token });
});

export default router;
