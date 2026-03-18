import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// 获取所有标签及问题数量
router.get('/', async (_req: Request, res: Response) => {
  const [rows]: any = await pool.query(`
    SELECT jt.tag, COUNT(*) AS count
    FROM questions,
         JSON_TABLE(tags, '$[*]' COLUMNS (tag VARCHAR(100) PATH '$')) AS jt
    WHERE jt.tag IS NOT NULL AND jt.tag != ''
    GROUP BY jt.tag
    ORDER BY count DESC, jt.tag ASC
  `);
  res.json(rows);
});

export default router;
