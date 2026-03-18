import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const q = (req.query.q as string || '').trim();
  if (!q) {
    res.json([]);
    return;
  }

  const keyword = `%${q}%`;
  const [rows]: any = await pool.query(
    `SELECT q.id, q.title, q.content, q.tags, u.username AS author_name,
            q.views, q.answers_count, q.votes, q.is_solved, q.created_at
     FROM questions q
     JOIN users u ON q.author_id = u.id
     WHERE q.title LIKE ? OR q.content LIKE ?
     ORDER BY
       (q.title LIKE ?) DESC,
       q.created_at DESC
     LIMIT 50`,
    [keyword, keyword, keyword]
  );
  res.json(rows);
});

export default router;
