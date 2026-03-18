import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import questionsRouter from './routes/questions';
import answersRouter from './routes/answers';
import votesRouter from './routes/votes';
import usersRouter from './routes/users';
import tagsRouter from './routes/tags';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/answers', answersRouter);
app.use('/api/votes', votesRouter);
app.use('/api/users', usersRouter);
app.use('/api/tags', tagsRouter);

export default app;
