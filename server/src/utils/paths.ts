
import path from 'path';

export const ROOT_DIR = process.cwd();

export const PUBLIC_DIR = path.join(
  ROOT_DIR,
  'build',
  'public'
);

export const UPLOAD_DIR = path.join(
  PUBLIC_DIR,
  'upload'
);
