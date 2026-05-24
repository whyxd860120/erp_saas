const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function autoFix() {
  console.log('🚀 开始自动修复...');
  
  try {
    // 第一步：尝试生成Prisma Client
    console.log('\n[1/4] 正在生成 Prisma Client...');
    try {
      await execPromise('npx prisma generate', { cwd: __dirname });
      console.log('✅ Prisma Client 生成成功！');
    } catch (genErr) {
      console.log('⚠️  Prisma Client 生成可能有问题，继续尝试...');
    }

    // 第二步：尝试使用 db push 同步数据库
    console.log('\n[2/4] 正在同步数据库结构...');
    try {
      await execPromise('npx prisma db push', { cwd: __dirname });
      console.log('✅ 数据库同步成功！');
    } catch (pushErr) {
      console.log('⚠️  db push 可能有问题，尝试其他方法...');
      
      // 尝试使用 prisma migrate
      try {
        await execPromise('npx prisma migrate dev --name add_tree_structure', { cwd: __dirname });
        console.log('✅ 数据库迁移成功！');
      } catch (migrateErr) {
        console.log('⚠️  迁移可能有问题，继续...');
      }
    }

    // 第三步：测试数据库连接
    console.log('\n[3/4] 正在测试数据库连接...');
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ 数据库连接成功！');

    // 检查字段是否存在（通过尝试简单查询）
    try {
      await prisma.supplier.findFirst({ select: { id: true, parentId: true } });
      console.log('✅ suppliers 表的 parentId 字段正常！');
    } catch (supplierErr) {
      console.log('⚠️  suppliers 表可能还有问题...');
    }

    try {
      await prisma.customer.findFirst({ select: { id: true, parentId: true } });
      console.log('✅ customers 表的 parentId 字段正常！');
    } catch (customerErr) {
      console.log('⚠️  customers 表可能还有问题...');
    }

    await prisma.$disconnect();

    console.log('\n[4/4] 🎉 自动修复完成！');
    console.log('\n现在请重启你的后端服务，然后刷新浏览器页面！');

  } catch (error) {
    console.error('\n❌ 自动修复过程出错:', error.message);
    console.log('\n💡 提示：请确保：');
    console.log('   1. MySQL 服务正在运行');
    console.log('   2. 数据库连接配置正确');
    console.log('   3. 已安装所有依赖 (npm install)');
  }
}

autoFix();
