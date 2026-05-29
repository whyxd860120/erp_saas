import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { generateShopToken } from '../../middlewares/shop/shop-auth.middleware'

const prisma = new PrismaClient()

/**
 * 微信小程序登录
 * POST /api/v1/shop/auth/login
 * Body: { code: string, nickname?: string, avatarUrl?: string }
 * 
 * 说明：实际生产中 code 需要调用微信 code2Session 接口换取 openid。
 * 这里简化为前端直接传 openid 或 code 模拟。
 */
export const wechatLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, openid: directOpenid, nickname, avatarUrl, tenantSlug } = req.body

    // 实际环境：调用微信 API 用 code 换取 openid
    // const wxRes = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
    //   params: { appid: WX_APPID, secret: WX_SECRET, js_code: code, grant_type: 'authorization_code' }
    // })
    // const openid = wxRes.data.openid

    const openid = directOpenid || code || `wx_demo_${Date.now()}`

    // 查找租户（商城归属哪个租户）
    const slug = tenantSlug || 'default'
    let tenant = await prisma.tenant.findFirst({
      where: { slug, status: { in: ['active', 'trial'] } },
    })
    if (!tenant) {
      // 自动找第一个活跃租户
      tenant = await prisma.tenant.findFirst({
        where: { status: { in: ['active', 'trial'] } },
      })
    }
    if (!tenant) {
      res.status(400).json({ success: false, message: '商城未开放' })
      return
    }

    // 查找或创建商城用户
    let shopUser = await prisma.shopUser.findUnique({ where: { openid } })
    if (!shopUser) {
      shopUser = await prisma.shopUser.create({
        data: {
          tenantId: tenant.id,
          openid,
          nickname: nickname || '微信用户',
          avatarUrl: avatarUrl || '',
          lastLoginAt: new Date(),
        },
      })
    } else {
      await prisma.shopUser.update({
        where: { id: shopUser.id },
        data: {
          nickname: nickname || shopUser.nickname,
          avatarUrl: avatarUrl || shopUser.avatarUrl,
          lastLoginAt: new Date(),
        },
      })
    }

    const token = generateShopToken({
      shopUserId: shopUser.id,
      openid: shopUser.openid,
      tenantId: shopUser.tenantId,
    })

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: shopUser.id,
          nickname: shopUser.nickname,
          avatarUrl: shopUser.avatarUrl,
          mobile: shopUser.mobile,
        },
      },
    })
  } catch (error) {
    console.error('微信登录错误:', error)
    res.status(500).json({ success: false, message: '登录失败' })
  }
}

/**
 * 获取当前用户信息
 * GET /api/v1/shop/auth/me
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopUser = (req as any).shopUser
    res.json({
      success: true,
      data: {
        id: shopUser.id,
        nickname: shopUser.nickname,
        avatarUrl: shopUser.avatarUrl,
        mobile: shopUser.mobile,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: '获取用户信息失败' })
  }
}

/**
 * 更新用户信息
 * PUT /api/v1/shop/auth/profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const shopUser = (req as any).shopUser
    const { nickname, avatarUrl, mobile } = req.body

    const updated = await prisma.shopUser.update({
      where: { id: shopUser.id },
      data: {
        ...(nickname !== undefined && { nickname }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(mobile !== undefined && { mobile }),
      },
    })

    res.json({
      success: true,
      data: {
        id: updated.id,
        nickname: updated.nickname,
        avatarUrl: updated.avatarUrl,
        mobile: updated.mobile,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败' })
  }
}

export default { wechatLogin, getMe, updateProfile }
