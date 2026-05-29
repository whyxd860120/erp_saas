<template>
  <div class="sales-order-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">销售管理</h2>
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <el-tab-pane label="销售订单" name="order" />
          <el-tab-pane label="销售出库" name="outbound" />
        </el-tabs>
      </div>
      <div class="header-right">
        <el-button @click="handleImport" v-if="activeTab === 'order'">
          <el-icon><Upload /></el-icon>
          导入
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        <el-button @click="handleHelp">
          <el-icon><QuestionFilled /></el-icon>
          帮助
        </el-button>
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          新增{{ activeTab === 'order' ? '销售订单' : '销售出库' }}
        </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon"><el-icon><Document /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.total }}</span>
            <span class="stat-label">{{ activeTab === 'order' ? '总订单数' : '总出库数' }}</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon pending"><el-icon><Clock /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.pending }}</span>
            <span class="stat-label">待出库</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon amount"><el-icon><Money /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">¥{{ formatAmount(stats.amount) }}</span>
            <span class="stat-label">销售总额</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon receivable"><el-icon><Wallet /></el-icon></div>
          <div class="stat-info">
            <span class="stat-value">¥{{ formatAmount(stats.receivable) }}</span>
            <span class="stat-label">应收未收</span>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 高级搜索 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="5">
            <el-form-item label="单据编号" class="search-item">
              <el-input v-model="searchForm.keyword" placeholder="订单号/客户" clearable style="width: 100%;" @keyup.enter="handleSearch" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="7">
            <el-form-item label="客户" class="search-item">
              <el-select v-model="searchForm.customerId" placeholder="请选择客户" clearable filterable style="width: 100%;" @change="handleSearch">
                <el-option
                  v-for="customer in customers"
                  :key="customer.id"
                  :label="customer.name"
                  :value="customer.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="单据状态" class="search-item">
              <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 100%;" @change="handleSearch">
                <el-option label="草稿" value="draft" />
                <el-option label="已确认" value="confirmed" />
                <el-option label="部分出库" value="partial" />
                <el-option label="已完成" value="completed" />
                <el-option label="已取消" value="cancelled" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-form-item label="日期范围" class="search-item">
              <el-date-picker
                v-model="searchForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="search-actions">
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button link type="primary" @click="showAdvanced = !showAdvanced">
            {{ showAdvanced ? '收起' : '更多' }}条件
          </el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        @selection-change="handleSelectionChange"
        :row-class-name="getRowClassName"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="单据编号" width="180" fixed>
          <template #default="{ row }">
            <el-link type="primary" @click="handleView(row)">{{ row.orderNo }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="客户" min-width="150">
          <template #default="{ row }">
            <div class="customer-info">
              <span class="name">{{ row.customer?.name || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="业务员" width="100">
          <template #default="{ row }">
            {{ row.salesman && row.salesman.name ? row.salesman.name : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="单据日期" width="110">
          <template #default="{ row }">
            {{ formatDate(row.orderDate) }}
          </template>
        </el-table-column>
        <el-table-column label="单据金额" width="120" align="right">
          <template #default="{ row }">
            <span class="amount">¥{{ formatAmount(row.totalAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="已出库" width="100" align="right">
          <template #default="{ row }">
            <span class="amount">¥{{ formatAmount(row.outboundAmount || 0) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="出库进度" width="140">
          <template #default="{ row }">
            <div class="progress-cell">
              <el-progress
                :percentage="getOutboundPercent(row)"
                :stroke-width="6"
                :color="getProgressColor(row)"
              />
              <span class="progress-text">
                {{ formatNumber(row.outboundQuantity || 0) }}/{{ formatNumber(row.totalQuantity || 0) }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="制单人" width="100">
          <template #default="{ row }">
            {{ row.creator && row.creator.name ? row.creator.name : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="关联单据" width="150">
          <template #default="{ row }">
            <div class="relation-links">
              <el-tag v-if="row.outbounds?.length" size="small" type="success">
                出库单 {{ row.outbounds.length }}
              </el-tag>
              <el-tag v-if="row.receipts?.length" size="small" type="warning">
                收款单 {{ row.receipts.length }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="500" fixed="right">
          <template #default="{ row }">
            <el-tag type="primary" size="small" @click="handleView(row)" style="cursor: pointer; margin-right: 4px;">
              查看
            </el-tag>
            <el-tag
              v-if="row.status === 'draft'"
              type="info"
              size="small"
              @click="handleEdit(row)"
              style="cursor: pointer; margin-right: 4px;"
            >
              编辑
            </el-tag>
            <el-tag
              v-if="row.status === 'draft'"
              type="info"
              size="small"
              @click="handleCopy(row)"
              style="cursor: pointer; margin-right: 4px;"
            >
              复制
            </el-tag>
            <el-tag
              v-if="row.status === 'draft'"
              type="success"
              size="small"
              @click="handleConfirm(row)"
              style="cursor: pointer; margin-right: 4px;"
            >
              确认
            </el-tag>
            <el-tag
              v-if="row.status === 'draft'"
              type="danger"
              size="small"
              @click="handleDelete(row)"
              style="cursor: pointer; margin-right: 4px;"
            >
              删除
            </el-tag>
            <el-tag
              v-if="row.status === 'confirmed'"
              type="info"
              size="small"
              @click="handleCopy(row)"
              style="cursor: pointer; margin-right: 4px;"
            >
              复制
            </el-tag>
            <el-tag
              v-if="row.status === 'confirmed'"
              type="warning"
              size="small"
              @click="handleUnconfirm(row)"
              style="cursor: pointer; margin-right: 4px;"
            >
              反确认
            </el-tag>
            <el-tag
              v-if="row.status === 'confirmed' || row.status === 'partial'"
              type="success"
              size="small"
              @click="handleQuickOutbound(row)"
              style="cursor: pointer; margin-right: 4px;"
            >
              快速出库
            </el-tag>
            <el-tag
              v-if="row.status === 'confirmed'"
              type="primary"
              size="small"
              @click="handlePushToPurchase(row)"
              style="cursor: pointer;"
            >
              下推采购
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <div class="batch-actions" v-if="selectedRows.length">
          <span>已选择 {{ selectedRows.length }} 项</span>
          <el-button size="small" @click="handleBatchConfirm" :loading="batchLoading">批量确认</el-button>
          <el-button size="small" type="danger" @click="handleBatchDelete" :loading="batchLoading">批量删除</el-button>
        </div>
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="1000px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <div class="order-form">
        <!-- 单据信息 -->
        <div class="form-section">
          <div class="section-title">
            <el-icon><Document /></el-icon>
            <span>单据信息</span>
          </div>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="单据编号" prop="orderNo">
                <el-input v-model="formData.orderNo" placeholder="自动生成或手动输入" clearable />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="单据日期" prop="orderDate">
                <el-date-picker
                  v-model="formData.orderDate"
                  type="date"
                  placeholder="选择日期"
                  style="width: 100%;"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="客户" prop="customerId">
                <el-select 
                  v-model="formData.customerId" 
                  placeholder="请选择客户" 
                  filterable 
                  remote
                  reserve-keyword
                  :remote-method="searchCustomers"
                  :loading="loading"
                  style="width: 100%;">
                  <el-option
                    v-for="customer in customers"
                    :key="customer.id"
                    :label="customer.name"
                    :value="customer.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="销售员">
                <el-select v-model="formData.salesmanId" placeholder="请选择销售员" clearable filterable style="width: 100%;">
                  <el-option
                    v-for="user in salesmen"
                    :key="user.id"
                    :label="user.name"
                    :value="user.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="收款期限">
                <el-date-picker
                  v-model="formData.dueDate"
                  type="date"
                  placeholder="选择日期"
                  style="width: 100%;"
                  value-format="YYYY-MM-DD"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="24">
              <el-form-item label="备注">
                <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="请输入备注信息" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 物料明细 -->
        <div class="form-section">
          <div class="section-title">
            <el-icon><Goods /></el-icon>
            <span>物料明细</span>
          </div>
          <el-table :data="formData.details" border size="small" show-summary :summary-method="getSummary">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column label="物料" min-width="200">
              <template #default="{ row, $index }">
                <el-select
                  v-model="row.productId"
                  placeholder="请选择物料"
                  filterable
                  remote
                  reserve-keyword
                  :remote-method="searchProducts"
                  :loading="loading"
                  size="small"
                  @change="handleProductSelect($index)"
                  style="width: 100%;"
                >
                  <el-option
                    v-for="product in products"
                    :key="product.id"
                    :label="`${product.code} - ${product.name}`"
                    :value="product.id"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="规格" width="100">
              <template #default="{ row }">
                {{ getProductAttr(row.productId, 'spec') }}
              </template>
            </el-table-column>
            <el-table-column label="单位" width="80">
              <template #default="{ row }">
                {{ getProductAttr(row.productId, 'unit') }}
              </template>
            </el-table-column>
            <el-table-column label="库存" width="90">
              <template #default="{ row }">
                <span :class="getStockClass(row.productId)">
                  {{ getProductAttr(row.productId, 'stock') }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="数量" width="120">
              <template #default="{ row, $index }">
                <el-input-number
                  v-model="row.quantity"
                  :min="1"
                  :precision="0"
                  size="small"
                  @change="handleDetailChange($index)"
                  style="width: 100%;"
                />
              </template>
            </el-table-column>
            <el-table-column label="单价" width="130">
              <template #default="{ row, $index }">
                <el-input-number
                  v-model="row.unitPrice"
                  :min="0"
                  :precision="2"
                  size="small"
                  @change="handleDetailChange($index)"
                  style="width: 100%;"
                />
              </template>
            </el-table-column>
            <el-table-column label="税率(%)" width="100">
              <template #default="{ row, $index }">
                <el-input-number
                  v-model="row.taxRate"
                  :min="0"
                  :max="100"
                  :precision="0"
                  size="small"
                  @change="handleDetailChange($index)"
                  style="width: 100%;"
                />
              </template>
            </el-table-column>
            <el-table-column label="金额" width="120">
              <template #default="{ row }">
                <span class="amount">¥{{ formatAmount(row.amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="60">
              <template #default="{ $index }">
                <el-button type="danger" size="small" link @click="handleRemoveDetail($index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="details-actions">
            <el-button type="primary" size="small" @click="handleAddDetail">
              <el-icon><Plus /></el-icon>
              添加明细
            </el-button>
          </div>
        </div>

        <!-- 费用信息 -->
        <div class="form-section">
          <div class="section-title">
            <el-icon><Wallet /></el-icon>
            <span>费用信息</span>
          </div>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="物料总额">
                <el-input :value="'¥' + formatAmount(formData.goodsAmount)" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="税额">
                <el-input :value="'¥' + formatAmount(formData.taxAmount)" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="折后金额">
                <el-input :value="'¥' + formatAmount(formData.discountAmount)" disabled />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="优惠金额">
                <el-input-number
                  v-model="formData.extraDiscount"
                  :min="0"
                  :precision="2"
                  style="width: 100%;"
                  @change="calculateAmounts"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="订单总额">
                <el-input :value="'¥' + formatAmount(formData.totalAmount)" disabled class="total-amount" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button @click="handleSaveDraft" :loading="submitLoading">保存草稿</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确认单据</el-button>
      </template>
    </el-dialog>

    <!-- 快速出库对话框 -->
    <el-dialog v-model="quickOutboundDialogVisible" title="快速出库" width="900px">
      <el-form :model="quickOutboundForm" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="订单编号">
              <el-input v-model="quickOutboundForm.orderNo" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出库仓库" required>
              <el-select v-model="quickOutboundForm.warehouseId" placeholder="请选择仓库" style="width: 100%;">
                <el-option
                  v-for="warehouse in warehouses"
                  :key="warehouse.id"
                  :label="warehouse.name"
                  :value="warehouse.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="出库日期">
              <el-date-picker
                v-model="quickOutboundForm.outboundDate"
                type="date"
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出库方式">
              <el-radio-group v-model="quickOutboundForm.outboundType">
                <el-radio value="all">整单出库</el-radio>
                <el-radio value="partial">部分出库</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      
      <!-- 物料明细 -->
      <div class="quick-outbound-details">
        <div class="detail-header">
          <span>物料明细</span>
          <el-button size="small" @click="handleSelectAllOutbound">全选</el-button>
        </div>
        <el-table :data="quickOutboundForm.details" border size="small" max-height="300">
          <el-table-column type="selection" width="50" :selectable="(row: any) => row.canOutbound > 0" />
          <el-table-column prop="product.code" label="物料编码" width="120" />
          <el-table-column prop="product.name" label="物料名称" min-width="150" />
          <el-table-column prop="product.spec" label="规格" width="100" />
          <el-table-column prop="product.unit" label="单位" width="60" />
          <el-table-column prop="orderQuantity" label="订单数量" width="80" align="right" />
          <el-table-column prop="outboundQuantity" label="已出库数量" width="90" align="right" />
          <el-table-column prop="canOutbound" label="可出库数量" width="90" align="right" />
          <el-table-column label="本次出库数量" width="120" align="right">
            <template #default="{ row }">
              <el-input-number
                v-model="row.quantity"
                :min="0"
                :max="row.canOutbound"
                :disabled="quickOutboundForm.outboundType === 'all'"
                size="small"
                style="width: 100%;"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <template #footer>
        <el-button @click="quickOutboundDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmQuickOutbound" :loading="quickOutboundLoading">确认出库</el-button>
      </template>
    </el-dialog>

    <!-- 下推采购对话框 -->
    <el-dialog v-model="pushPurchaseDialogVisible" title="下推采购订单" width="1000px">
      <el-form :model="pushPurchaseForm" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="销售订单">
              <el-input v-model="pushPurchaseForm.orderNo" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商" required>
              <el-select v-model="pushPurchaseForm.supplierId" placeholder="请选择供应商" style="width: 100%;">
                <el-option
                  v-for="supplier in suppliers"
                  :key="supplier.id"
                  :label="supplier.name"
                  :value="supplier.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="采购日期">
              <el-date-picker
                v-model="pushPurchaseForm.purchaseDate"
                type="date"
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      
      <!-- 物料明细 -->
      <div class="push-purchase-details">
        <div class="detail-header">
          <span>物料明细（考虑可用库存）</span>
          <el-button size="small" @click="handleMaxUseStock">最大限度使用库存</el-button>
        </div>
        <el-table :data="pushPurchaseForm.details" border size="small" max-height="400">
          <el-table-column prop="product.code" label="物料编码" width="120" />
          <el-table-column prop="product.name" label="物料名称" min-width="150" />
          <el-table-column prop="product.spec" label="规格" width="100" />
          <el-table-column prop="product.unit" label="单位" width="60" />
          <el-table-column prop="orderQuantity" label="销售数量" width="80" align="right" />
          <el-table-column prop="availableStock" label="可用库存" width="90" align="right">
            <template #default="{ row }">
              <span :class="row.availableStock > 0 ? 'stock-normal' : 'stock-low'">
                {{ formatNumber(row.availableStock) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="使用库存" width="120" align="right">
            <template #default="{ row }">
              <el-input-number
                v-model="row.useStock"
                :min="0"
                :max="Math.min(row.availableStock, row.orderQuantity)"
                size="small"
                style="width: 100%;"
                @change="calculatePurchaseQuantity(row)"
              />
            </template>
          </el-table-column>
          <el-table-column label="采购数量" width="120" align="right">
            <template #default="{ row }">
              <span class="purchase-quantity">{{ formatNumber(row.purchaseQuantity) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="采购单价" width="120" align="right">
            <template #default="{ row }">
              <el-input-number
                v-model="row.purchasePrice"
                :min="0"
                :precision="2"
                size="small"
                style="width: 100%;"
              />
            </template>
          </el-table-column>
          <el-table-column label="采购金额" width="120" align="right">
            <template #default="{ row }">
              <span class="amount">¥{{ formatAmount(row.purchaseQuantity * row.purchasePrice) }}</span>
            </template>
          </el-table-column>
        </el-table>
        <div class="purchase-summary">
          <span>采购物料数：{{ pushPurchaseForm.details.filter(d => d.purchaseQuantity > 0).length }}</span>
          <span>采购总额：¥{{ formatAmount(pushPurchaseForm.details.reduce((sum, d) => sum + d.purchaseQuantity * d.purchasePrice, 0)) }}</span>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="pushPurchaseDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmPushPurchase" :loading="pushPurchaseLoading">确认生成采购订单</el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-drawer v-model="viewDrawer" title="单据详情" size="800px">
      <div class="order-detail" v-if="currentOrder">
        <!-- 单据信息 -->
        <div class="detail-section">
          <h4>单据信息</h4>
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="单据编号">{{ currentOrder.orderNo }}</el-descriptions-item>
            <el-descriptions-item label="单据日期">{{ formatDate(currentOrder.orderDate) }}</el-descriptions-item>
            <el-descriptions-item label="单据状态">
              <el-tag :type="getStatusType(currentOrder.status)" size="small">
                {{ getStatusText(currentOrder.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="客户">{{ currentOrder.customer?.name }}</el-descriptions-item>
            <el-descriptions-item label="销售员">{{ currentOrder.salesman?.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="制单人">{{ currentOrder.creator?.name }}</el-descriptions-item>
            <el-descriptions-item label="制单时间">{{ formatDateTime(currentOrder.createdAt) }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 物料明细 -->
        <div class="detail-section">
          <h4>物料明细</h4>
          <el-table :data="currentOrder.items" border size="small">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="product.code" label="物料编码" width="120" />
            <el-table-column prop="product.name" label="物料名称" min-width="150" />
            <el-table-column prop="product.spec" label="规格" width="100" />
            <el-table-column prop="product.unit" label="单位" width="60" />
            <el-table-column prop="quantity" label="数量" width="80" align="right" />
            <el-table-column prop="unitPrice" label="单价" width="100" align="right">
              <template #default="{ row }">¥{{ formatAmount(row.unitPrice) }}</template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="120" align="right">
              <template #default="{ row }">¥{{ formatAmount(row.amount) }}</template>
            </el-table-column>
          </el-table>
          <div class="detail-summary">
            <span>物料总额：¥{{ formatAmount(currentOrder.goodsAmount) }}</span>
            <span>税额：¥{{ formatAmount(currentOrder.taxAmount) }}</span>
            <span>优惠：¥{{ formatAmount(currentOrder.extraDiscount || 0) }}</span>
            <span class="total">单据总额：¥{{ formatAmount(currentOrder.totalAmount) }}</span>
          </div>
        </div>

        <!-- 关联单据 -->
        <div class="detail-section" v-if="currentOrder.outbounds?.length || currentOrder.receipts?.length">
          <h4>关联单据</h4>
          <el-tabs>
            <el-tab-pane label="出库单" v-if="currentOrder.outbounds?.length">
              <el-table :data="currentOrder.outbounds" border size="small">
                <el-table-column prop="outboundNo" label="出库单号" width="150" />
                <el-table-column prop="outboundDate" label="出库日期" width="120" />
                <el-table-column prop="quantity" label="出库数量" width="100" align="right" />
                <el-table-column label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.status === 'completed' ? 'success' : 'warning'" size="small">
                      {{ row.status === 'completed' ? '已完成' : '进行中' }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="收款单" v-if="currentOrder.receipts?.length">
              <el-table :data="currentOrder.receipts" border size="small">
                <el-table-column prop="receiptNo" label="收款单号" width="150" />
                <el-table-column prop="receiptDate" label="收款日期" width="120" />
                <el-table-column label="收款金额" width="120" align="right">
                  <template #default="{ row }">¥{{ formatAmount(row.amount) }}</template>
                </el-table-column>
                <el-table-column label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.status === 'confirmed' ? 'success' : 'info'" size="small">
                      {{ row.status === 'confirmed' ? '已确认' : '草稿' }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </div>

        <!-- 操作日志 -->
        <div class="detail-section">
          <h4>操作记录</h4>
          <el-timeline size="small">
            <el-timeline-item
              v-for="log in currentOrder.logs || []"
              :key="log.id"
              :timestamp="formatDateTime(log.createdAt)"
              :type="log.action === 'create' ? 'primary' : ''"
            >
              <p>{{ log.actionText }} - {{ log.operator?.name || '系统' }}</p>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-drawer>

    <!-- 导入对话框 -->
    <CommonImportDialog
      v-model="importDialogVisible"
      title="销售订单"
      :columns="importColumns"
      :format-tips="importFormatTips"
      :import-fn="handleImportSubmit"
      @success="handleImportSuccess"
    />

    <!-- 帮助对话框 -->
    <CommonHelpDialog
      v-model="helpDialogVisible"
      :module-name="activeTab === 'order' ? '销售订单' : '销售出库'"
      :help-data="helpData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Download, Document, Clock, Money, Wallet, Goods, Delete,
  ArrowDown, Upload
} from '@element-plus/icons-vue'
import { getSalesOrders, getSalesOrderById, createSalesOrder,
  updateSalesOrder, confirmSalesOrder, unconfirmSalesOrder, deleteSalesOrder, importSalesOrders
} from '@/api/sales-order'
import { createSalesOutbound } from '@/api/sales-outbound'
import { createPurchaseOrder, getPurchaseOrders } from '@/api/purchase-order'
import { getInventory } from '@/api/inventory'
import { getWarehouses } from '@/api/warehouse'
import { getCustomers } from '@/api/customer'
import { getProducts } from '@/api/product'
import { getUsers } from '@/api/user'
import { getSuppliers } from '@/api/supplier'
import { getStatusColor, getSalesOrderStatusText } from '@/utils/status.util'
import CommonImportDialog from '@/components/CommonImportDialog.vue'
import CommonHelpDialog from '@/components/CommonHelpDialog.vue'

// 状态
const loading = ref(false)
const batchLoading = ref(false)
const submitLoading = ref(false)
const activeTab = ref('order')
const showAdvanced = ref(false)
const selectedRows = ref<any[]>([])
const viewDrawer = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('新增销售订单')
const isEdit = ref(false)
const currentOrder = ref<any>(null)
const importDialogVisible = ref(false)
const helpDialogVisible = ref(false)

// 数据
const tableData = ref<any[]>([])
const customers = ref<any[]>([])
const products = ref<any[]>([])
const salesmen = ref<any[]>([])
const warehouses = ref<any[]>([])
const suppliers = ref<any[]>([])

// 快速出库
const quickOutboundDialogVisible = ref(false)
const quickOutboundLoading = ref(false)
const quickOutboundForm = reactive({
  orderId: '',
  orderNo: '',
  warehouseId: '',
  outboundDate: new Date().toISOString().split('T')[0],
  outboundType: 'all',
  details: [] as any[]
})

// 下推采购
const pushPurchaseDialogVisible = ref(false)
const pushPurchaseLoading = ref(false)
const pushPurchaseForm = reactive({
  orderId: '',
  orderNo: '',
  supplierId: '',
  purchaseDate: new Date().toISOString().split('T')[0],
  details: [] as any[]
})

// 导入配置
const importColumns = [
  { prop: 'orderNo', label: '订单单号', required: true },
  { prop: 'orderDate', label: '订单日期', required: true },
  { prop: 'customerName', label: '客户名称', required: true },
  { prop: 'salesmanName', label: '业务员' },
  { prop: 'productCode', label: '物料编码', required: true },
  { prop: 'productName', label: '物料名称', required: true },
  { prop: 'productSpec', label: '物料规格' },
  { prop: 'quantity', label: '数量', required: true },
  { prop: 'unitPrice', label: '单价' },
  { prop: 'remark', label: '备注' }
]

const importFormatTips = [
  '订单单号：必填，唯一标识，不可重复',
  '订单日期：必填，格式：YYYY-MM-DD',
  '客户名称：必填，填写客户名称',
  '物料编码：必填，填写物料编码',
  '物料名称：必填，填写物料名称',
  '物料规格：选填，填写物料规格',
  '数量：必填，数字格式',
  '单价：选填，数字格式',
  '备注：选填'
]

// 统计
const stats = ref({
  total: 0,
  pending: 0,
  amount: 0,
  receivable: 0
})

// 搜索表单
const searchForm = reactive({
  keyword: '',
  customerId: '',
  status: '',
  dateRange: []
})

// 分页
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 表单数据
const formData = reactive({
  id: '',
  orderNo: '',
  orderDate: new Date().toISOString().split('T')[0],
  customerId: '',
  salesmanId: '',
  dueDate: '',
  remark: '',
  extraDiscount: 0,
  details: [] as any[],
  goodsAmount: 0,
  taxAmount: 0,
  discountAmount: 0,
  totalAmount: 0
})

// 计算金额
const calculateAmounts = () => {
  let goodsAmount = 0
  let taxAmount = 0
  formData.details.forEach(detail => {
    const amount = Number((detail.quantity || 0) * (detail.unitPrice || 0))
    const tax = Number(amount * ((detail.taxRate || 0) / 100))
    goodsAmount += amount
    taxAmount += tax
  })
  formData.goodsAmount = Number(goodsAmount)
  formData.taxAmount = Number(taxAmount)
  formData.discountAmount = Number(goodsAmount + taxAmount)
  formData.totalAmount = Number(formData.discountAmount - formData.extraDiscount)
}

// 获取物料属性
const getProductAttr = (productId: string, attr: string) => {
  const product = products.value.find(p => p.id === productId)
  return product ? product[attr] || '-' : '-'
}

// 获取库存样式
const getStockClass = (productId: string) => {
  const product = products.value.find(p => p.id === productId)
  if (!product || product.stock <= 0) return 'stock-low'
  if (product.stock < product.minStock) return 'stock-warning'
  return ''
}

// 格式化金额
const formatAmount = (amount: any) => {
  if (amount === undefined || amount === null) return '0.00'
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount)
  if (isNaN(numAmount)) return '0.00'
  return numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 格式化数字（整数）
const formatNumber = (num: any) => {
  if (num === undefined || num === null) return '0'
  const numValue = typeof num === 'string' ? parseFloat(num) : Number(num)
  if (isNaN(numValue)) return '0'
  return numValue.toFixed(0)
}

// 格式化日期
const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

// 格式化日期时间
const formatDateTime = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// 获取状态类型
const getStatusType = (status: string) => {
  return getStatusColor(status)
}

// 获取状态文本
const getStatusText = (status: string) => {
  return getSalesOrderStatusText(status)
}

// 获取出库进度
const getOutboundPercent = (row: any) => {
  const totalQuantity = row.totalQuantity ? parseFloat(row.totalQuantity.toString()) : 0
  const outboundQuantity = row.outboundQuantity ? parseFloat(row.outboundQuantity.toString()) : 0
  if (!totalQuantity || totalQuantity === 0) return 0
  return Math.round((outboundQuantity / totalQuantity) * 100)
}

// 获取进度条颜色
const getProgressColor = (row: any) => {
  const percent = getOutboundPercent(row)
  if (percent >= 100) return '#67C23A'
  if (percent >= 50) return '#E6A23C'
  return '#909399'
}

// 获取行样式
const getRowClassName = ({ row }: { row: any }) => {
  if (row.status === 'cancelled') return 'cancelled-row'
  return ''
}

// 获取汇总数据
const getSummary = () => {
  calculateAmounts()
  return [
    '', '', '', '', '',
    '合计',
    '', '',
    '¥' + formatAmount(formData.goodsAmount),
    ''
  ]
}

// 获取数据
const fetchData = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      keyword: searchForm.keyword,
      customerId: searchForm.customerId,
      status: searchForm.status,
      startDate: searchForm.dateRange?.[0],
      endDate: searchForm.dateRange?.[1]
    }
    const response: any = await getSalesOrders(params)
    if (response.success) {
      tableData.value = response.data.items || []
      pagination.total = response.data.total
      // 模拟统计数据
      stats.value = {
        total: response.data.total,
        pending: tableData.value.filter(t => t.status === 'confirmed' || t.status === 'partial').length,
        amount: tableData.value.reduce((sum: number, t: any) => {
          const amount = t.totalAmount ? parseFloat(t.totalAmount.toString()) : 0
          return sum + amount
        }, 0),
        receivable: tableData.value.reduce((sum: number, t: any) => {
          const totalAmount = t.totalAmount ? parseFloat(t.totalAmount.toString()) : 0
          const paidAmount = t.paidAmount ? parseFloat(t.paidAmount.toString()) : 0
          return sum + (totalAmount - paidAmount)
        }, 0)
      }
    }
  } catch (error) {
    console.error('获取数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取客户
const fetchCustomers = async () => {
  try {
    const response: any = await getCustomers({ page: 1, limit: 100 })
    if (response.success) {
      customers.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取客户失败:', error)
  }
}

// 远程搜索客户
const searchCustomers = async (keyword: string) => {
  try {
    const response: any = await getCustomers({ page: 1, limit: 100, search: keyword })
    if (response.success) {
      customers.value = response.data.items || []
    }
  } catch (error) {
    console.error('搜索客户失败:', error)
  }
}

// 获取仓库
const fetchWarehouses = async () => {
  try {
    const response: any = await getWarehouses({ page: 1, limit: 100 })
    if (response.success) {
      warehouses.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取仓库失败:', error)
  }
}

// 获取供应商
const fetchSuppliers = async () => {
  try {
    const response: any = await getSuppliers({ page: 1, limit: 100, status: '' })
    if (response.success) {
      suppliers.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取供应商失败:', error)
  }
}

// 远程搜索供应商
const searchSuppliers = async (keyword: string) => {
  try {
    const response: any = await getSuppliers({ page: 1, limit: 100, status: '', search: keyword })
    if (response.success) {
      suppliers.value = response.data.items || []
    }
  } catch (error) {
    console.error('搜索供应商失败:', error)
  }
}

// 获取物料
const fetchProducts = async () => {
  try {
    const response: any = await getProducts({ page: 1, limit: 100, status: '' })
    if (response.success) {
      products.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取物料失败:', error)
  }
}

// 远程搜索物料
const searchProducts = async (keyword: string) => {
  try {
    const response: any = await getProducts({ page: 1, limit: 100, status: '', search: keyword })
    if (response.success) {
      products.value = response.data.items || []
    }
  } catch (error) {
    console.error('搜索物料失败:', error)
  }
}

// 获取用户
const fetchSalesmen = async () => {
  try {
    const response: any = await getUsers({ page: 1, limit: 1000, status: 'active' })
    if (response.success) {
      salesmen.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取用户失败:', error)
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

// 重置
const handleReset = () => {
  searchForm.keyword = ''
  searchForm.customerId = ''
  searchForm.status = ''
  searchForm.dateRange = []
  pagination.page = 1
  fetchData()
}

// Tab切换
const handleTabChange = () => {
  handleReset()
}

// 选中行
const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

// 新增
const handleCreate = async () => {
  dialogTitle.value = '新增销售订单'
  isEdit.value = false
  resetForm()
  addDefaultDetail()
  
  // 按需加载数据，确保必要数据已加载
  if (!customers.value.length) {
    await fetchCustomers()
  }
  if (!products.value.length) {
    await fetchProducts()
  }
  if (!salesmen.value.length) {
    await fetchSalesmen()
  }
  if (!warehouses.value.length) {
    await fetchWarehouses()
  }
  
  dialogVisible.value = true
}

// 编辑
const handleEdit = async (row: any) => {
  dialogTitle.value = '编辑销售订单'
  isEdit.value = true
  try {
    const response: any = await getSalesOrderById(row.id)
    if (response.success) {
      const order = response.data
      Object.assign(formData, {
        id: order.id,
        orderNo: order.orderNo,
        orderDate: order.orderDate?.split('T')[0],
        customerId: order.customerId,
        salesmanId: order.salesmanId || '',
        dueDate: order.dueDate || '',
        remark: order.remark || '',
        extraDiscount: order.extraDiscount || 0,
        details: order.items?.map((d: any) => ({
          id: d.id,
          productId: d.productId,
          quantity: Number(d.quantity) || 0,
          unitPrice: Number(d.unitPrice) || 0,
          taxRate: Number(d.taxRate) || 0,
          amount: Number(d.amount) || 0
        })) || []
      })
      calculateAmounts()
      dialogVisible.value = true
    }
  } catch (error) {
    console.error('获取详情失败:', error)
  }
}

// 查看
const handleView = async (row: any) => {
  try {
    const response: any = await getSalesOrderById(row.id)
    if (response.success) {
      currentOrder.value = response.data
      viewDrawer.value = true
    }
  } catch (error) {
    console.error('获取详情失败:', error)
  }
}

// 复制
const handleCopy = async (row: any) => {
  await handleEdit(row)
  isEdit.value = false
  formData.id = ''
  formData.orderNo = ''
  dialogTitle.value = '复制销售订单'
}

// 确认
const handleConfirm = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要确认销售订单 "${row.orderNo}" 吗？`, '确认', { type: 'warning' })
    await confirmSalesOrder(row.id)
    ElMessage.success('确认成功')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('确认失败')
    }
  }
}

// 反确认
const handleUnconfirm = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要反确认销售订单 "${row.orderNo}" 吗？反确认后订单将回到草稿状态。`, '确认反确认', { type: 'warning' })
    await unconfirmSalesOrder(row.id)
    ElMessage.success('反确认成功')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('反确认失败')
    }
  }
}

// 删除
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除销售订单 "${row.orderNo}" 吗？`, '确认删除', { type: 'warning' })
    await deleteSalesOrder(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 快速出库
const handleQuickOutbound = (row: any) => {
  // 获取订单详情
  getSalesOrderById(row.id).then((response: any) => {
    if (response.success) {
      const order = response.data
      quickOutboundForm.orderId = order.id
      quickOutboundForm.orderNo = order.orderNo
      quickOutboundForm.warehouseId = ''
      quickOutboundForm.outboundDate = new Date().toISOString().split('T')[0]
      quickOutboundForm.outboundType = 'all'
      
      // 构建出库明细
      quickOutboundForm.details = order.items.map((item: any) => {
        const orderQuantity = Number(item.quantity) || 0
        const outboundQuantity = Number(item.outboundQuantity) || 0
        const canOutbound = orderQuantity - outboundQuantity
        
        return {
          id: item.id,
          productId: item.productId,
          product: item.product,
          orderQuantity,
          outboundQuantity,
          canOutbound,
          quantity: canOutbound > 0 ? canOutbound : 0,
          unitPrice: Number(item.unitPrice) || 0
        }
      })
      
      quickOutboundDialogVisible.value = true
    }
  })
}

// 全选出库明细
const handleSelectAllOutbound = () => {
  quickOutboundForm.details.forEach(detail => {
    if (detail.canOutbound > 0) {
      detail.quantity = detail.canOutbound
    }
  })
}

// 下推采购订单
const handlePushToPurchase = async (row: any) => {
  try {
    // 获取订单详情
    const response: any = await getSalesOrderById(row.id)
    if (response.success) {
      const order = response.data
      pushPurchaseForm.orderId = order.id
      pushPurchaseForm.orderNo = order.orderNo
      pushPurchaseForm.supplierId = ''
      pushPurchaseForm.purchaseDate = new Date().toISOString().split('T')[0]
      
      // 获取所有仓库的库存信息
      const inventoryResponse: any = await getInventory({ page: 1, limit: 10000 })
      const inventoryMap = new Map<string, any>()
      
      if (inventoryResponse.success && inventoryResponse.data.items) {
        inventoryResponse.data.items.forEach((inv: any) => {
          const availableStock = inv.quantity + (inv.purchaseInTransit || 0) - (inv.salesInTransit || 0)
          inventoryMap.set(inv.productId, availableStock)
        })
      }
      
      // 构建采购明细
      pushPurchaseForm.details = order.items.map((item: any) => {
        const orderQuantity = Number(item.quantity) || 0
        const availableStock = inventoryMap.get(item.productId) || 0
        
        return {
          id: item.id,
          productId: item.productId,
          product: item.product,
          orderQuantity,
          availableStock,
          useStock: 0,
          purchaseQuantity: orderQuantity,
          purchasePrice: 0
        }
      })
      
      pushPurchaseDialogVisible.value = true
    }
  } catch (error) {
    console.error('获取订单详情失败:', error)
    ElMessage.error('获取订单详情失败')
  }
}

// 最大限度使用库存
const handleMaxUseStock = () => {
  pushPurchaseForm.details.forEach(detail => {
    const maxUse = Math.min(detail.availableStock, detail.orderQuantity)
    detail.useStock = maxUse
    calculatePurchaseQuantity(detail)
  })
}

// 计算采购数量
const calculatePurchaseQuantity = (row: any) => {
  row.purchaseQuantity = Math.max(0, row.orderQuantity - row.useStock)
}

// 确认下推采购
const handleConfirmPushPurchase = async () => {
  if (!pushPurchaseForm.supplierId) {
    ElMessage.warning('请选择供应商')
    return
  }

  // 检查是否有采购数量
  const hasPurchaseQuantity = pushPurchaseForm.details.some(d => d.purchaseQuantity > 0)
  if (!hasPurchaseQuantity) {
    ElMessage.warning('请设置采购数量')
    return
  }

  try {
    pushPurchaseLoading.value = true

    // 构建采购订单明细（只包含有采购数量的物料）
    const details = pushPurchaseForm.details
      .filter(d => d.purchaseQuantity > 0)
      .map(item => ({
        productId: item.productId,
        quantity: Number(item.purchaseQuantity) || 0,
        unitPrice: Number(item.purchasePrice) || 0
      }))

    // 生成采购订单编号
    const orderNo = `PO${Date.now()}${Math.floor(Math.random() * 1000)}`

    // 创建采购订单
    await createPurchaseOrder({
      orderNo,
      supplierId: pushPurchaseForm.supplierId,
      orderDate: pushPurchaseForm.purchaseDate,
      items: details,
      remark: `由销售订单 ${pushPurchaseForm.orderNo} 下推生成`
    })

    ElMessage.success('采购订单生成成功')
    pushPurchaseDialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('生成采购订单失败:', error)
    ElMessage.error('生成采购订单失败')
  } finally {
    pushPurchaseLoading.value = false
  }
}

// 确认快速出库
const handleConfirmQuickOutbound = async () => {
  if (!quickOutboundForm.warehouseId) {
    ElMessage.warning('请选择出库仓库')
    return
  }

  // 检查是否有出库数量
  const hasOutboundQuantity = quickOutboundForm.details.some(d => d.quantity > 0)
  if (!hasOutboundQuantity) {
    ElMessage.warning('请设置出库数量')
    return
  }

  try {
    quickOutboundLoading.value = true

    // 构建出库单明细（只包含有出库数量的物料）
    const details = quickOutboundForm.details
      .filter(d => d.quantity > 0)
      .map(item => ({
        productId: item.productId,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0
      }))

    // 创建出库单
    await createSalesOutbound({
      orderId: quickOutboundForm.orderId,
      warehouseId: quickOutboundForm.warehouseId,
      outboundDate: quickOutboundForm.outboundDate,
      remark: quickOutboundForm.outboundType === 'all' 
        ? `由订单 ${quickOutboundForm.orderNo} 整单出库`
        : `由订单 ${quickOutboundForm.orderNo} 部分出库`,
      details
    })

    ElMessage.success('快速出库成功')
    quickOutboundDialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('快速出库失败:', error)
    ElMessage.error('快速出库失败')
  } finally {
    quickOutboundLoading.value = false
  }
}

// 批量确认
const handleBatchConfirm = async () => {
  if (!selectedRows.value.length) return
  try {
    await ElMessageBox.confirm(`确定要确认选中的 ${selectedRows.value.length} 个订单吗？`, '批量确认', { type: 'warning' })
    batchLoading.value = true
    ElMessage.success('批量确认成功')
    selectedRows.value = []
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('批量确认失败')
    }
  } finally {
    batchLoading.value = false
  }
}

// 批量删除
const handleBatchDelete = async () => {
  if (!selectedRows.value.length) return
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 个订单吗？`, '批量删除', { type: 'warning' })
    batchLoading.value = true
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  } finally {
    batchLoading.value = false
  }
}

// 导出
const handleExport = () => {
  ElMessage.info('导出功能开发中')
}

// 导入
const handleImport = () => {
  importDialogVisible.value = true
}

const handleImportSubmit = async (data: any[]) => {
  const customerMap = new Map<string, string>()
  const productMap = new Map<string, string>()
  const salesmanMap = new Map<string, string>()

  // 获取所有客户数据用于导入验证
  try {
    const response: any = await getCustomers({ page: 1, limit: 10000, status: '' })
    if (response.success) {
      const allCustomers = response.data.items || []
      allCustomers.forEach(c => customerMap.set(c.name, c.id))
    }
  } catch (error) {
    console.error('获取客户列表失败:', error)
  }

  salesmen.value.forEach(s => salesmanMap.set(s.name, s.id))

  // 获取所有物料数据用于导入验证
  try {
    const response: any = await getProducts({ page: 1, limit: 10000, status: '' })
    if (response.success) {
      const allProducts = response.data.items || []
      allProducts.forEach(p => productMap.set(p.code, p.id))
    }
  } catch (error) {
    console.error('获取物料列表失败:', error)
  }

  const processedData = data.map(item => {
    const newItem: any = { ...item }

    if (item.customerName && customerMap.has(item.customerName)) {
      newItem.customerId = customerMap.get(item.customerName)
      delete newItem.customerName
    } else if (item.customerName) {
      newItem.customerError = `客户 "${item.customerName}" 不存在`
    }

    if (item.salesmanName && salesmanMap.has(item.salesmanName)) {
      newItem.salesmanId = salesmanMap.get(item.salesmanName)
      delete newItem.salesmanName
    } else if (item.salesmanName) {
      newItem.salesmanError = `业务员 "${item.salesmanName}" 不存在`
    }

    if (item.productCode && productMap.has(item.productCode)) {
      newItem.productId = productMap.get(item.productCode)
      delete newItem.productCode
    } else if (item.productCode) {
      newItem.productError = `物料编码 "${item.productCode}" 不存在`
    }

    return newItem
  })

  const result: any = await importSalesOrders(processedData)
  return result
}

const handleImportSuccess = () => {
  fetchData()
}

// 添加明细
const handleAddDetail = () => {
  formData.details.push({
    productId: '',
    quantity: 1,
    unitPrice: 0,
    taxRate: 0,
    amount: 0
  })
}

// 添加默认明细
const addDefaultDetail = () => {
  formData.details = [{ productId: '', quantity: 1, unitPrice: 0, taxRate: 0, amount: 0 }]
}

// 删除明细
const handleRemoveDetail = (index: number) => {
  formData.details.splice(index, 1)
  calculateAmounts()
}

// 物料选择
const handleProductSelect = (index: number) => {
  const detail = formData.details[index]
  const product = products.value.find(p => p.id === detail.productId)
  if (product) {
    detail.unitPrice = Number(product.salePrice) || 0
  }
  handleDetailChange(index)
}

// 明细变更
const handleDetailChange = (index: number) => {
  const detail = formData.details[index]
  detail.amount = Number((detail.quantity || 0) * (detail.unitPrice || 0))
  calculateAmounts()
}

// 保存草稿
const handleSaveDraft = async () => {
  await submitOrder(false)
}

// 提交
const handleSubmit = async () => {
  await submitOrder(true)
}

// 提交订单
const submitOrder = async (confirmed: boolean) => {
  if (!formData.customerId) {
    ElMessage.warning('请选择客户')
    return
  }
  if (!formData.details.length) {
    ElMessage.warning('请添加物料明细')
    return
  }

  try {
    submitLoading.value = true
    console.log('提交数据:', formData)
    const submitData = {
      customerId: formData.customerId,
      salesmanId: formData.salesmanId,
      orderDate: formData.orderDate,
      dueDate: formData.dueDate,
      remark: formData.remark,
      extraDiscount: Number(formData.extraDiscount) || 0,
      items: formData.details.map(d => ({
        productId: d.productId,
        quantity: Number(d.quantity) || 0,
        unitPrice: Number(d.unitPrice) || 0,
        taxRate: Number(d.taxRate) || 0,
        amount: Number(d.amount) || 0
      }))
    }
    console.log('提交到后端的数据:', submitData)

    if (isEdit.value) {
      await updateSalesOrder(formData.id, submitData)
    } else {
      await createSalesOrder(submitData)
    }

    ElMessage.success(confirmed ? '提交成功' : '保存成功')
    dialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error('提交失败:', error)
    console.error('错误详情:', (error as any).response?.data || (error as any).message)
    ElMessage.error((error as any).response?.data?.message || '提交失败')
  } finally {
    submitLoading.value = false
  }
}

// 重置表单
const resetForm = () => {
  formData.id = ''
  formData.orderNo = ''
  formData.orderDate = new Date().toISOString().split('T')[0]
  formData.customerId = ''
  formData.salesmanId = ''
  formData.dueDate = ''
  formData.remark = ''
  formData.extraDiscount = 0
  formData.details = []
  formData.goodsAmount = 0
  formData.taxAmount = 0
  formData.discountAmount = 0
  formData.totalAmount = 0
}

// 监听客户选择，自动带入专属业务员
watch(() => formData.customerId, (newCustomerId) => {
  if (newCustomerId) {
    const selectedCustomer = customers.value.find(c => c.id === newCustomerId)
    if (selectedCustomer?.salesmanId) {
      formData.salesmanId = selectedCustomer.salesmanId
    } else if (selectedCustomer?.user?.id) {
      formData.salesmanId = selectedCustomer.user.id
    }
  }
})

// 关闭对话框
const handleDialogClose = () => {
  resetForm()
}

// 分页
const handleSizeChange = (val: number) => {
  pagination.limit = val
  pagination.page = 1
  fetchData()
}

const handleCurrentChange = (val: number) => {
  pagination.page = val
  fetchData()
}

// 初始化
onMounted(async () => {
  // 只加载列表数据，其他数据按需加载
  await fetchData()
})

// 帮助数据
const helpData = computed(() => {
  if (activeTab.value === 'order') {
    return {
      operations: [
        {
          title: '新增销售订单',
          steps: [
            '点击"新增销售订单"按钮',
            '选择客户和销售员',
            '添加物料明细，选择物料、输入数量和单价',
            '设置订单日期、到期日期等基本信息',
            '点击"保存草稿"保存订单，或点击"提交"直接确认订单'
          ]
        },
        {
          title: '确认订单',
          steps: [
            '在订单列表中找到草稿状态的订单',
            '点击操作列中的"确认"按钮',
            '确认后订单状态变为"已确认"，可以进行出库操作'
          ]
        },
        {
          title: '快速出库',
          steps: [
            '在已确认的订单上点击"快速出库"按钮',
            '选择出库仓库和出库方式（整单出库或部分出库）',
            '如果是部分出库，选择需要出库的物料明细',
            '点击"确认出库"生成销售出库单'
          ]
        },
        {
          title: '下推采购订单',
          steps: [
            '在已确认的订单上点击"下推采购"按钮',
            '选择供应商和采购日期',
            '查看可用库存，设置使用库存数量',
            '设置采购单价',
            '点击"确认生成采购订单"'
          ]
        },
        {
          title: '复制订单',
          steps: [
            '在订单上点击"复制"按钮',
            '系统自动复制订单信息',
            '修改需要调整的内容',
            '保存或提交新订单'
          ]
        }
      ],
      notices: [
        '只有草稿状态的订单可以编辑和删除',
        '已确认的订单不能直接修改，需要先反确认',
        '订单确认后才能进行出库操作',
        '下推采购订单会考虑可用库存，避免重复采购',
        '删除订单会同时删除相关的出库单和收款单'
      ],
      tips: [
        '可以使用快捷键 Ctrl+N 快速新增订单',
        '支持批量操作：批量确认、批量删除',
        '订单编号系统自动生成，支持自定义编号规则',
        '可以导入Excel批量创建订单',
        '支持按客户、状态、日期等条件筛选订单'
      ],
      shortcuts: [
        { key: 'Ctrl+N', description: '新增订单' },
        { key: 'Ctrl+S', description: '保存草稿' },
        { key: 'Ctrl+Enter', description: '提交订单' },
        { key: 'F5', description: '刷新列表' }
      ],
      version: '1.0.0',
      lastUpdate: '2025-05-28',
      changes: [
        '新增下推采购订单功能',
        '优化库存计算逻辑',
        '增加复制订单功能'
      ]
    }
  } else {
    return {
      operations: [
        {
          title: '新增销售出库单',
          steps: [
            '点击"新增销售出库"按钮',
            '选择出库仓库和客户',
            '添加出库明细，选择物料和数量',
            '设置出库日期和备注',
            '点击"保存草稿"或"提交"'
          ]
        },
        {
          title: '确认出库单',
          steps: [
            '在出库单列表中找到草稿状态的出库单',
            '点击"确认"按钮',
            '确认后库存会相应减少'
          ]
        }
      ],
      notices: [
        '出库数量不能超过可用库存',
        '确认出库单会扣减库存',
        '已确认的出库单不能直接修改'
      ],
      tips: [
        '可以关联销售订单自动生成出库单',
        '支持部分出库',
        '出库单确认后不可撤销'
      ],
      shortcuts: [
        { key: 'Ctrl+N', description: '新增出库单' },
        { key: 'Ctrl+S', description: '保存草稿' }
      ],
      version: '1.0.0',
      lastUpdate: '2025-05-28'
    }
  }
})

// 打开帮助
const handleHelp = () => {
  helpDialogVisible.value = true
}
</script>

<style scoped>
.sales-order-page {
  padding: 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.page-header .header-left .page-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
}
.page-header .header-right {
  display: flex;
  gap: 8px;
}
.stats-row {
  margin-bottom: 20px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.stat-card .stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: #ecf5ff;
  color: #409EFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.stat-card .stat-icon.pending {
  background: #fdf6ec;
  color: #E6A23C;
}
.stat-card .stat-icon.amount {
  background: #e8f5e9;
  color: #67C23A;
}
.stat-card .stat-icon.receivable {
  background: #fef0f0;
  color: #F56C6C;
}
.stat-card .stat-info {
  display: flex;
  flex-direction: column;
}
.stat-card .stat-info .stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}
.stat-card .stat-info .stat-label {
  font-size: 13px;
  color: #909399;
}
.search-card {
  margin-bottom: 20px;
}
.search-card .search-actions {
  display: flex;
  gap: 8px;
}
.table-card {
  margin-bottom: 20px;
}
.table-card .amount {
  font-weight: 600;
}
.table-card .customer-info .name {
  font-weight: 500;
}
.table-card .progress-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.table-card .progress-cell .progress-text {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}
.table-card .relation-links {
  display: flex;
  gap: 4px;
}
.table-card .pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}
.table-card .batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #606266;
}
.order-form .form-section {
  margin-bottom: 24px;
}
.order-form .form-section .section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 600;
}
.order-form .form-section .section-title .section-tip {
  font-weight: normal;
  font-size: 12px;
  color: #909399;
}
.order-form .form-section .details-actions {
  margin-top: 12px;
}
.order-form .form-section .total-amount :deep(.el-input__inner) {
  color: #F56C6C;
  font-weight: 600;
}
.order-detail .detail-section {
  margin-bottom: 24px;
}
.order-detail .detail-section h4 {
  margin: 0 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}
.order-detail .detail-summary {
  display: flex;
  gap: 24px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-top: 12px;
}
.order-detail .detail-summary .total {
  color: #F56C6C;
  font-weight: 600;
}
.stock-low {
  color: #F56C6C;
}
.stock-warning {
  color: #E6A23C;
}
.stock-normal {
  color: #67C23A;
}
.quick-outbound-details {
  margin-top: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}
.quick-outbound-details .detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
}
.push-purchase-details {
  margin-top: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}
.push-purchase-details .detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
}
.push-purchase-details .purchase-summary {
  display: flex;
  gap: 24px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 4px;
  margin-top: 12px;
  font-weight: 600;
}
.push-purchase-details .purchase-quantity {
  font-weight: 600;
  color: #409EFF;
}
:deep(.el-table .cancelled-row) {
  opacity: 0.5;
}
:deep(.el-table .amount) {
  font-weight: 600;
}
</style>