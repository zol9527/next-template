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

async function generatePasswordHash() {
  const newPassword = 'Admin@123456';
  const passwordHash = await bcrypt.hash(newPassword, 12);
  console.log(`新密码: ${newPassword}`);
  console.log(`密码哈希: ${passwordHash}`);
}

generatePasswordHash();
