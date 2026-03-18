import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { user_id } = req.query;
  if (!user_id) { res.status(400).json({ error: 'user_id required' }); return; }
  const [rows]: any = await pool.query(
    `SELECT id, type, message, related_question_id, is_read, created_at
     FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
    [user_id]
  );
  res.json(rows);
});

router.patch('/read-all', async (req: Request, res: Response) => {
  const { user_id } = req.body;
  if (!user_id) { res.status(400).json({ error: 'user_id required' }); return; }
  await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [user_id]);
  res.json({ success: true });
});

router.patch('/:id/read', async (req: Request, res: Response) => {
  await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;
