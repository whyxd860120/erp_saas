<template>
  <div class="shop-order-page">
    <el-card shadow="never">
      <template #header><span>商城订单管理</span></template>

      <div class="search-bar">
        <el-input v-model="keyword" placeholder="订单号/收货人/手机号" clearable style="width: 260px" @clear="fetchList" @keyup.enter="fetchList" />
        <el-select v-model="statusFilter" placeholder="订单状态" clearable style="width: 140px; margin-left: 12px" @change="fetchList">
          <el-option label="待付款" value="pending" />
          <el-option label="已付款" value="paid" />
          <el-option label="已发货" value="shipped" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
          start-placeholder="开始日期" end-placeholder="结束日期"
          value-format="YYYY-MM-DD" style="margin-left: 12px" @change="fetchList" />
        <el-button type="primary" style="margin-left: 12px" @click="fetchList">搜索</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe style="margin-top: 16px">
        <el-table-column prop="orderNo" label="订单号" width="180" show-overflow-tooltip />
        <el-table-column label="用户" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.user?.nickname || row.userName || '-' }}</template>
        </el-table-column>
        <el-table-column label="商品" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-for="(item, idx) in (row.items || []).slice(0, 3)" :key="idx">
              {{ item.name }}×{{ item.quantity }}<template v-if="idx < Math.min((row.items || []).length, 3) - 1">；</template>
            </span>
            <el-tag v-if="(row.items || []).length > 3" size="small" style="margin-left: 4px">等{{ row.items?.length }}件</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="金额(¥)" width="100" align="right">
          <template #default="{ row }">{{ row.totalAmount?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="receiverName" label="收货人" width="100" />
        <el-table-column prop="receiverMobile" label="联系电话" width="130" />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="下单时间" width="160" />
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="showDetail(row)">详情</el-button>
            <el-button v-if="row.status === 'paid'" link type="success" size="small" @click="handleShip(row)">发货</el-button>
            <el-button v-if="row.status === 'pending'" link type="danger" size="small" @click="handleCancel(row)">取消</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 订单详情对话框 -->
    <el-dialog v-model="detailVisible" title="订单详情" width="640px" destroy-on-close>
      <template v-if="detail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="订单号">{{ detail.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTag(detail.status)" size="small">{{ statusLabel(detail.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="用户">{{ detail.user?.nickname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="金额">¥{{ detail.totalAmount?.toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="收货人">{{ detail.receiverName }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detail.receiverMobile }}</el-descriptions-item>
          <el-descriptions-item label="收货地址" :span="2">{{ detail.receiverAddress }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detail.remark || '-' }}</el-descriptions-item>
          <el-descriptions-item label="下单时间">{{ detail.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ detail.paidAt || '-' }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin: 16px 0 8px">商品明细</h4>
        <el-table :data="detail.items || []" size="small" border>
          <el-table-column label="图片" width="60">
            <template #default="{ row: item }">
              <el-avatar v-if="item.imageUrl" :src="item.imageUrl" shape="square" :size="36" />
              <el-avatar v-else shape="square" :size="36" :icon="PictureFilled" />
            </template>
          </el-table-column>
          <el-table-column prop="name" label="商品" />
          <el-table-column prop="price" label="单价" width="80" align="right">
            <template #default="{ row: item }">¥{{ item.price?.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="60" align="center" />
          <el-table-column label="小计" width="80" align="right">
            <template #default="{ row: item }">¥{{ ((item.price || 0) * (item.quantity || 0)).toFixed(2) }}</template>
          </el-table-column>
        </el-table>

        <div v-if="detail.status === 'paid'" style="margin-top: 16px; text-align: right">
          <el-button type="success" @click="handleShip(detail)">确认发货</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PictureFilled } from '@element-plus/icons-vue'
import { getShopOrders, getShopOrderById, updateShopOrder } from '@/api/shop'

const list = ref<any[]>([])
const loading = ref(false)
const keyword = ref('')
const statusFilter = ref('')
const dateRange = ref<any[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const detailVisible = ref(false)
const detail = ref<any>(null)

function statusTag(s: string) {
  const map: Record<string, string> = { pending: 'warning', paid: 'primary', shipped: 'success', completed: 'info', cancelled: 'danger' }
  return map[s] || 'info'
}
function statusLabel(s: string) {
  const map: Record<string, string> = { pending: '待付款', paid: '已付款', shipped: '已发货', completed: '已完成', cancelled: '已取消' }
  return map[s] || s
}

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.keyword = keyword.value
    if (statusFilter.value) params.status = statusFilter.value
    if (dateRange.value?.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res = await getShopOrders(params)
    list.value = (res as any).data?.items || []
    total.value = (res as any).data?.total || 0
  } finally {
    loading.value = false
  }
}

async function showDetail(row: any) {
  try {
    const res = await getShopOrderById(row.id)
    detail.value = (res as any).data
    detailVisible.value = true
  } catch { /* ignore */ }
}

async function handleShip(row: any) {
  await ElMessageBox.confirm(`确定将订单「${row.orderNo}」标记为已发货？`, '确认发货', { type: 'info' })
  await updateShopOrder(row.id, { status: 'shipped' })
  ElMessage.success('已发货')
  detailVisible.value = false
  fetchList()
}

async function handleCancel(row: any) {
  await ElMessageBox.confirm(`确定要取消订单「${row.orderNo}」吗？`, '确认取消', { type: 'warning' })
  await updateShopOrder(row.id, { status: 'cancelled' })
  ElMessage.success('已取消')
  fetchList()
}

onMounted(() => fetchList())
</script>

<style scoped>
.search-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
