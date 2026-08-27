import * as dotenv from 'dotenv';
import { encryptPassword } from '../utils/crypto';

dotenv.config({ path: process.env.ENV_FILE?.trim() || '.env' });

const plaintext = process.argv.slice(2).join(' ');

if (!plaintext) {
  console.error('Usage: npm run encrypt "<password>"');
  process.exit(1);
}

console.log(encryptPassword(plaintext));
