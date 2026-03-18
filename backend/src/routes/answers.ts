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

    // 通知提问者（不通知自己）
    const [qRows]: any = await conn.query(
      'SELECT author_id, title FROM questions WHERE id = ?',
      [question_id]
    );
    if (qRows.length && qRows[0].author_id !== author_id) {
      const title = qRows[0].title.length > 28 ? qRows[0].title.slice(0, 28) + '…' : qRows[0].title;
      const [uRows]: any = await conn.query('SELECT username FROM users WHERE id = ?', [author_id]);
      const answererName = uRows.length ? uRows[0].username : '有人';
      await conn.query(
        'INSERT INTO notifications (user_id, type, message, related_question_id) VALUES (?, ?, ?, ?)',
        [qRows[0].author_id, 'answer', `${answererName} 回答了你的问题「${title}」`, question_id]
      );
    }

    await conn.commit();
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// 编辑答案
router.patch('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { content, operator_id } = req.body;
  if (!content || !operator_id) { res.status(400).json({ error: 'content and operator_id are required' }); return; }

  const [rows]: any = await pool.query('SELECT author_id FROM answers WHERE id = ?', [id]);
  if (!rows.length) { res.status(404).json({ error: 'Answer not found' }); return; }
  if (rows[0].author_id !== operator_id) { res.status(403).json({ error: 'Forbidden' }); return; }

  await pool.query('UPDATE answers SET content = ? WHERE id = ?', [content, id]);
  res.json({ success: true });
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
      `SELECT a.id, a.author_id, a.is_accepted, q.author_id AS question_author_id, q.id AS question_id, q.is_solved, q.title
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

    // 通知答者（不通知自己）
    if (answer.author_id !== operator_id) {
      const title = answer.title.length > 28 ? answer.title.slice(0, 28) + '…' : answer.title;
      await conn.query(
        'INSERT INTO notifications (user_id, type, message, related_question_id) VALUES (?, ?, ?, ?)',
        [answer.author_id, 'answer_accept', `你对「${title}」的回答被采纳了`, answer.question_id]
      );
    }

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
