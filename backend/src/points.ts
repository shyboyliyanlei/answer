import { PoolConnection } from 'mysql2/promise';

export const POINTS = {
  POST_QUESTION: -5,
  POST_ANSWER: 10,
  ANSWER_ACCEPTED: 30,
  QUESTION_VOTED: 5,
  ANSWER_VOTED: 10,
} as const;

export async function addPoints(
  conn: PoolConnection,
  userId: number,
  delta: number
): Promise<void> {
  await conn.query(
    'UPDATE users SET points = points + ? WHERE id = ?',
    [delta, userId]
  );
}
