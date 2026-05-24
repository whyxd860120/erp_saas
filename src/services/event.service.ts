/**
 * 事件系统服务
 * Event System Service
 * 
 * 提供事件发布/订阅、Webhook触发、审计日志记录等功能
 * 支持主流SaaS的事件驱动架构模式
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import axios from 'axios';
import crypto from 'crypto';
import config from '../config';

const prisma = new PrismaClient();
const redis = new Redis(config.redis.url);

// 事件类型定义
export enum EventType {
  // 用户事件
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',

  // 供应商事件
  SUPPLIER_CREATED = 'supplier.created',
  SUPPLIER_UPDATED = 'supplier.updated',
  SUPPLIER_DELETED = 'supplier.deleted',

  // 客户事件
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',

  // 物料事件
  PRODUCT_CREATED = 'product.created',
  PRODUCT_UPDATED = 'product.updated',
  PRODUCT_DELETED = 'product.deleted',

  // 采购事件
  PURCHASE_ORDER_CREATED = 'purchase_order.created',
  PURCHASE_ORDER_CONFIRMED = 'purchase_order.confirmed',
  PURCHASE_ORDER_CANCELLED = 'purchase_order.cancelled',
  PURCHASE_ORDER_COMPLETED = 'purchase_order.completed',

  // 采购入库事件
  PURCHASE_INBOUND_CREATED = 'purchase_inbound.created',
  PURCHASE_INBOUND_CONFIRMED = 'purchase_inbound.confirmed',
  PURCHASE_INBOUND_CANCELLED = 'purchase_inbound.cancelled',

  // 销售事件
  SALES_ORDER_CREATED = 'sales_order.created',
  SALES_ORDER_CONFIRMED = 'sales_order.confirmed',
  SALES_ORDER_CANCELLED = 'sales_order.cancelled',
  SALES_ORDER_COMPLETED = 'sales_order.completed',

  // 销售出库事件
  SALES_OUTBOUND_CREATED = 'sales_outbound.created',
  SALES_OUTBOUND_CONFIRMED = 'sales_outbound.confirmed',
  SALES_OUTBOUND_CANCELLED = 'sales_outbound.cancelled',

  // 库存事件
  INVENTORY_INBOUND = 'inventory.inbound',
  INVENTORY_OUTBOUND = 'inventory.outbound',
  INVENTORY_ADJUSTED = 'inventory.adjusted',
  INVENTORY_TRANSFERRED = 'inventory.transferred',
  INVENTORY_LOW_STOCK = 'inventory.low_stock',

  // 财务事件
  PAYMENT_RECEIPT_CREATED = 'payment_receipt.created',
  PAYMENT_RECEIPT_CONFIRMED = 'payment_receipt.confirmed',
  PAYMENT_PAYMENT_CREATED = 'payment_payment.created',
  PAYMENT_PAYMENT_CONFIRMED = 'payment_payment.confirmed',

  // 系统事件
  TENANT_CREATED = 'tenant.created',
  TENANT_UPDATED = 'tenant.updated',
  TENANT_SUSPENDED = 'tenant.suspended',
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  SUBSCRIPTION_RENEWED = 'subscription.renewed',
}

// 事件数据结构
export interface EventPayload {
  eventId: string;
  eventType: EventType;
  timestamp: string;
  tenantId: string;
  userId?: string;
  data: any;
  metadata?: {
    ip?: string;
    userAgent?: string;
    requestId?: string;
  };
}

// Webhook投递配置
interface WebhookDeliveryConfig {
  maxRetries: number;
  retryDelay: number; // 毫秒
  timeout: number; // 毫秒
}

const DEFAULT_DELIVERY_CONFIG: WebhookDeliveryConfig = {
  maxRetries: 3,
  retryDelay: 5000,
  timeout: 30000,
};

/**
 * 事件系统服务类
 */
export class EventService {
  private static instance: EventService;
  private subscribers: Map<EventType, Array<(payload: EventPayload) => void>> = new Map();

  private constructor() {}

  static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  /**
   * 发布事件
   */
  async emit(eventType: EventType, tenantId: string, data: any, options?: {
    userId?: string;
    metadata?: EventPayload['metadata'];
  }): Promise<EventPayload> {
    const event: EventPayload = {
      eventId: this.generateEventId(),
      eventType,
      timestamp: new Date().toISOString(),
      tenantId,
      userId: options?.userId,
      data,
      metadata: options?.metadata,
    };

    // 1. 保存到事件日志
    await this.saveEventLog(event);

    // 2. 触发本地订阅者
    await this.notifySubscribers(event);

    // 3. 触发Webhook
    await this.triggerWebhooks(event);

    // 4. 发布到Redis（用于分布式场景）
    await this.publishToRedis(event);

    return event;
  }

