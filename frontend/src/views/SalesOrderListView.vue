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
              <el-input v-model="searchForm.keyword" placeholder="订单号/客户" clearable style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="7">
            <el-form-item label="客户" class="search-item">
              <el-select v-model="searchForm.customerId" placeholder="请选择客户" clearable filterable style="width: 220px;">
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
              <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 180px;">
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
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-tag type="primary" size="small" @click="handleView(row)" style="cursor: pointer; margin-right: 4px;">
              查看
            </el-tag>
            <el-dropdown v-if="row.status === 'draft'" trigger="click">
              <el-tag type="info" size="small" style="cursor: pointer; margin-right: 4px;">
                更多
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-tag>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleEdit(row)">编辑</el-dropdown-item>
                  <el-dropdown-item @click="handleCopy(row)">复制</el-dropdown-item>
                  <el-dropdown-item @click="handleConfirm(row)" divided>确认</el-dropdown-item>
                  <el-dropdown-item @click="handleCancel(row)" style="color: #F56C6C;">取消</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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
              style="cursor: pointer;"
            >
              快速出库
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
                <el-select v-model="formData.customerId" placeholder="请选择客户" filterable style="width: 100%;">
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
            <el-col :span="8">
              <el-form-item label="物流/快递费用">
                <el-input-number
                  v-model="formData.logisticsCost"
                  :min="0"
                  :precision="2"
                  placeholder="请输入物流费用"
                  style="width: 100%;"
                  @change="calculateAmounts"
                />
              </el-form-item>
            </el-col>
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
    <el-dialog v-model="quickOutboundDialogVisible" title="快速出库" width="500px">
      <el-form :model="quickOutboundForm" label-width="80px">
        <el-form-item label="订单编号">
          <el-input v-model="quickOutboundForm.orderNo" disabled />
        </el-form-item>
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
        <el-form-item label="出库日期">
          <el-date-picker
            v-model="quickOutboundForm.outboundDate"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            style="width: 100%;"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quickOutboundDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmQuickOutbound" :loading="quickOutboundLoading">确认出库</el-button>
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
          <el-table :data="currentOrder.details" border size="small">
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Download, Document, Clock, Money, Wallet, Goods, Delete,
  ArrowDown, Upload
} from '@element-plus/icons-vue'
import {
  getSalesOrders, getSalesOrderById, createSalesOrder,
  updateSalesOrder, confirmSalesOrder, unconfirmSalesOrder, deleteSalesOrder, importSalesOrders
} from '@/api/sales-order'
import { createSalesOutbound } from '@/api/sales-outbound'
import { getWarehouses } from '@/api/warehouse'
import { getCustomers } from '@/api/customer'
import { getProducts } from '@/api/product'
import { getUsers } from '@/api/user'
import CommonImportDialog from '@/components/CommonImportDialog.vue'

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

// 数据
const tableData = ref<any[]>([])
const customers = ref<any[]>([])
const products = ref<any[]>([])
const salesmen = ref<any[]>([])
const warehouses = ref<any[]>([])

// 快速出库
const quickOutboundDialogVisible = ref(false)
const quickOutboundLoading = ref(false)
const quickOutboundForm = reactive({
  orderId: '',
  orderNo: '',
  warehouseId: '',
  outboundDate: new Date().toISOString().split('T')[0]
})

// 导入配置
const importColumns = [
  { prop: 'orderNo', label: '订单单号', required: true },
  { prop: 'orderDate', label: '订单日期', required: true },
  { prop: 'customerName', label: '客户名称', required: true },
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
  logisticsCost: 0,
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
    const amount = (detail.quantity || 0) * (detail.unitPrice || 0)
    const tax = amount * ((detail.taxRate || 0) / 100)
    goodsAmount += amount
    taxAmount += tax
  })
  formData.goodsAmount = goodsAmount
  formData.taxAmount = taxAmount
  formData.discountAmount = goodsAmount + taxAmount
  formData.totalAmount = formData.discountAmount - formData.extraDiscount + (formData.logisticsCost || 0)
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
  const map: Record<string, string> = {
    draft: 'info',
    confirmed: '',
    partial: 'warning',
    completed: 'success',
    cancelled: 'danger'
  }
  return map[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    confirmed: '已确认',
    partial: '部分出库',
    completed: '已完成',
    cancelled: '已取消'
  }
  return map[status] || status
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
    const response = await getSalesOrders(params)
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
    const response = await getCustomers({ page: 1, limit: 1000, status: '' })
    if (response.success) {
      customers.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取客户失败:', error)
  }
}

