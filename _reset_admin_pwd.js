const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();

async function main() {
  const newPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  await p.systemUser.update({
    where: { id: 'super_admin_001' },
    data: { password: hashedPassword }
  });
  
  console.log(`✅ admin@erp2026.com 密码已重置为: ${newPassword}`);
}

main().catch(console.error).finally(() => p.$disconnect());
