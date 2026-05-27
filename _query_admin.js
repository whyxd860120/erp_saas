const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const admin = await p.systemUser.findFirst({
    where: { email: 'admin@erp2026.com' },
    select: { id: true, email: true, password: true, name: true, role: true }
  });
  console.log('=== admin@erp2026.com ===');
  console.log(JSON.stringify(admin, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
