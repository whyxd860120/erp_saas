# ERP业务测试发现的问题

## 问题1：采购订单创建失败（已修复 ✅）

### 根本原因（已确认）

**Prisma Schema与数据库表结构不一致！**

#### 问题详情
1. **代码位置**：多个控制器文件中明细表创建语句
2. **问题代码**：
```typescript
await tx.purchaseOrderItem.create({
  data: {
    tenantId: req.user!.tenantId!,  // ← 尝试写入不存在的字段
    orderId: newOrder.id,
    ...
  },
});
```

3. **数据库实际结构**：明细表没有 `tenantId` 字段
   - `purchase_order_items` ✅ 已验证
   - `sales_order_items` ✅ 已验证
   - `purchase_inbound_details` ✅ 已验证
   - `sales_outbound_details` ✅ 已验证

### 修复方案（已实施）

**方案A：从代码中移除tenantId**（已采用）

修复文件：
1. `src/controllers/purchase-order.controller.ts` - 2处（第346行、第554行）
2. `src/controllers/sales-order.controller.ts` - 2处（第326行、第533行）
3. `src/controllers/purchase-inbound.controller.ts` - 1处（第396行）
4. `src/controllers/sales-outbound.controller.ts` - 1处（第408行）

### 测试结果

**完整业务流程测试通过：**
- ✅ 采购订单创建
- ✅ 采购订单确认
- ✅ 采购入库单创建
- ✅ 采购入库单确认 → 库存+100
- ✅ 销售订单创建
- ✅ 销售订单确认
- ✅ 销售出库单创建
- ✅ 销售出库单确认 → 库存-50
- ✅ 库存查询：正确显示50件

### 设计说明
明细表通过关联查询实现租户隔离：
- `PurchaseOrderItem.orderId → PurchaseOrder.tenantId`
- 无需在明细表冗余存储tenantId
- Prisma schema中未定义明细表tenantId字段
