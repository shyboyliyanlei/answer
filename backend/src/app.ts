import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import questionsRouter from './routes/questions';
import answersRouter from './routes/answers';
import votesRouter from './routes/votes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/questions', questionsRouter);
app.use('/api/answers', answersRouter);
app.use('/api/votes', votesRouter);

export default app;
