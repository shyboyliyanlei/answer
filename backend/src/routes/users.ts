import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// 获取用户信息
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const [rows]: any = await pool.query(
    'SELECT id, username, points, created_at FROM users WHERE id = ?',
    [id]
  );
  if (!rows.length) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  res.json(rows[0]);
});

// 获取用户发布的问题
router.get('/:id/questions', async (req: Request, res: Response) => {
  const { id } = req.params;
  const [rows]: any = await pool.query(
    `SELECT id, title, tags, views, answers_count, votes, is_solved, created_at
     FROM questions
     WHERE author_id = ?
     ORDER BY created_at DESC`,
    [id]
  );
  res.json(rows);
});

// 获取用户的回答（附带问题标题）
router.get('/:id/answers', async (req: Request, res: Response) => {
  const { id } = req.params;
  const [rows]: any = await pool.query(
    `SELECT a.id, a.content, a.votes, a.is_accepted, a.created_at,
            q.id AS question_id, q.title AS question_title, q.is_solved AS question_solved
     FROM answers a
     JOIN questions q ON a.question_id = q.id
     WHERE a.author_id = ?
     ORDER BY a.created_at DESC`,
    [id]
  );
  res.json(rows);
});

export default router;
