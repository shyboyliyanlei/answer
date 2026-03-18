import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { POINTS, addPoints } from '../points';

const router = Router();

// 点赞问题或回答
router.post('/', async (req: Request, res: Response) => {
  const { user_id, target_type, target_id } = req.body;
  if (!user_id || !target_type || !target_id) {
    res.status(400).json({ error: 'user_id, target_type, target_id are required' });
    return;
  }
  if (target_type !== 'question' && target_type !== 'answer') {
    res.status(400).json({ error: 'target_type must be question or answer' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 防止重复点赞
    const [existing]: any = await conn.query(
      'SELECT id FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?',
      [user_id, target_type, target_id]
    );
    if (existing.length) {
      await conn.rollback();
      res.status(409).json({ error: 'Already voted' });
      return;
    }

    await conn.query(
      'INSERT INTO votes (user_id, target_type, target_id) VALUES (?, ?, ?)',
      [user_id, target_type, target_id]
    );

    let targetAuthorId: number;

    if (target_type === 'question') {
      await conn.query(
        'UPDATE questions SET votes = votes + 1 WHERE id = ?',
        [target_id]
      );
      const [rows]: any = await conn.query(
        'SELECT author_id FROM questions WHERE id = ?',
        [target_id]
      );
      if (!rows.length) {
        await conn.rollback();
        res.status(404).json({ error: 'Question not found' });
        return;
      }
      targetAuthorId = rows[0].author_id;
      // 问题被点赞 +5 积分
      await addPoints(conn, targetAuthorId, POINTS.QUESTION_VOTED);
    } else {
      await conn.query(
        'UPDATE answers SET votes = votes + 1 WHERE id = ?',
        [target_id]
      );
      const [rows]: any = await conn.query(
        'SELECT author_id FROM answers WHERE id = ?',
        [target_id]
      );
      if (!rows.length) {
        await conn.rollback();
        res.status(404).json({ error: 'Answer not found' });
        return;
      }
      targetAuthorId = rows[0].author_id;
      // 回答被点赞 +10 积分
      await addPoints(conn, targetAuthorId, POINTS.ANSWER_VOTED);
    }

    await conn.commit();
    res.status(201).json({ success: true });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

export default router;
