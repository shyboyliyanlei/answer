import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { POINTS, addPoints } from '../points';

const router = Router();

// 查询用户是否已点赞
router.get('/', async (req: Request, res: Response) => {
  const { user_id, target_type, target_id } = req.query;
  if (!user_id || !target_type || !target_id) {
    res.status(400).json({ error: 'user_id, target_type, target_id are required' });
    return;
  }

  const [rows]: any = await pool.query(
    'SELECT id FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?',
    [user_id, target_type, target_id]
  );

  res.json({ voted: rows.length > 0 });
});

// 点赞
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

    // 查询目标是否存在，并获取作者
    let targetAuthorId: number;
    if (target_type === 'question') {
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
    } else {
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
    }

    // 防止重复点赞
    const [existing]: any = await conn.query(
      'SELECT id FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?',
      [user_id, target_type, target_id]
    );
    if (existing.length) {
      await conn.rollback();
      res.status(409).json({ error: 'Already voted', voted: true });
      return;
    }

    await conn.query(
      'INSERT INTO votes (user_id, target_type, target_id) VALUES (?, ?, ?)',
      [user_id, target_type, target_id]
    );

    if (target_type === 'question') {
      await conn.query('UPDATE questions SET votes = votes + 1 WHERE id = ?', [target_id]);
      await addPoints(conn, targetAuthorId, POINTS.QUESTION_VOTED);
    } else {
      await conn.query('UPDATE answers SET votes = votes + 1 WHERE id = ?', [target_id]);
      await addPoints(conn, targetAuthorId, POINTS.ANSWER_VOTED);
    }

    await conn.commit();
    res.status(201).json({ voted: true });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// 取消点赞
router.delete('/', async (req: Request, res: Response) => {
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

    const [existing]: any = await conn.query(
      'SELECT id FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?',
      [user_id, target_type, target_id]
    );
    if (!existing.length) {
      await conn.rollback();
      res.status(404).json({ error: 'Vote not found', voted: false });
      return;
    }

    await conn.query(
      'DELETE FROM votes WHERE user_id = ? AND target_type = ? AND target_id = ?',
      [user_id, target_type, target_id]
    );

    if (target_type === 'question') {
      await conn.query('UPDATE questions SET votes = GREATEST(votes - 1, 0) WHERE id = ?', [target_id]);
      const [rows]: any = await conn.query('SELECT author_id FROM questions WHERE id = ?', [target_id]);
      if (rows.length) await addPoints(conn, rows[0].author_id, -POINTS.QUESTION_VOTED);
    } else {
      await conn.query('UPDATE answers SET votes = GREATEST(votes - 1, 0) WHERE id = ?', [target_id]);
      const [rows]: any = await conn.query('SELECT author_id FROM answers WHERE id = ?', [target_id]);
      if (rows.length) await addPoints(conn, rows[0].author_id, -POINTS.ANSWER_VOTED);
    }

    await conn.commit();
    res.json({ voted: false });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

export default router;
