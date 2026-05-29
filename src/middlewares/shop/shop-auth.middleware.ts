/**
 * 微信商城公开中间件
 * 用于无需 ERP 认证的公开接口
 */

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import config from '../../config'

const prisma = new PrismaClient()

/**
 * 商城用户认证（微信登录后的 JWT）
 * 和 ERP 的 authenticate 分开，商城用 shop token
 */
export const shopAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: '未提供认证令牌' })
      return
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, config.jwt.secret) as {
      shopUserId: string
      openid: string
      tenantId: string
    }

    const shopUser = await prisma.shopUser.findUnique({
      where: { id: decoded.shopUserId },
    })

    if (!shopUser || shopUser.status !== 'active') {
      res.status(401).json({ success: false, message: '用户不存在或已被禁用' })
      return
    }

    ;(req as any).shopUser = shopUser
    ;(req as any).tenantId = shopUser.tenantId
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: '登录已过期' })
      return
    }
    res.status(401).json({ success: false, message: '认证失败' })
  }
}

/**
 * 生成商城 JWT
 */
export const generateShopToken = (payload: { shopUserId: string; openid: string; tenantId: string }): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '30 days' as any,
  })
}

export default { shopAuth, generateShopToken }
