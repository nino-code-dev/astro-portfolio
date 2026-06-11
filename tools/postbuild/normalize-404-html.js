import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const filePath = join(process.cwd(), 'dist', '404.html');

if (existsSync(filePath)) {
  const html = readFileSync(filePath, 'utf8');
  const normalized = html
    .replace(/(["'])\.\/assets\//g, '$1/assets/')
    .replace(/(["'])\.\.\/assets\//g, '$1/assets/')
    .replace(/(["'])\.\/works\//g, '$1/works/')
    .replace(/(["'])\.\/#([A-Za-z0-9_-]+)/g, '$1/#$2')
    .replace(/(["'])\.\//g, '$1/');

  if (normalized !== html) {
    writeFileSync(filePath, normalized);
  }
}
