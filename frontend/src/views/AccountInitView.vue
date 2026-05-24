<template>
  <div class="account-init-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>账套初始化</span>
        </div>
      </template>

      <el-alert
        v-if="initStatus === 'pending'"
        title="账套参数未设置"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      >
        请先在"账套参数"中设置账套启用年度/月度和当前会计年度/月度，完成后再进行初始化。
      </el-alert>

      <el-alert
        v-else-if="initStatus === 'completed'"
        title="账套初始化已完成"
        type="success"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      >
        账套已初始化完成，所有业务模块已开放。如需重新初始化，请先删除所有业务数据。
      </el-alert>

      <el-alert
        v-else
        title="账套初始化进行中"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      >
        请录入库存和应收应付的初始数据，完成后点击"结束初始化"按钮。
      </el-alert>

      <el-tabs v-model="activeTab" class="init-tabs" v-if="initStatus !== 'pending'">
        <el-tab-pane label="账户初始余额" name="accounts">
          <div class="tab-content">
            <div class="toolbar">
              <el-button type="primary" @click="handleAddAccountBalance" v-if="initStatus !== 'completed'">
                添加账户余额
              </el-button>
              <el-button type="success" @click="openImport('account-balance')" v-if="initStatus !== 'completed'">
                <el-icon><Upload /></el-icon>
                Excel导入
              </el-button>
              <span class="toolbar-tip" v-if="initStatus === 'completed'">（只读）</span>
            </div>

            <el-table :data="accountBalanceData" border style="margin-top: 16px">
              <el-table-column prop="accountName" label="账户名称" width="200" />
              <el-table-column prop="accountType" label="账户类型" width="120">
                <template #default="{ row }">
                  <el-tag :type="getAccountTypeTag(row.accountType)" size="small">
                    {{ getAccountTypeLabel(row.accountType) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="balance" label="初始余额" width="150" align="right">
                <template #default="{ row }">
                  {{ formatCurrency(row.balance) }}
                </template>
              </el-table-column>
              <el-table-column prop="remark" label="备注" min-width="200" />
              <el-table-column label="操作" width="100" v-if="initStatus !== 'completed'">
                <template #default="{ row }">
                  <el-button type="danger" size="small" link @click="handleDeleteAccountBalance(row)">
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="summary" v-if="accountBalanceData.length > 0">
              <span>合计：{{ accountBalanceData.length }} 个账户，</span>
              <span>总余额：{{ formatCurrency(totalAccountBalance) }}</span>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="库存初始数据" name="inventory">
          <div class="tab-content">
            <div class="toolbar">
              <el-button type="primary" @click="handleAddInventory" v-if="initStatus !== 'completed'">
                添加初始库存
              </el-button>
              <el-button type="success" @click="openImport('inventory')" v-if="initStatus !== 'completed'">
                <el-icon><Upload /></el-icon>
                Excel导入
              </el-button>
              <span class="toolbar-tip" v-if="initStatus === 'completed'">（只读）</span>
            </div>

            <el-table :data="inventoryData" border style="margin-top: 16px">
              <el-table-column prop="warehouseName" label="仓库" width="150" />
              <el-table-column prop="productName" label="商品" min-width="200" />
              <el-table-column prop="batchNo" label="批次号" width="120" v-if="inventoryData.some(item => item.batchNo)" />
              <el-table-column prop="productionDate" label="生产日期" width="120" v-if="inventoryData.some(item => item.productionDate)">
                <template #default="{ row }">
                  {{ row.productionDate ? formatDate(row.productionDate) : '-' }}
                </template>
              </el-table-column>
              <el-table-column prop="expiryDate" label="有效期至" width="120" v-if="inventoryData.some(item => item.expiryDate)">
                <template #default="{ row }">
                  {{ row.expiryDate ? formatDate(row.expiryDate) : '-' }}
                </template>
              </el-table-column>
              <el-table-column prop="quantity" label="初始数量" width="120" align="right" />
              <el-table-column prop="snCount" label="SN码数量" width="100" align="right" v-if="inventoryData.some(item => item.snCount)">
                <template #default="{ row }">
                  <el-tag v-if="row.snCount > 0" size="small" type="success">{{ row.snCount }}个</el-tag>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column prop="unitCost" label="单位成本" width="120" align="right">
                <template #default="{ row }">
                  {{ formatCurrency(row.unitCost) }}
                </template>
              </el-table-column>
              <el-table-column prop="totalCost" label="总成本" width="150" align="right">
                <template #default="{ row }">
                  {{ formatCurrency(row.totalCost) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" v-if="initStatus !== 'completed'">
                <template #default="{ row }">
                  <el-button type="primary" size="small" link @click="handleEditInventory(row)">
                    编辑
                  </el-button>
                  <el-button type="danger" size="small" link @click="handleDeleteInventory(row)">
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="summary" v-if="inventoryData.length > 0">
              <span>合计：{{ inventoryData.length }} 条记录，</span>
              <span>总成本：{{ formatCurrency(totalInventoryCost) }}</span>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="应收应付初始数据" name="arap">
          <div class="tab-content">
            <el-tabs v-model="arapSubTab" class="arap-tabs">
              <el-tab-pane label="应收款" name="receivable">
                <div class="toolbar">
                  <el-button type="primary" @click="handleAddReceivable" v-if="initStatus !== 'completed'">
                    添加应收款
                  </el-button>
                  <el-button type="success" @click="openImport('receivable')" v-if="initStatus !== 'completed'">
                    <el-icon><Upload /></el-icon>
                    Excel导入
                  </el-button>
                  <span class="toolbar-tip" v-if="initStatus === 'completed'">（只读）</span>
                </div>

                <el-table :data="receivableData" border style="margin-top: 16px">
                  <el-table-column prop="customerName" label="客户" min-width="150" />
                  <el-table-column prop="amount" label="应收金额" width="120" align="right">
                    <template #default="{ row }">
                      {{ formatCurrency(row.amount) }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="remark" label="备注" min-width="200" />
                  <el-table-column label="操作" width="100" v-if="initStatus !== 'completed'">
                    <template #default="{ row }">
                      <el-button type="danger" size="small" link @click="handleDeleteReceivable(row)">
                        删除
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>

                <div class="summary" v-if="receivableData.length > 0">
                  <span>合计：{{ receivableData.length }} 条记录，</span>
                  <span>总金额：{{ formatCurrency(totalReceivable) }}</span>
                </div>
              </el-tab-pane>

              <el-tab-pane label="应付款" name="payable">
                <div class="toolbar">
                  <el-button type="primary" @click="handleAddPayable" v-if="initStatus !== 'completed'">
                    添加应付款
                  </el-button>
                  <el-button type="success" @click="openImport('payable')" v-if="initStatus !== 'completed'">
                    <el-icon><Upload /></el-icon>
                    Excel导入
                  </el-button>
                  <span class="toolbar-tip" v-if="initStatus === 'completed'">（只读）</span>
                </div>

                <el-table :data="payableData" border style="margin-top: 16px">
                  <el-table-column prop="supplierName" label="供应商" min-width="150" />
                  <el-table-column prop="amount" label="应付金额" width="120" align="right">
                    <template #default="{ row }">
                      {{ formatCurrency(row.amount) }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="remark" label="备注" min-width="200" />
                  <el-table-column label="操作" width="100" v-if="initStatus !== 'completed'">
                    <template #default="{ row }">
                      <el-button type="danger" size="small" link @click="handleDeletePayable(row)">
                        删除
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>

                <div class="summary" v-if="payableData.length > 0">
                  <span>合计：{{ payableData.length }} 条记录，</span>
                  <span>总金额：{{ formatCurrency(totalPayable) }}</span>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-tab-pane>
      </el-tabs>

      <div class="actions" v-if="initStatus !== 'pending'">
        <el-divider />
        <div class="action-buttons">
          <template v-if="initStatus === 'data_entry'">
            <el-button type="success" :loading="completing" @click="handleCompleteInit">
              结束初始化
            </el-button>
            <el-button @click="handleResetInit">
              重置初始化数据
            </el-button>
          </template>
          <template v-else>
            <el-button type="warning" @click="handleRevertInit">
              反初始化
            </el-button>
          </template>
        </div>
      </div>
    </el-card>

    <!-- 添加初始库存对话框 -->
    <el-dialog v-model="inventoryDialogVisible" :title="editingInventory ? '编辑初始库存' : '添加初始库存'" width="700px">
      <el-form ref="inventoryFormRef" :model="inventoryForm" :rules="inventoryRules" label-width="120px">
        <el-form-item label="仓库" prop="warehouseId">
          <el-select v-model="inventoryForm.warehouseId" placeholder="选择仓库" style="width: 100%" :disabled="editingInventory">
            <el-option
              v-for="w in warehouses"
              :key="w.id"
              :label="w.name"
              :value="w.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="商品" prop="productId">
          <el-select v-model="inventoryForm.productId" placeholder="选择商品" style="width: 100%" filterable :disabled="editingInventory" @change="handleProductChange">
            <el-option
              v-for="p in products"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            >
              <span>{{ p.name }}</span>
              <span class="sku-tag">{{ p.sku }}</span>
              <el-tag v-if="p.enableBatch" size="small" type="warning" style="margin-left: 8px">批次</el-tag>
              <el-tag v-if="p.enableExpiry" size="small" type="warning" style="margin-left: 4px">保质期</el-tag>
              <el-tag v-if="p.enableSN" size="small" type="warning" style="margin-left: 4px">SN码</el-tag>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="初始数量" prop="quantity">
          <el-input-number v-model="inventoryForm.quantity" :min="0" :disabled="requireSN" style="width: 100%" />
          <span v-if="requireSN" style="color: #f56c6c; margin-left: 8px; font-size: 12px;">
            启用SN码管理，数量根据SN码数量自动计算
          </span>
        </el-form-item>
        <el-form-item label="批次号" prop="batchNo" v-if="requireBatchNo">
          <el-input v-model="inventoryForm.batchNo" placeholder="请输入批次号" />
        </el-form-item>
        <el-form-item label="生产日期" prop="productionDate" v-if="requireExpiryDate">
          <el-date-picker
            v-model="inventoryForm.productionDate"
            type="date"
            placeholder="选择生产日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="有效期至" prop="expiryDate" v-if="requireExpiryDate">
          <el-date-picker
            v-model="inventoryForm.expiryDate"
            type="date"
            placeholder="选择有效期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="单位成本" prop="unitCost">
          <el-input-number v-model="inventoryForm.unitCost" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="SN码" v-if="requireSN">
          <div style="width: 100%">
            <el-button @click="openSnInput" :disabled="!inventoryForm.productId">
              {{ inventoryForm.serialNumbers.length > 0 ? `已录入 ${inventoryForm.serialNumbers.length} 个SN码` : '录入SN码' }}
            </el-button>
            <div v-if="inventoryForm.serialNumbers.length > 0" style="margin-top: 8px; color: #67c23a; font-size: 12px;">
              ✓ 已完成SN码录入
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inventoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveInventory">{{ editingInventory ? '更新' : '保存' }}</el-button>
      </template>
    </el-dialog>

    <!-- 添加应收款对话框 -->
    <el-dialog v-model="receivableDialogVisible" title="添加应收款" width="500px">
      <el-form ref="receivableFormRef" :model="receivableForm" :rules="receivableRules" label-width="100px">
        <el-form-item label="客户" prop="customerId">
          <el-select v-model="receivableForm.customerId" placeholder="选择客户" style="width: 100%">
            <el-option
              v-for="c in customers"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="应收金额" prop="amount">
          <el-input-number v-model="receivableForm.amount" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="receivableForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="receivableDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveReceivable">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加应付款对话框 -->
    <el-dialog v-model="payableDialogVisible" title="添加应付款" width="500px">
      <el-form ref="payableFormRef" :model="payableForm" :rules="payableRules" label-width="100px">
        <el-form-item label="供应商" prop="supplierId">
          <el-select v-model="payableForm.supplierId" placeholder="选择供应商" style="width: 100%">
            <el-option
              v-for="s in suppliers"
              :key="s.id"
              :label="s.name"
              :value="s.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="应付金额" prop="amount">
          <el-input-number v-model="payableForm.amount" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="payableForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="payableDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSavePayable">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加账户余额对话框 -->
    <el-dialog v-model="accountBalanceDialogVisible" title="添加账户余额" width="500px">
      <el-form ref="accountBalanceFormRef" :model="accountBalanceForm" :rules="accountBalanceRules" label-width="100px">
        <el-form-item label="账户" prop="accountId">
          <el-select v-model="accountBalanceForm.accountId" placeholder="选择账户" style="width: 100%">
            <el-option
              v-for="acc in accounts"
              :key="acc.id"
              :label="`${acc.name} (${getAccountTypeLabel(acc.type)})`"
              :value="acc.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="初始余额" prop="balance">
          <el-input-number v-model="accountBalanceForm.balance" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="accountBalanceForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="accountBalanceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveAccountBalance">保存</el-button>
      </template>
    </el-dialog>

    <!-- SN码录入对话框 -->
    <SnInputDialog
      v-model="snInputDialogVisible"
      :quantity="0"
      :existing-sn-list="inventoryForm.serialNumbers"
      @confirm="handleSnConfirm"
    />

    <!-- Excel导入对话框 -->
    <AccountInitImportDialog
      v-model="importDialogVisible"
      :title="getImportTitle()"
      :columns="getImportColumns()"
      :on-import="handleImportData"
      @success="handleImportSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { getCurrentTenant, updateTenant } from '@/api/tenant-setting'
import { getWarehouses } from '@/api/warehouse'
import { getProducts } from '@/api/product'
import { getCustomers } from '@/api/customer'
import { getSuppliers } from '@/api/supplier'
import { getAccounts } from '@/api/account'
import { request } from '@/api/http'
import SnInputDialog from '@/components/SnInputDialog.vue'
import AccountInitImportDialog from '@/components/AccountInitImportDialog.vue'

const authStore = useAuthStore()

const activeTab = ref('inventory')
const arapSubTab = ref('receivable')
const initStatus = ref('pending')
const loading = ref(false)
const completing = ref(false)
const importDialogVisible = ref(false)
const importType = ref('')

// 仓库和商品列表
const warehouses = ref<any[]>([])
const products = ref<any[]>([])
const customers = ref<any[]>([])
const suppliers = ref<any[]>([])
const accounts = ref<any[]>([])

// 初始数据
const inventoryData = ref<any[]>([])
const receivableData = ref<any[]>([])
const payableData = ref<any[]>([])
const accountBalanceData = ref<any[]>([])

// 对话框
const inventoryDialogVisible = ref(false)
const receivableDialogVisible = ref(false)
const payableDialogVisible = ref(false)
const accountBalanceDialogVisible = ref(false)
const snInputDialogVisible = ref(false)

// 编辑状态
const editingInventory = ref<any>(null)

// 表单引用
const inventoryFormRef = ref<FormInstance>()
const receivableFormRef = ref<FormInstance>()
const payableFormRef = ref<FormInstance>()
const accountBalanceFormRef = ref<FormInstance>()

// 库存表单
const inventoryForm = reactive({
  warehouseId: '',
  productId: '',
  quantity: 0,
  unitCost: 0,
  batchNo: '',
  productionDate: null as Date | null,
  expiryDate: null as Date | null,
  serialNumbers: [] as string[]
})

const inventoryRules: FormRules = {
  warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  productId: [{ required: true, message: '请选择商品', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }]
}

// 账户余额表单
const accountBalanceForm = reactive({
  accountId: '',
  balance: 0,
  remark: ''
})

const accountBalanceRules: FormRules = {
  accountId: [{ required: true, message: '请选择账户', trigger: 'change' }],
  balance: [{ required: true, message: '请输入余额', trigger: 'blur' }]
}

// 应收款表单
const receivableForm = reactive({
  customerId: '',
  amount: 0,
  remark: ''
})

const receivableRules: FormRules = {
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }]
}

// 应付款表单
const payableForm = reactive({
  supplierId: '',
  amount: 0,
  remark: ''
})

const payableRules: FormRules = {
  supplierId: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }]
}

// 计算属性
const totalInventoryCost = computed(() => {
  return inventoryData.value.reduce((sum, item) => sum + (item.totalCost || 0), 0)
})

const totalReceivable = computed(() => {
  return receivableData.value.reduce((sum, item) => sum + (item.amount || 0), 0)
})

const totalPayable = computed(() => {
  return payableData.value.reduce((sum, item) => sum + (item.amount || 0), 0)
})

const totalAccountBalance = computed(() => {
  return accountBalanceData.value.reduce((sum, item) => sum + (item.balance || 0), 0)
})

// 根据选择的物料获取物料属性
const selectedProduct = computed(() => {
  return products.value.find(p => p.id === inventoryForm.productId) || {}
})

// 是否需要批次号
const requireBatchNo = computed(() => {
  return selectedProduct.value.enableBatch || false
})

// 是否需要保质期
const requireExpiryDate = computed(() => {
  return selectedProduct.value.enableExpiry || false
})

// 是否需要SN码
const requireSN = computed(() => {
  return selectedProduct.value.enableSN || false
})

// 格式化货币
const formatCurrency = (value: number): string => {
  return `¥${(value || 0).toFixed(2)}`
}

// 格式化日期
const formatDate = (date: Date | string): string => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN')
}

// 账户类型标签
const getAccountTypeTag = (type: string): string => {
  const typeMap: Record<string, string> = {
    bank: 'primary',
    cash: 'success',
    alipay: 'warning',
    wechat: 'success'
  }
  return typeMap[type] || 'info'
}

// 账户类型标签
const getAccountTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    bank: '银行账户',
    cash: '现金账户',
    alipay: '支付宝',
    wechat: '微信支付'
  }
  return typeMap[type] || type
}

