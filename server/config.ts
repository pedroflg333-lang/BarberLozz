import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '..', '.env') });

export const DEFAULT_BUSINESS_ID = process.env.DEFAULT_BUSINESS_ID || '4dbcb542-eeb2-45f0-8174-6da4f0fca741';
