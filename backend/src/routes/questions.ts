import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { POINTS, addPoints } from '../points';

const router = Router();

// 问题列表（排序 + 标签筛选）
router.get('/', async (req: Request, res: Response) => {
  const { sort = 'newest', tag } = req.query;

  const conditions: string[] = [];
  const params: any[] = [];

  if (sort === 'unsolved') {
    conditions.push('q.is_solved = FALSE');
  }

  if (tag) {
    conditions.push('JSON_CONTAINS(q.tags, JSON_QUOTE(?))');
    params.push(tag);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  let orderBy: string;
  if (sort === 'hot') {
    orderBy = 'ORDER BY q.answers_count DESC, q.created_at DESC';
  } else if (sort === 'recommend') {
    orderBy = 'ORDER BY q.votes DESC, q.created_at DESC';
  } else {
    // newest / unsolved 都按创建时间倒序
    orderBy = 'ORDER BY q.created_at DESC';
  }

  const sql = `
    SELECT q.id, q.title, q.tags, q.author_id, u.username AS author_name,
           q.views, q.answers_count, q.votes, q.is_solved, q.created_at
    FROM questions q
    JOIN users u ON q.author_id = u.id
    ${where}
    ${orderBy}
  `;

  const [rows]: any = await pool.query(sql, params);
  res.json(rows);
});

// 问题详情
router.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [rows]: any = await pool.query(
    `SELECT q.id, q.title, q.content, q.tags, q.author_id, u.username AS author_name,
            q.views, q.answers_count, q.votes, q.is_solved, q.created_at
     FROM questions q
     JOIN users u ON q.author_id = u.id
     WHERE q.id = ?`,
    [id]
  );
  if (!rows.length) {
    res.status(404).json({ error: 'Question not found' });
    return;
  }
  await pool.query('UPDATE questions SET views = views + 1 WHERE id = ?', [id]);
  res.json(rows[0]);
});

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

// 编辑问题
router.patch('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { title, content, tags, operator_id } = req.body;
  if (!operator_id) { res.status(400).json({ error: 'operator_id is required' }); return; }

  const [rows]: any = await pool.query('SELECT author_id FROM questions WHERE id = ?', [id]);
  if (!rows.length) { res.status(404).json({ error: 'Question not found' }); return; }
  if (rows[0].author_id !== operator_id) { res.status(403).json({ error: 'Forbidden' }); return; }

  const fields: string[] = [];
  const params: any[] = [];
  if (title !== undefined) { fields.push('title = ?'); params.push(title); }
  if (content !== undefined) { fields.push('content = ?'); params.push(content); }
  if (tags !== undefined) { fields.push('tags = ?'); params.push(JSON.stringify(tags)); }
  if (!fields.length) { res.status(400).json({ error: 'Nothing to update' }); return; }

  params.push(id);
  await pool.query(`UPDATE questions SET ${fields.join(', ')} WHERE id = ?`, params);
  res.json({ success: true });
});

export default router;
