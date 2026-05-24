import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('开始初始化系统租户...')

  // 1. 创建系统租户
  const systemTenant = await prisma.tenant.upsert({
    where: { slug: 'system' },
    update: {},
    create: {
      name: '系统管理',
      slug: 'system',
      isSystem: true,
      status: 'active',
      plan: 'enterprise',
      description: '系统管理员专用租户',
    },
  })
  console.log('系统租户创建成功:', systemTenant.name)

  // 2. 检查现有的 system_users 是否有 tenantId
  const systemUsers = await prisma.systemUser.findMany({
    where: {
      role: 'super_admin',
    },
  })

  console.log('找到系统管理员用户:', systemUsers.length)

  // 3. 如果有系统用户但没有关联租户，更新它们
  for (const user of systemUsers) {
    if (!user.tenantId || user.tenantId !== systemTenant.id) {
      await prisma.systemUser.update({
        where: { id: user.id },
        data: { tenantId: systemTenant.id },
      })
      console.log('已更新系统用户关联:', user.email)
    }
  }

  // 4. 创建默认系统管理员（如果不存在）
  const existingAdmin = await prisma.systemUser.findUnique({
    where: { email: 'admin@erp2026.com' },
  })

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10)
    await prisma.systemUser.create({
      data: {
        email: 'admin@erp2026.com',
        password: hashedPassword,
        name: '系统管理员',
        role: 'super_admin',
        status: 'active',
        tenantId: systemTenant.id,
      },
    })
    console.log('创建默认系统管理员成功')
  }

  console.log('系统租户初始化完成！')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })