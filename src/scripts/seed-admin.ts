import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 开始初始化系统管理员...');

  try {
    // 先创建系统租户
    const systemTenant = await prisma.tenant.upsert({
      where: { slug: 'system' },
      update: {},
      create: {
        name: '系统管理',
        slug: 'system',
        plan: 'enterprise',
        status: 'active',
        displayName: 'System',
        email: 'admin@erp2026.com',
        isSystem: true,
      },
    });
    console.log('✅ 创建系统租户成功:', systemTenant.name);

    // 检查系统管理员是否已存在
    const existingAdmin = await prisma.systemUser.findUnique({
      where: { email: 'admin@erp2026.com' }
    });

    if (existingAdmin) {
      console.log('✅ 系统管理员已存在:', existingAdmin.email);

      // 更新密码（如果需要）
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.systemUser.update({
        where: { id: existingAdmin.id },
        data: { password: hashedPassword }
      });
      console.log('🔑 已更新系统管理员密码');
    } else {
      // 创建新的系统管理员
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = await prisma.systemUser.create({
        data: {
          tenantId: systemTenant.id,
          email: 'admin@erp2026.com',
          password: hashedPassword,
          name: '系统管理员',
          role: 'super_admin',
          status: 'active',
        },
      });
      console.log('✅ 创建系统管理员成功:', admin.email);
    }

    // 检查租户管理员是否已存在
    const existingTenantAdmin = await prisma.user.findFirst({
      where: { email: 'admin@demo.com' }
    });

    if (!existingTenantAdmin) {
      // 创建示例租户
      const tenant = await prisma.tenant.upsert({
        where: { slug: 'demo' },
        update: {},
        create: {
          name: '示例公司',
          slug: 'demo',
          plan: 'pro',
          status: 'active',
          displayName: 'Demo Company',
          email: 'admin@demo.com',
        },
      });
      console.log('✅ 创建示例租户成功:', tenant.name);

      // 创建租户管理员
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const tenantAdmin = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: 'admin@demo.com',
          password: hashedPassword,
          name: '租户管理员',
          role: 'admin',
          status: 'active',
        },
      });
      console.log('✅ 创建租户管理员成功:', tenantAdmin.email);
    } else {
      console.log('✅ 租户管理员已存在:', existingTenantAdmin.email);
    }

    console.log('🎉 初始化完成！');
    console.log('');
    console.log('📋 登录信息：');
    console.log('系统管理员: admin@erp2026.com / admin123');
    console.log('租户管理员: admin@demo.com / admin123 (租户标识: demo)');

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });