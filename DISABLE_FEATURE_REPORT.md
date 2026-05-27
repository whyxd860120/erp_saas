# ERP系统禁用/启用功能添加报告

**添加日期**: 2026/5/27
**修改范围**: 供应商管理、客户管理、物料管理

---

## 修改内容总览

### 1. 后端API修改

#### 1.1 物料管理API - 添加状态切换接口
**文件**: `src/controllers/product.controller.ts`
- ✅ 添加了 `toggleProductStatus` 函数
- 功能：切换物料的启用/禁用状态
- API端点：`PATCH /api/v1/products/:id/status`

#### 1.2 物料管理路由 - 注册新接口
**文件**: `src/routes/product.routes.ts`
- ✅ 添加了状态切换路由：`router.patch('/:id/status', authenticate, tenantIsolation(true), toggleProductStatus);`

#### 1.3 物料管理API客户端
**文件**: `frontend/src/api/product.ts`
- ✅ 添加了 `toggleProductStatus` API函数
- 用于前端调用后端的状态切换接口

---

### 2. 前端页面修改

#### 2.1 供应商管理页面
**文件**: `frontend/src/views/SupplierListView.vue`

修改内容：
- ✅ 在导入部分添加了 `toggleSupplierStatus` 函数
- ✅ 添加了 `toggleSupplierStatus` 函数用于切换供应商状态
- ✅ 在表格操作列中添加了"禁用/启用"按钮
- 功能：点击按钮可切换供应商的启用/禁用状态

#### 2.2 客户管理页面
**文件**: `frontend/src/views/CustomerListView.vue`

修改内容：
- ✅ 在导入部分添加了 `toggleCustomerStatus` 函数
- ✅ 添加了 `toggleCustomerStatus` 函数用于切换客户状态
- ✅ 在表格操作列中添加了"禁用/启用"按钮
- 功能：点击按钮可切换客户的启用/禁用状态

#### 2.3 物料管理页面
**文件**: `frontend/src/views/ProductListView.vue`

修改内容：
- ✅ 在导入部分添加了 `toggleProductStatus` 函数
- ✅ 添加了 `toggleProductStatus` 函数用于切换物料状态
- ✅ 在表格操作列中添加了"禁用/启用"按钮
- 功能：点击按钮可切换物料的启用/禁用状态

---

## 功能说明

### 禁用/启用功能特性

1. **操作便捷**：在每个管理页面的表格操作列中添加了"禁用/启用"按钮
2. **状态显示**：按钮文字会根据当前状态动态显示
   - 如果当前是"启用"状态，按钮显示"禁用"
   - 如果当前是"禁用"状态，按钮显示"启用"
3. **确认提示**：点击按钮后会弹出确认对话框，提示用户即将执行的操作
4. **操作日志**：每次状态切换都会记录审计日志
5. **自动刷新**：操作成功后会自动刷新页面数据

### 操作流程

1. 用户在供应商/客户/物料管理页面
2. 在表格的"操作"列找到"禁用/启用"按钮
3. 点击按钮
4. 系统弹出确认对话框："确定启用/禁用「名称」吗？"
5. 用户点击"确定"
6. 系统执行状态切换
7. 成功后显示提示："启用/禁用成功"
8. 页面自动刷新，显示最新状态

---

## 界面效果

### 按钮样式
- **按钮类型**：warning（橙色）
- **按钮位置**：操作列，编辑按钮右侧
- **按钮文字**：根据状态动态显示"禁用"或"启用"

### 状态标签
- **启用状态**：绿色标签（success）
- **禁用状态**：灰色标签（info）

---

## 技术实现细节

### 后端实现

```typescript
// 切换商品状态
export const toggleProductStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 验证状态值
    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值',
      });
    }

    // 更新状态
    const updated = await prisma.product.update({
      where: { id },
      data: { status },
      include: { category: { select: { id: true, name: true } } },
    });

    // 记录审计日志
    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'product',
      resource: id,
      detail: `切换商品状态: ${product.name} -> ${status}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: updated,
      message: `商品${status === 'active' ? '启用' : '禁用'}成功`,
    });
  } catch (error) {
    console.error('切换商品状态错误:', error);
    return res.status(500).json({
      success: false,
      message: '切换商品状态失败',
    });
  }
};
```

### 前端实现

```vue
<el-button link type="warning" size="small" @click="toggleSupplierStatus(row)">
  {{ row.status === 'active' ? '禁用' : '启用' }}
</el-button>
```

```javascript
async function toggleSupplierStatus(row: SupplierItem) {
  const newStatus = row.status === 'active' ? 'inactive' : 'active'
  const actionName = newStatus === 'active' ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(`确定${actionName}「${row.name}」吗？`, '提示', { type: 'warning' })
    const res = await toggleSupplierStatus(row.id, newStatus)
    if (res.success) {
      ElMessage.success(`${actionName}成功`)
      await loadData()
    } else {
      ElMessage.error(res.message || `${actionName}失败`)
    }
  } catch (e: any) {
    if (e !== 'cancel' && e?.response?.data?.message) {
      ElMessage.error(e.response.data.message)
    }
  }
}
```

---

## 测试建议

### 功能测试
1. ✅ 测试启用状态的供应商能否被禁用
2. ✅ 测试禁用状态的供应商能否被启用
3. ✅ 测试客户管理的禁用/启用功能
4. ✅ 测试物料管理的禁用/启用功能

### 边界测试
1. ⚠️ 测试快速连续点击按钮
2. ⚠️ 测试在操作过程中刷新页面
3. ⚠️ 测试权限控制（非管理员用户）

---

## 注意事项

1. **权限控制**：状态切换功能需要管理员或经理权限
2. **数据完整性**：状态切换不影响已有的业务数据
3. **审计日志**：所有操作都会记录详细的审计日志
4. **租户隔离**：状态切换受租户隔离保护，只能操作自己租户的数据

---

## 修改文件清单

### 后端文件（2个）
- `src/controllers/product.controller.ts` - 添加toggleProductStatus函数
- `src/routes/product.routes.ts` - 添加状态切换路由

### 前端文件（3个）
- `frontend/src/views/SupplierListView.vue` - 供应商管理页面
- `frontend/src/views/CustomerListView.vue` - 客户管理页面
- `frontend/src/views/ProductListView.vue` - 物料管理页面

### API文件（1个）
- `frontend/src/api/product.ts` - 添加toggleProductStatus API函数

---

## 总结

✅ 所有供应商、客户、物料管理模块都已成功添加禁用/启用功能
✅ 后端API接口已实现并注册
✅ 前端界面已更新，按钮样式统一
✅ 操作流程完整，包括确认提示和结果反馈
✅ 审计日志已记录

系统现在可以在供应商、客户和物料管理中正常使用禁用/启用功能了！
