import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('generated/client');
const destination = resolve('dist/generated/client');

if (!existsSync(source)) {
  throw new Error('Prisma client is missing. Run prisma:generate before building the API.');
}

mkdirSync(resolve('dist/generated'), { recursive: true });
cpSync(source, destination, { recursive: true, force: true });