// 加载数据
const loadData = async () => {
  try {
    loading.value = true

    // 获取租户信息
    const tenantRes = await getCurrentTenant() as any
    if (tenantRes.success && tenantRes.data) {
      initStatus.value = tenantRes.data.initializationStatus || 'pending'
    }

    // 如果账套参数未设置，不加载其他数据
    if (initStatus.value === 'pending') {
      return
    }

    // 加载仓库列表
    const warehouseRes = await getWarehouses({ page: 1, limit: 100 }) as any
    if (warehouseRes.success) {
      warehouses.value = warehouseRes.data.items || []
    }

    // 加载商品列表
    const productRes = await getProducts({ page: 1, limit: 100 }) as any
    if (productRes.success) {
      products.value = productRes.data.items || []
    }

    // 加载客户列表
    const customerRes = await getCustomers({ page: 1, limit: 100 }) as any
    if (customerRes.success) {
      customers.value = customerRes.data.items || []
    }

    // 加载供应商列表
    const supplierRes = await getSuppliers({ page: 1, limit: 100 }) as any
    if (supplierRes.success) {
      suppliers.value = supplierRes.data.items || []
    }

    // 加载账户列表
    const accountRes = await getAccounts({ page: 1, limit: 100 }) as any
    if (accountRes.success) {
      accounts.value = accountRes.data.items || []
    }

    // 加载初始数据
    await loadInitData()
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

const loadInitData = async () => {
  try {
    // 加载初始库存
    const invRes = await request({ url: '/api/v1/init-data/inventory', method: 'get' }) as any
    if (invRes.success) {
      inventoryData.value = invRes.data || []
    }

    // 加载应收款
    const recRes = await request({ url: '/api/v1/init-data/receivable', method: 'get' }) as any
    if (recRes.success) {
      receivableData.value = recRes.data || []
    }

    // 加载应付款
    const payRes = await request({ url: '/api/v1/init-data/payable', method: 'get' }) as any
    if (payRes.success) {
      payableData.value = payRes.data || []
    }

    // 加载账户余额
    const accRes = await request({ url: '/api/v1/init-data/account-balance', method: 'get' }) as any
    if (accRes.success) {
      accountBalanceData.value = accRes.data || []
    }
  } catch (error) {
    console.error('加载初始数据失败:', error)
  }
}

// 添加初始库存
const handleAddInventory = () => {
  editingInventory.value = null
  inventoryForm.warehouseId = ''
  inventoryForm.productId = ''
  inventoryForm.quantity = 0
  inventoryForm.unitCost = 0
  inventoryForm.batchNo = ''
  inventoryForm.productionDate = null
  inventoryForm.expiryDate = null
  inventoryForm.serialNumbers = []
  inventoryDialogVisible.value = true
}

// 编辑初始库存
const handleEditInventory = (row: any) => {
  editingInventory.value = row
  inventoryForm.warehouseId = row.warehouseId
  inventoryForm.productId = row.productId
  inventoryForm.quantity = row.quantity
  inventoryForm.unitCost = row.unitCost
  inventoryForm.batchNo = row.batchNo || ''
  inventoryForm.productionDate = row.productionDate ? new Date(row.productionDate) : null
  inventoryForm.expiryDate = row.expiryDate ? new Date(row.expiryDate) : null
  inventoryForm.serialNumbers = row.serialNumbers || []
  inventoryDialogVisible.value = true
}

// 物料选择变化时清空相关字段
const handleProductChange = () => {
  inventoryForm.batchNo = ''
  inventoryForm.productionDate = null
  inventoryForm.expiryDate = null
  inventoryForm.serialNumbers = []
  if (requireSN.value) {
    inventoryForm.quantity = 0
  }
}

// 打开SN码录入
const openSnInput = () => {
  if (!inventoryForm.productId) {
    ElMessage.warning('请先选择商品')
    return
  }
  snInputDialogVisible.value = true
}

// SN码确认
const handleSnConfirm = (snList: string[]) => {
  inventoryForm.serialNumbers = snList
  inventoryForm.quantity = snList.length
  ElMessage.success(`已录入 ${snList.length} 个SN码`)
}

const handleSaveInventory = async () => {
  if (!inventoryFormRef.value) return
  try {
    await inventoryFormRef.value.validate()

    // SN码管理验证
    if (requireSN.value) {
      if (inventoryForm.serialNumbers.length !== inventoryForm.quantity) {
        ElMessage.error(`SN码数量(${inventoryForm.serialNumbers.length})与数量(${inventoryForm.quantity})不匹配`)
        return
      }
    }

    const payload: any = {
      warehouseId: inventoryForm.warehouseId,
      productId: inventoryForm.productId,
      quantity: inventoryForm.quantity,
      unitCost: inventoryForm.unitCost
    }

    // 添加批次管理字段
    if (requireBatchNo.value) {
      payload.batchNo = inventoryForm.batchNo
    }

    // 添加保质期管理字段
    if (requireExpiryDate.value) {
      payload.productionDate = inventoryForm.productionDate
      payload.expiryDate = inventoryForm.expiryDate
    }

    // 添加SN码管理字段
    if (requireSN.value) {
      payload.serialNumbers = inventoryForm.serialNumbers
    }

    // 根据是否编辑决定使用不同的API
    let res: any
    if (editingInventory.value) {
      res = await request({ 
        url: '/api/v1/init-data/inventory', 
        method: 'put', 
        data: payload 
      }) as any
      if (res.success) {
        ElMessage.success('更新成功')
      }
    } else {
      res = await request({ url: '/api/v1/init-data/inventory', method: 'post', data: payload }) as any
      if (res.success) {
        ElMessage.success('添加成功')
      }
    }
    
    if (res.success) {
      inventoryDialogVisible.value = false
      editingInventory.value = null
      await loadInitData()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}

// 获取导入标题
const getImportTitle = () => {
  const titleMap: Record<string, string> = {
    'account-balance': '账户余额',
    'inventory': '库存数据',
    'receivable': '应收款',
    'payable': '应付款'
  }
  return titleMap[importType.value] || '数据'
}

// 获取导入列定义
const getImportColumns = () => {
  const columnsMap: Record<string, any[]> = {
    'account-balance': [
      { prop: 'accountName', label: '账户名称', required: true, type: 'string' },
      { prop: 'balance', label: '初始余额', required: true, type: 'number' },
      { prop: 'remark', label: '备注', required: false, type: 'string' }
    ],
    'inventory': [
      { prop: 'warehouseCode', label: '仓库编码', required: true, type: 'string' },
      { prop: 'productCode', label: '物料编码', required: true, type: 'string' },
      { prop: 'quantity', label: '数量', required: true, type: 'number' },
      { prop: 'unitCost', label: '单位成本', required: false, type: 'number' },
      { prop: 'batchNo', label: '批次号', required: false, type: 'string' },
      { prop: 'productionDate', label: '生产日期', required: false, type: 'date' },
      { prop: 'expiryDate', label: '有效期至', required: false, type: 'date' },
      { prop: 'serialNumbers', label: 'SN码(用逗号分隔)', required: false, type: 'string' }
    ],
    'receivable': [
      { prop: 'customerName', label: '客户名称', required: true, type: 'string' },
      { prop: 'amount', label: '应收金额', required: true, type: 'number' },
      { prop: 'remark', label: '备注', required: false, type: 'string' }
    ],
    'payable': [
      { prop: 'supplierName', label: '供应商名称', required: true, type: 'string' },
      { prop: 'amount', label: '应付金额', required: true, type: 'number' },
      { prop: 'remark', label: '备注', required: false, type: 'string' }
    ]
  }
  return columnsMap[importType.value] || []
}

// 打开导入对话框
const openImport = (type: string) => {
  importType.value = type
  importDialogVisible.value = true
}

// 执行数据导入
const handleImportData = async (data: any[]) => {
  const apiMap: Record<string, string> = {
    'account-balance': '/api/v1/init-data/account-balance/import',
    'inventory': '/api/v1/init-data/inventory/import',
    'receivable': '/api/v1/init-data/receivable/import',
    'payable': '/api/v1/init-data/payable/import'
  }

  const apiUrl = apiMap[importType.value]
  if (!apiUrl) {
    throw new Error('不支持的导入类型')
  }

  const res = await request({ url: apiUrl, method: 'post', data }) as any

  if (!res.success) {
    throw new Error(res.message || '导入失败')
  }

  return {
    success: true,
    successCount: res.data.successCount || 0,
    failCount: res.data.failCount || 0,
    errors: res.data.errors || []
  }
}

// 导入成功回调
const handleImportSuccess = () => {
  loadInitData()
}

const handleDeleteInventory = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', { type: 'warning' })
    const res = await request({ url: `/api/v1/init-data/inventory/${row.id}`, method: 'delete' }) as any
    if (res.success) {
      ElMessage.success('删除成功')
      await loadInitData()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 添加应收款
const handleAddReceivable = () => {
  receivableForm.customerId = ''
  receivableForm.amount = 0
  receivableForm.remark = ''
  receivableDialogVisible.value = true
}

const handleSaveReceivable = async () => {
  if (!receivableFormRef.value) return
  try {
    await receivableFormRef.value.validate()
    const res = await request({ url: '/api/v1/init-data/receivable', method: 'post', data: receivableForm }) as any
    if (res.success) {
      ElMessage.success('添加成功')
      receivableDialogVisible.value = false
      await loadInitData()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}

const handleDeleteReceivable = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', { type: 'warning' })
    const res = await request({ url: `/api/v1/init-data/receivable/${row.id}`, method: 'delete' }) as any
    if (res.success) {
      ElMessage.success('删除成功')
      await loadInitData()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 添加应付款
const handleAddPayable = () => {
  payableForm.supplierId = ''
  payableForm.amount = 0
  payableForm.remark = ''
  payableDialogVisible.value = true
}

const handleSavePayable = async () => {
  if (!payableFormRef.value) return
  try {
    await payableFormRef.value.validate()
    const res = await request({ url: '/api/v1/init-data/payable', method: 'post', data: payableForm }) as any
    if (res.success) {
      ElMessage.success('添加成功')
      payableDialogVisible.value = false
      await loadInitData()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}

const handleDeletePayable = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', { type: 'warning' })
    const res = await request({ url: `/api/v1/init-data/payable/${row.id}`, method: 'delete' }) as any
    if (res.success) {
      ElMessage.success('删除成功')
      await loadInitData()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 添加账户余额
const handleAddAccountBalance = () => {
  accountBalanceForm.accountId = ''
  accountBalanceForm.balance = 0
  accountBalanceForm.remark = ''
  accountBalanceDialogVisible.value = true
}

const handleSaveAccountBalance = async () => {
  if (!accountBalanceFormRef.value) return
  try {
    await accountBalanceFormRef.value.validate()
    const res = await request({ url: '/api/v1/init-data/account-balance', method: 'post', data: accountBalanceForm }) as any
    if (res.success) {
      ElMessage.success('添加成功')
      accountBalanceDialogVisible.value = false
      await loadInitData()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}

const handleDeleteAccountBalance = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', { type: 'warning' })
    const res = await request({ url: `/api/v1/init-data/account-balance/${row.id}`, method: 'delete' }) as any
    if (res.success) {
      ElMessage.success('删除成功')
      await loadInitData()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 结束初始化
const handleCompleteInit = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要结束账套初始化吗？结束后将开放所有业务模块，且账套参数将无法修改。',
      '结束初始化',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )

    completing.value = true
    const res = await request({ url: '/api/v1/init-data/complete', method: 'post' }) as any
    if (res.success) {
      ElMessage.success('账套初始化已完成')
      initStatus.value = 'completed'
      // 重新获取租户信息以更新菜单状态
      await authStore.fetchUserInfo()
      window.location.reload()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  } finally {
    completing.value = false
  }
}

// 重置初始化数据
const handleResetInit = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重置所有初始化数据吗？',
      '重置',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )

    const res = await request({ url: '/api/v1/init-data/reset', method: 'post' }) as any
    if (res.success) {
      ElMessage.success('已重置')
      await loadInitData()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

// 反初始化
const handleRevertInit = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要反初始化吗？反初始化后将可以重新设置账套参数，但所有业务数据将被清空。',
      '反初始化',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'danger' }
    )

    const res = await request({ url: '/api/v1/init-data/revert', method: 'post' }) as any
    if (res.success) {
      ElMessage.success('已反初始化')
      initStatus.value = 'data_entry'
      // 重新获取租户信息以更新菜单状态
      await authStore.fetchUserInfo()
      window.location.reload()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  } finally {
    completing.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.account-init-view {
  padding: 20px;
}

.card-header {
  font-size: 18px;
  font-weight: 600;
}

.init-tabs {
  margin-top: 20px;
}

.tab-content {
  padding: 16px 0;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-tip {
  color: #909399;
  font-size: 12px;
}

.summary {
  margin-top: 16px;
  text-align: right;
  color: #606266;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.sku-tag {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}
</style>
