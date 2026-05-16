import * as fs from 'fs';
import * as path from 'path';

const logDir = path.resolve(__dirname, '../../logs');
const logFile = path.join(logDir, 'server.log');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const write = (level: 'INFO' | 'WARN' | 'ERROR', message: string) => {
  const ts = new Date().toISOString().replace('T', ' ').replace('Z', '');
  const line = `${ts} [${level}] ${message}`;
  fs.appendFileSync(logFile, `${line}\n`, 'utf8');

  if (level === 'ERROR') {
    console.error(line);
  } else if (level === 'WARN') {
    console.warn(line);
  } else {
    console.log(line);
  }
};

const logger = {
  info: (message: string) => write('INFO', message),
  warn: (message: string) => write('WARN', message),
  error: (message: string) => write('ERROR', message),
};

export default logger;
