import { createLogger, format, transports } from 'winston';
import * as path from 'path';

const logDir = path.resolve(__dirname, '../../logs');
const logFile = path.join(logDir, 'server.log');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`)
  ),
  transports: [
    new transports.File({ filename: logFile, maxsize: 10485760, maxFiles: 5 }),
    new transports.Console(),
  ],
});

export default logger;
