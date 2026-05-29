<template>
  <div class="shop-product-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>商城商品管理</span>
          <el-button type="primary" @click="showPublishDialog">上架商品</el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input v-model="keyword" placeholder="搜索商品名称/编码" clearable style="width: 260px" @clear="fetchList" @keyup.enter="fetchList" />
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 140px; margin-left: 12px" @change="fetchList">
          <el-option label="已上架" value="active" />
          <el-option label="已下架" value="inactive" />
        </el-select>
        <el-button type="primary" style="margin-left: 12px" @click="fetchList">搜索</el-button>
      </div>

      <!-- 表格 -->
      <el-table :data="list" v-loading="loading" stripe style="margin-top: 16px">
        <el-table-column prop="productCode" label="商品编码" width="140" />
        <el-table-column label="商品图片" width="80">
          <template #default="{ row }">
            <el-avatar v-if="row.imageUrl" :src="row.imageUrl" shape="square" :size="48" />
            <el-avatar v-else shape="square" :size="48" :icon="PictureFilled" />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商品名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="price" label="售价(¥)" width="100" align="right">
          <template #default="{ row }">{{ row.price?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="80" align="center" />
        <el-table-column prop="sortOrder" label="排序" width="70" align="center" />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '已上架' : '已下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="上架时间" width="160" />
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="showEditDialog(row)">编辑</el-button>
            <el-button v-if="row.status === 'active'" link type="warning" size="small" @click="handleUnpublish(row)">下架</el-button>
            <el-button v-else link type="success" size="small" @click="handlePublishAgain(row)">重新上架</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
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

    <!-- 上架/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑商品' : '上架商品'" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="选择物料" prop="productId" v-if="!isEdit">
          <el-select v-model="form.productId" filterable remote reserve-keyword
            :remote-method="searchProducts" :loading="productSearching"
            placeholder="输入物料名称/编码搜索" style="width: 100%">
            <el-option v-for="p in productOptions" :key="p.id" :label="`${p.code} - ${p.name}`" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="form.name" placeholder="商城显示名称" />
        </el-form-item>
        <el-form-item label="售价" prop="price">
          <el-input-number v-model="form.price" :min="0" :precision="2" :step="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-input v-model="form.category" placeholder="如：热销、新品、推荐" />
        </el-form-item>
        <el-form-item label="商品图片">
          <el-input v-model="form.imageUrl" placeholder="图片URL地址" />
        </el-form-item>
        <el-form-item label="商品描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="商品简介" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" active-value="active" inactive-value="inactive"
            active-text="上架" inactive-text="下架" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PictureFilled } from '@element-plus/icons-vue'
import { getShopProducts, publishProduct, updateShopProduct, unpublishProduct } from '@/api/shop'
import { getProducts } from '@/api/product'

const list = ref<any[]>([])
const loading = ref(false)
const keyword = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref()
const form = ref({
  id: '',
  productId: '',
  name: '',
  price: 0,
  category: '',
  imageUrl: '',
  description: '',
  sortOrder: 0,
  status: 'active' as string,
})
const rules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入售价', trigger: 'blur' }],
}

const productOptions = ref<any[]>([])
const productSearching = ref(false)

async function searchProducts(query: string) {
  if (!query) { productOptions.value = []; return }
  productSearching.value = true
  try {
    const res = await getProducts({ keyword: query, pageSize: 20 })
    productOptions.value = (res as any).data?.items || (res as any).items || []
  } finally {
    productSearching.value = false
  }
}

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.keyword = keyword.value
    if (statusFilter.value) params.status = statusFilter.value
    const res = await getShopProducts(params)
    list.value = (res as any).data?.items || []
    total.value = (res as any).data?.total || 0
  } finally {
    loading.value = false
  }
}

function showPublishDialog() {
  isEdit.value = false
  form.value = { id: '', productId: '', name: '', price: 0, category: '', imageUrl: '', description: '', sortOrder: 0, status: 'active' }
  productOptions.value = []
  dialogVisible.value = true
}

function showEditDialog(row: any) {
  isEdit.value = true
  form.value = {
    id: row.id,
    productId: row.productId,
    name: row.name,
    price: row.price,
    category: row.category || '',
    imageUrl: row.imageUrl || '',
    description: row.description || '',
    sortOrder: row.sortOrder || 0,
    status: row.status,
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateShopProduct(form.value.id, form.value)
      ElMessage.success('更新成功')
    } else {
      await publishProduct(form.value)
      ElMessage.success('上架成功')
    }
    dialogVisible.value = false
    fetchList()
  } finally {
    submitting.value = false
  }
}

async function handleUnpublish(row: any) {
  await ElMessageBox.confirm(`确定要将「${row.name}」下架吗？`, '确认下架', { type: 'warning' })
  await unpublishProduct(row.id)
  ElMessage.success('已下架')
  fetchList()
}

async function handlePublishAgain(row: any) {
  await updateShopProduct(row.id, { status: 'active' })
  ElMessage.success('已重新上架')
  fetchList()
}

onMounted(() => fetchList())
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.search-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
