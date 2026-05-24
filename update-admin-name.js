// 修改系统管理员姓名脚本
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateAdminName() {
  try {
    // 查找系统管理员
    const admin = await prisma.systemUser.findFirst({
      where: {
        email: 'admin@erp2026.com',
        role: 'super_admin'
      }
    });

    if (!admin) {
      console.log('未找到系统管理员账号');
      return;
    }

    // 更新姓名
    const updated = await prisma.systemUser.update({
      where: { id: admin.id },
      data: { name: '于晓东' }
    });

    console.log('系统管理员姓名已更新为：', updated.name);
  } catch (error) {
    console.error('更新失败：', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminName();