// 获取仓库
const fetchWarehouses = async () => {
  try {
    const response = await getWarehouses({ page: 1, limit: 1000 })
    if (response.success) {
      warehouses.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取仓库失败:', error)
  }
}

// 获取物料
const fetchProducts = async () => {
  try {
    const response = await getProducts({ page: 1, limit: 1000, status: '' })
    if (response.success) {
      products.value = response.data.items || []
    }
  } catch (error) {
    console.error('获取物料失败:', error)
  }
}

// 获取用户
const fetchSalesmen = async () => {
  try {
    const response = await getUsers({ page: 1, limit: 1000, status: 'active' })
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
const handleCreate = () => {
  dialogTitle.value = '新增销售订单'
  isEdit.value = false
  resetForm()
  addDefaultDetail()
  dialogVisible.value = true
}

// 编辑
const handleEdit = async (row: any) => {
  dialogTitle.value = '编辑销售订单'
  isEdit.value = true
  try {
    const response = await getSalesOrderById(row.id)
    if (response.success) {
      const order = response.data.data
      Object.assign(formData, {
        id: order.id,
        orderNo: order.orderNo,
        orderDate: order.orderDate?.split('T')[0],
        customerId: order.customerId,
        salesmanId: order.salesmanId || '',
        dueDate: order.dueDate || '',
        remark: order.remark || '',
        extraDiscount: order.extraDiscount || 0,
        logisticsCost: order.logisticsCost || 0,
        details: order.details?.map((d: any) => ({
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
    const response = await getSalesOrderById(row.id)
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

// 取消
const handleCancel = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要取消销售订单 "${row.orderNo}" 吗？`, '确认取消', { type: 'warning' })
    ElMessage.success('取消成功')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('取消失败')
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
  getSalesOrderById(row.id).then(response => {
    if (response.success) {
      const order = response.data
      quickOutboundForm.orderId = order.id
      quickOutboundForm.orderNo = order.orderNo
      quickOutboundForm.warehouseId = ''
      quickOutboundForm.outboundDate = new Date().toISOString().split('T')[0]
      quickOutboundDialogVisible.value = true
    }
  })
}

// 确认快速出库
const handleConfirmQuickOutbound = async () => {
  if (!quickOutboundForm.warehouseId) {
    ElMessage.warning('请选择出库仓库')
    return
  }

  try {
    quickOutboundLoading.value = true

    // 获取订单详情
    const orderResponse = await getSalesOrderById(quickOutboundForm.orderId)
    if (!orderResponse.success) {
      ElMessage.error('获取订单详情失败')
      return
    }

    const order = orderResponse.data

    // 构建出库单明细（从订单明细复制）
    const details = order.items.map((item: any) => ({
      productId: item.productId,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0
    }))

    // 创建出库单
    await createSalesOutbound({
      orderId: quickOutboundForm.orderId,
      warehouseId: quickOutboundForm.warehouseId,
      outboundDate: quickOutboundForm.outboundDate,
      remark: `由订单 ${quickOutboundForm.orderNo} 快速出库`,
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

  customers.value.forEach(c => customerMap.set(c.name, c.id))
  products.value.forEach(p => productMap.set(p.code, p.id))

  const processedData = data.map(item => {
    const newItem: any = { ...item }

    if (item.customerName && customerMap.has(item.customerName)) {
      newItem.customerId = customerMap.get(item.customerName)
      delete newItem.customerName
    } else if (item.customerName) {
      newItem.customerError = `客户 "${item.customerName}" 不存在`
    }

    if (item.productCode && productMap.has(item.productCode)) {
      newItem.productId = productMap.get(item.productCode)
      delete newItem.productCode
    } else if (item.productCode) {
      newItem.productError = `物料编码 "${item.productCode}" 不存在`
    }

    return newItem
  })

  return await importSalesOrders(processedData)
}

const handleImportSuccess = () => {
  loadData()
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
    detail.unitPrice = product.salePrice || 0
  }
  handleDetailChange(index)
}

// 明细变更
const handleDetailChange = (index: number) => {
  const detail = formData.details[index]
  detail.amount = (detail.quantity || 0) * (detail.unitPrice || 0)
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
      logisticsCost: Number(formData.logisticsCost) || 0,
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
  formData.logisticsCost = 0
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
  await Promise.all([fetchData(), fetchCustomers(), fetchProducts(), fetchSalesmen(), fetchWarehouses()])
})
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
:deep(.el-table .cancelled-row) {
  opacity: 0.5;
}
:deep(.el-table .amount) {
  font-weight: 600;
}
</style>