import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { POINTS, addPoints } from '../points';

const router = Router();

// 发布问题
router.post('/', async (req: Request, res: Response) => {
  const { title, content, tags, author_id } = req.body;
  if (!title || !content || !author_id) {
    res.status(400).json({ error: 'title, content, author_id are required' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result]: any = await conn.query(
      'INSERT INTO questions (title, content, tags, author_id) VALUES (?, ?, ?, ?)',
      [title, content, JSON.stringify(tags ?? []), author_id]
    );

    // 发布问题 -5 积分
    await addPoints(conn, author_id, POINTS.POST_QUESTION);

    await conn.commit();
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

export default router;
