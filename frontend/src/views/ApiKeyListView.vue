<template>
  <div class="api-keys">
    <el-page-header @back="goBack" content="API密钥管理">
      <template #extra>
        <el-button type="primary" @click="handleCreate">创建API密钥</el-button>
      </template>
    </el-page-header>

    <el-card class="keys-card">
      <el-table :data="apiKeys" v-loading="loading" stripe>
        <el-table-column prop="name" label="名称" width="200" />
        <el-table-column prop="key" label="密钥" min-width="200">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ maskKey(row.key) }}</el-tag>
            <el-tooltip content="复制" placement="top">
              <el-button link type="primary" size="small" @click="copyKey(row.key)">
                <el-icon><DocumentCopy /></el-icon>
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastUsedAt" label="最后使用" width="180">
          <template #default="{ row }">
            {{ row.lastUsedAt ? formatDate(row.lastUsedAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="expiresAt" label="过期时间" width="180">
          <template #default="{ row }">
            {{ row.expiresAt ? formatDate(row.expiresAt) : '永不过期' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-popconfirm title="确定要删除这个API密钥吗？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑API密钥' : '创建API密钥'"
      width="500px"
    >
      <el-form :model="form" ref="formRef" :rules="rules" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="API密钥名称" />
        </el-form-item>
        <el-form-item label="权限" prop="permissions" v-if="false">
          <el-input v-model="form.permissions" type="textarea" :rows="3" placeholder="权限配置（JSON）" />
        </el-form-item>
        <el-form-item label="有效期" prop="expiresInDays" v-if="!isEdit">
          <el-select v-model="form.expiresInDays" placeholder="选择有效期">
            <el-option label="7天" :value="7" />
            <el-option label="30天" :value="30" />
            <el-option label="90天" :value="90" />
            <el-option label="永不过期" :value="null" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="isActive" v-if="isEdit">
          <el-switch v-model="form.isActive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="createdDialogVisible" title="API密钥创建成功" width="500px">
      <el-alert type="success" :closable="false">
        请妥善保存此API密钥，关闭对话框后将无法再次查看完整密钥！
      </el-alert>
      <div class="new-key">
        <el-input v-model="newApiKey" readonly>
          <template #append>
            <el-button @click="copyKey(newApiKey)">复制</el-button>
          </template>
        </el-input>
      </div>
      <template #footer>
        <el-button type="primary" @click="createdDialogVisible = false">我已保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import { DocumentCopy } from '@element-plus/icons-vue';
import apiKeyApi, { type ApiKey } from '@/api/api-key';

const router = useRouter();
const formRef = ref<FormInstance>();
const loading = ref(false);
const submitLoading = ref(false);
const dialogVisible = ref(false);
const createdDialogVisible = ref(false);
const isEdit = ref(false);
const apiKeys = ref<ApiKey[]>([]);
const newApiKey = ref('');
const form = ref<Partial<ApiKey> & { expiresInDays?: number | null }>({
  name: '',
  permissions: '',
  isActive: true,
  expiresInDays: 30
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入API密钥名称', trigger: 'blur' }]
};

const goBack = () => {
  router.back();
};

const fetchApiKeys = async () => {
  try {
    loading.value = true;
    const res = await apiKeyApi.getApiKeys();
    if (res.success) {
      apiKeys.value = res.data;
    }
  } catch (error) {
    console.error('获取API密钥失败:', error);
    ElMessage.error('获取API密钥失败');
  } finally {
    loading.value = false;
  }
};

const maskKey = (key: string) => {
  if (key.length <= 8) return key;
  return key.slice(0, 4) + '...' + key.slice(-4);
};

const copyKey = (key: string) => {
  navigator.clipboard.writeText(key).then(() => {
    ElMessage.success('已复制到剪贴板');
  }).catch(() => {
    ElMessage.error('复制失败');
  });
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString();
};

const handleCreate = () => {
  isEdit.value = false;
  form.value = { name: '', permissions: '', isActive: true, expiresInDays: 30 };
  dialogVisible.value = true;
};

const handleEdit = (row: ApiKey) => {
  isEdit.value = true;
  form.value = { ...row };
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        submitLoading.value = true;
        if (isEdit.value) {
          await apiKeyApi.updateApiKey(form.value.id!, form.value);
          ElMessage.success('更新成功');
        } else {
          const res = await apiKeyApi.createApiKey(form.value);
          if (res.success) {
            newApiKey.value = res.data.key;
            createdDialogVisible.value = true;
          }
        }
        dialogVisible.value = false;
        fetchApiKeys();
      } catch (error) {
        console.error('操作失败:', error);
        ElMessage.error('操作失败');
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

const handleDelete = async (id: string) => {
  try {
    await apiKeyApi.deleteApiKey(id);
    ElMessage.success('删除成功');
    fetchApiKeys();
  } catch (error) {
    console.error('删除失败:', error);
    ElMessage.error('删除失败');
  }
};

onMounted(() => {
  fetchApiKeys();
});
</script>

<style scoped>
.api-keys {
  padding: 20px;

  .keys-card {
    margin-top: 20px;
  }

  .new-key {
    margin-top: 20px;
  }
}
</style>