  /**
   * 订阅事件
   */
  subscribe(eventType: EventType, handler: (payload: EventPayload) => void): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }

    const handlers = this.subscribers.get(eventType)!;
    handlers.push(handler);

    // 返回取消订阅函数
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * 批量发布事件
   */
  async emitBatch(events: Array<{
    eventType: EventType;
    tenantId: string;
    data: any;
    options?: {
      userId?: string;
      metadata?: EventPayload['metadata'];
    };
  }>): Promise<EventPayload[]> {
    const payloads: EventPayload[] = [];

    for (const event of events) {
      const payload = await this.emit(
        event.eventType,
        event.tenantId,
        event.data,
        event.options
      );
      payloads.push(payload);
    }

    return payloads;
  }

  /**
   * 保存事件日志
   */
  private async saveEventLog(event: EventPayload): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: event.tenantId,
          userId: event.userId,
          action: event.eventType,
          module: event.eventType.split('.')[0],
          resource: event.data.id || event.data.resourceId,
          detail: JSON.stringify({
            eventId: event.eventId,
            data: event.data,
            metadata: event.metadata,
          }),
          ip: event.metadata?.ip,
          userAgent: event.metadata?.userAgent,
        },
      });
    } catch (error) {
      console.error('保存事件日志失败:', error);
    }
  }

  /**
   * 通知本地订阅者
   */
  private async notifySubscribers(event: EventPayload): Promise<void> {
    const handlers = this.subscribers.get(event.eventType);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`事件处理器错误 [${event.eventType}]:`, error);
      }
    }
  }

  /**
   * 触发Webhook
   */
  private async triggerWebhooks(event: EventPayload): Promise<void> {
    try {
      // 查询该租户启用的Webhook
      const webhooks = await prisma.webhook.findMany({
        where: {
          tenantId: event.tenantId,
          isActive: true,
        },
      });

      for (const webhook of webhooks) {
        // 检查Webhook是否订阅了该事件
        const subscribedEvents = webhook.events.split(',').map(e => e.trim());
        if (!subscribedEvents.includes(event.eventType) && !subscribedEvents.includes('*')) {
          continue;
        }

        // 异步触发Webhook
        this.deliverWebhook(webhook, event).catch(error => {
          console.error(`Webhook投递失败 [${webhook.id}]:`, error);
        });
      }
    } catch (error) {
      console.error('触发Webhook失败:', error);
    }
  }

  /**
   * 投递Webhook
   */
  private async deliverWebhook(
    webhook: any,
    event: EventPayload,
    config: WebhookDeliveryConfig = DEFAULT_DELIVERY_CONFIG
  ): Promise<void> {
    const payload = {
      event: event.eventType,
      timestamp: event.timestamp,
      data: event.data,
    };

    // 生成签名
    const signature = this.generateWebhookSignature(payload, webhook.secret);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        const response = await axios.post(webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-ID': webhook.id,
            'X-Event-Type': event.eventType,
            'X-Event-ID': event.eventId,
            'X-Attempt': attempt.toString(),
          },
          timeout: config.timeout,
        });

        // 更新Webhook状态
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            lastDeliveredAt: new Date(),
            lastSuccessAt: new Date(),
            deliveryAttempts: { increment: 1 },
          },
        });

        // 记录成功日志
        await prisma.webhookLog.create({
          data: {
            tenantId: webhook.tenantId,
            webhookId: webhook.id,
            event: event.eventType,
            payload: payload as any,
            url: webhook.url,
            statusCode: response.status,
            response: JSON.stringify(response.data).substring(0, 1000),
            success: true,
            attempts: attempt,
          },
        });

        return; // 成功，退出重试
      } catch (error: any) {
        lastError = error;

        // 记录失败日志
        await prisma.webhookLog.create({
          data: {
            tenantId: webhook.tenantId,
            webhookId: webhook.id,
            event: event.eventType,
            payload: payload as any,
            url: webhook.url,
            statusCode: error.response?.status,
            response: error.response?.data ? JSON.stringify(error.response.data).substring(0, 1000) : error.message,
            success: false,
            attempts: attempt,
            nextRetryAt: attempt < config.maxRetries ? new Date(Date.now() + config.retryDelay * attempt) : null,
          },
        });

        if (attempt < config.maxRetries) {
          // 指数退避
          await this.delay(config.retryDelay * attempt);
        }
      }
    }

    // 更新Webhook错误状态
    await prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        lastErrorAt: new Date(),
        lastError: lastError?.message?.substring(0, 500),
        deliveryAttempts: { increment: config.maxRetries },
      },
    });

    throw lastError;
  }

  /**
   * 发布到Redis（用于分布式场景）
   */
  private async publishToRedis(event: EventPayload): Promise<void> {
    try {
      await redis.publish(
        `events:${event.tenantId}`,
        JSON.stringify(event)
      );
    } catch (error) {
      console.error('Redis事件发布失败:', error);
    }
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * 生成Webhook签名
   */
  private generateWebhookSignature(payload: any, secret?: string): string {
    if (!secret) return '';
    
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取租户的事件统计
   */
  async getEventStats(tenantId: string, days: number = 30): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    webhookDeliveries: number;
    webhookSuccessRate: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [eventStats, webhookStats] = await Promise.all([
      // 事件统计
      prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          tenantId,
          createdAt: { gte: since },
        },
        _count: {
          action: true,
        },
      }),
      // Webhook统计
      prisma.webhookLog.aggregate({
        where: {
          tenantId,
          createdAt: { gte: since },
        },
        _count: {
          _all: true,
        },
        _sum: {
          success: true,
        },
      }),
    ]);

    const eventsByType: Record<string, number> = {};
    let totalEvents = 0;

    for (const stat of eventStats) {
      eventsByType[stat.action] = stat._count.action;
      totalEvents += stat._count.action;
    }

    const totalDeliveries = webhookStats._count._all;
    const successfulDeliveries = webhookStats._sum.success || 0;

    return {
      totalEvents,
      eventsByType,
      webhookDeliveries: totalDeliveries,
      webhookSuccessRate: totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0,
    };
  }
}

// 导出单例
export const eventService = EventService.getInstance();

export default eventService;
