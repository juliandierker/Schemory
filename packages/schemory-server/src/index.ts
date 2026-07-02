import { startServer } from './app';

const port = parseInt(process.env.PORT || '5555');

startServer(port).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export * from './app';
export * from './db/connection';
export * from './db/schema';
