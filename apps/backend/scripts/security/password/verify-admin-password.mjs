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

// admin 用户的密码哈希
const adminPasswordHash = '$2b$12$L3aGKpDFINDB9J4GLkgIFOQdDTwqHCguw.l17JVkqhPSDHtyu2pZe';

// 测试一些常见密码
const testPasswords = [
  'admin',
  'Admin@123',
  'Admin@123456',
  'admin123',
  'test-admin',
  'Test@123456',
];

console.log('正在测试 admin 用户的密码...\n');

for (const password of testPasswords) {
  const isMatch = await bcrypt.compare(password, adminPasswordHash);
  console.log(`密码: "${password}" -> ${isMatch ? '✅ 匹配' : '❌ 不匹配'}`);

  if (isMatch) {
    console.log(`\n找到正确密码: ${password}`);
    break;
  }
}
