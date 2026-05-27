const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== users (租户用户) ===');
  const users = await p.user.findMany({
    select: { id: true, email: true, name: true, role: true, status: true, tenantId: true },
    orderBy: { id: 'asc' }
  });
  console.log(JSON.stringify(users, null, 2));

  console.log('\n=== system_users (系统用户) ===');
  const sysUsers = await p.systemUser.findMany({
    select: { id: true, email: true, name: true, role: true, status: true },
    orderBy: { id: 'asc' }
  });
  console.log(JSON.stringify(sysUsers, null, 2));

  console.log('\n=== tenants (租户) ===');
  const tenants = await p.tenant.findMany({
    select: { id: true, slug: true, name: true, status: true, initializationStatus: true },
    orderBy: { id: 'asc' }
  });
  console.log(JSON.stringify(tenants, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
