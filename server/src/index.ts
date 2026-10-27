import { createServer } from './app.js';
import { config } from './config.js';

const { server } = createServer({
  databaseFile: config.databaseFile,
  uploadDir: config.uploadDir,
  matchIntervalMs: config.matchIntervalMs,
  timing: { declineCooldownMs: config.declineCooldownMs },
});

server.listen(config.port, () => {
  console.log(`Thurst server listening on http://localhost:${config.port}`);
});
