import bcrypt from 'bcryptjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';

// 从 security/password/ 上溯 3 级到达后端根目录 apps/backend/
const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = join(__dirname, '..', '..', '..');

{
  const nodeEnv = process.env.NODE_ENV || 'development'
  const candidates = [`.env.${nodeEnv}`, '.env']
  for (const file of candidates) {
    const { parsed } = dotenv.config({ path: join(BACKEND_ROOT, file) })
    if (parsed) break
  }
}

async function generatePasswordHash() {
  const newPassword = 'Admin@123456';
  const passwordHash = await bcrypt.hash(newPassword, 12);
  console.log(`新密码: ${newPassword}`);
  console.log(`密码哈希: ${passwordHash}`);
}

generatePasswordHash();
