import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import { initSocket } from './config/socket';

// Import workers để chúng chạy khi app start
import './workers/video.worker';
import './workers/translate.worker';
import './workers/export.worker';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Khởi tạo WebSockets
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
