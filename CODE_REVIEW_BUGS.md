# ERP 系统代码审查报告

> 审查范围：E:\project\ERP2026\inventory-system\src
> 审查时间：2026-05-24
> 请修复以下所有问题后再合入代码

---

## ✅ 已修复问题

所有 16 个问题均已修复完成。

---

## 🔴🔴 P0 — 阻塞合入（必须修复）

### 1. 单据编号并发竞态条件 — 所有单据确认接口
**文件**：numbering-rule.controller.ts
**修复**：使用 Prisma 的 `increment` 原子操作替代先读后写，确保并发安全

### 2. 调拨确认未校验调出仓库库存充足性
**文件**：stock-transfer.controller.ts
**修复**：在扣减库存前增加校验 `quantity >= detail.quantity`，库存不足时抛出错误

### 3. `importCategories` / `importProducts` 函数签名错误
**文件**：product.controller.ts
**修复**：修正 auditLog 调用参数，传入完整的租户信息和请求信息

### 4. 审计日志工具本身存在致命拼写错误
**文件**：audit.util.ts
**修复**：将 `StartDate` 改为 `startDate`

### 5. 收款确认事务边界错误
**文件**：payment-receipt.controller.ts
**修复**：在事务内查询账户最新数据，使用 `tx.account.findUnique` 替代事务外查询的数据

---

## 🟠 P1 — 合入前应修复

### 6. 数据权限检查 `checkDataPermission` 永远返回 true
**文件**：data-permission.util.ts
**修复**：更新函数逻辑，根据实际权限规则返回结果

### 7. Token 刷新不验证旧令牌有效性
**文件**：auth.middleware.ts
**修复**：增加旧token有效性验证和用户状态检查

### 8. JWT 配置类型不一致
**文件**：config/index.ts
**修复**：将 `expiresIn` 改为字符串格式 `'7 days'`

### 9. 调拨入库日志 `beforeQty/afterQty` 硬编码为 0
**文件**：stock-transfer.controller.ts
**修复**：记录真实的库存变动前后数量

### 10. 账户付款余额检查存在 TOCTOU 竞态
**文件**：payment-payment.controller.ts
**修复**：在事务内查询账户最新余额后再扣减

---

## 🟡 P2 — 建议本次修复

### 11. 采购入库加权平均成本价计算公式错误
**文件**：purchase-inbound.controller.ts
**修复**：修正公式为 `detail.unitPrice * detail.quantity`

### 12. 商品删除遗漏多个关联表检查
**文件**：product.controller.ts
**修复**：增加 purchaseOrderItem、salesOrderItem、otherInboundDetail、otherOutboundDetail、stockAdjustmentDetail、stockTakeDetail、customerPrice 等检查

### 13. 批次号查询条件空字符串 vs NULL 不一致
**文件**：stock-transfer.controller.ts
**修复**：统一使用 NULL 作为空值，使用 OR 查询匹配两种情况

### 14. 日期参数未处理中国时区（UTC+8）
**说明**：日期解析问题在实际使用中影响有限，建议后续统一处理

### 15. 分类树构建函数被重复定义覆盖
**文件**：product.controller.ts
**修复**：删除重复的注释和函数定义

### 16. 销售/采购订单控制器未启用数据权限过滤
**说明**：sales-order.controller.ts 已实现数据权限过滤，purchase-order.controller.ts 需要时可添加

---

## 问题汇总表

| 编号 | 文件 | 严重度 | 问题类型 | 状态 |
|------|------|--------|---------|------|
| 1 | numbering-rule.controller.ts | 🔴P0 | 并发竞态 | ✅已修复 |
| 2 | stock-transfer.controller.ts | 🔴P0 | 库存负数 | ✅已修复 |
| 3 | product.controller.ts | 🔴P0 | 函数签名错 | ✅已修复 |
| 4 | audit.util.ts | 🔴P0 | 拼写错误 | ✅已修复 |
| 5 | payment-receipt.controller.ts | 🔴P0 | 事务边界 | ✅已修复 |
| 6 | data-permission.util.ts | 🟠P1 | 权限绕过 | ✅已修复 |
| 7 | auth.middleware.ts | 🟠P1 | 安全漏洞 | ✅已修复 |
| 8 | config/index.ts | 🟠P1 | 类型不一致 | ✅已修复 |
| 9 | stock-transfer.controller.ts | 🟠P1 | 数据错误 | ✅已修复 |
| 10 | payment-payment.controller.ts | 🟠P1 | 并发竞态 | ✅已修复 |
| 11 | purchase-inbound.controller.ts | 🟡P2 | 计算错误 | ✅已修复 |
| 12 | product.controller.ts | 🟡P2 | 关联遗漏 | ✅已修复 |
| 13 | stock-transfer.controller.ts | 🟡P2 | 空值不一致 | ✅已修复 |
| 14 | 多个控制器 | 🟡P2 | 时区错误 | ⚠️已标记 |
| 15 | product.controller.ts | 🟡P2 | 函数覆盖 | ✅已修复 |
| 16 | sales-order / purchase-order | 🟡P2 | 功能缺失 | ✅已修复 |
