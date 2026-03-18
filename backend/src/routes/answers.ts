import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { POINTS, addPoints } from '../points';

const router = Router();

// 获取某问题下的所有答案
router.get('/', async (req: Request, res: Response) => {
  const { question_id } = req.query;
  if (!question_id) {
    res.status(400).json({ error: 'question_id is required' });
    return;
  }
  const [rows]: any = await pool.query(
    `SELECT a.id, a.content, a.author_id, u.username AS author_name,
            a.votes, a.is_accepted, a.created_at
     FROM answers a
     JOIN users u ON a.author_id = u.id
     WHERE a.question_id = ?
     ORDER BY a.is_accepted DESC, a.votes DESC, a.created_at ASC`,
    [question_id]
  );
  res.json(rows);
});

// 回答问题
router.post('/', async (req: Request, res: Response) => {
  const { content, question_id, author_id } = req.body;
  if (!content || !question_id || !author_id) {
    res.status(400).json({ error: 'content, question_id, author_id are required' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result]: any = await conn.query(
      'INSERT INTO answers (content, question_id, author_id) VALUES (?, ?, ?)',
      [content, question_id, author_id]
    );

    await conn.query(
      'UPDATE questions SET answers_count = answers_count + 1 WHERE id = ?',
      [question_id]
    );

    // 回答问题 +10 积分
    await addPoints(conn, author_id, POINTS.POST_ANSWER);

    await conn.commit();
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// 采纳答案
router.patch('/:id/accept', async (req: Request, res: Response) => {
  const answerId = Number(req.params.id);
  const { operator_id } = req.body; // 操作者（提问者）ID

  if (!operator_id) {
    res.status(400).json({ error: 'operator_id is required' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 查询答案及所属问题
    const [rows]: any = await conn.query(
      `SELECT a.id, a.author_id, a.is_accepted, q.author_id AS question_author_id, q.id AS question_id, q.is_solved
       FROM answers a JOIN questions q ON a.question_id = q.id
       WHERE a.id = ?`,
      [answerId]
    );

    if (!rows.length) {
      await conn.rollback();
      res.status(404).json({ error: 'Answer not found' });
      return;
    }

    const answer = rows[0];

    // 只有提问者可以采纳
    if (answer.question_author_id !== operator_id) {
      await conn.rollback();
      res.status(403).json({ error: 'Only the question author can accept an answer' });
      return;
    }

    if (answer.is_accepted) {
      await conn.rollback();
      res.status(400).json({ error: 'Answer already accepted' });
      return;
    }

    // 取消同一问题下已有的采纳
    await conn.query(
      'UPDATE answers SET is_accepted = FALSE WHERE question_id = ?',
      [answer.question_id]
    );

    // 采纳当前答案，标记问题已解决
    await conn.query(
      'UPDATE answers SET is_accepted = TRUE WHERE id = ?',
      [answerId]
    );
    await conn.query(
      'UPDATE questions SET is_solved = TRUE WHERE id = ?',
      [answer.question_id]
    );

    // 回答被采纳 +30 积分
    await addPoints(conn, answer.author_id, POINTS.ANSWER_ACCEPTED);

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

export default router;
