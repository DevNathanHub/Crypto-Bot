import express from 'express';
import apiRouter from './routes/api.js';

export default function startServer(port = 3000) {
  const app = express();
  app.use(express.json());

  app.use('/api', apiRouter);

  app.get('/', (req, res) => res.send('Crypto Hub Bot API'));

  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  return server;
}
