// 创建演示用户脚本
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createDemoUsers() {
  try {
    console.log('🔍 检查租户...')
    
    // 获取第一个租户（或创建默认租户）
    let tenant = await prisma.tenant.findFirst()
    
    if (!tenant) {
      console.log('📝 创建默认租户...')
      tenant = await prisma.tenant.create({
        data: {
          name: '演示公司',
          slug: 'demo',
          status: 'active'
        }
      })
      console.log(`✅ 租户已创建: ${tenant.name}`)
    } else {
      console.log(`✅ 使用现有租户: ${tenant.name}`)
    }
    
    console.log('')
    console.log('🔍 检查演示用户...')
    
    // 创建管理员用户
    const adminEmail = 'admin@example.com'
    const adminExists = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: adminEmail
        }
      }
    })
    
    if (!adminExists) {
      console.log('📝 创建管理员用户...')
      const hashedPassword = await bcrypt.hash('123456', 10)
      
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: adminEmail,
          password: hashedPassword,
          name: '系统管理员',
          role: 'admin',
          status: 'active'
        }
      })
      console.log(`✅ 管理员用户已创建: ${adminEmail}`)
    } else {
      console.log(`✅ 管理员用户已存在: ${adminEmail}`)
    }
    
    // 创建普通用户
    const userEmail = 'user@example.com'
    const userExists = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: userEmail
        }
      }
    })
    
    if (!userExists) {
      console.log('📝 创建普通用户...')
      const hashedPassword = await bcrypt.hash('123456', 10)
      
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: userEmail,
          password: hashedPassword,
          name: '普通用户',
          role: 'staff',
          status: 'active'
        }
      })
      console.log(`✅ 普通用户已创建: ${userEmail}`)
    } else {
      console.log(`✅ 普通用户已存在: ${userEmail}`)
    }
    
    console.log('')
    console.log('🎉 演示用户创建完成！')
    console.log('')
    console.log('📋 登录信息：')
    console.log('  管理员: admin@example.com / 123456')
    console.log('  普通用户: user@example.com / 123456')
    
  } catch (error) {
    console.error('❌ 创建演示用户失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createDemoUsers()
