import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

{
  const nodeEnv = process.env.NODE_ENV || 'development'
  const candidates = [`.env.${nodeEnv}`, '.env']
  for (const file of candidates) {
    const { parsed } = dotenv.config({ path: file })
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
