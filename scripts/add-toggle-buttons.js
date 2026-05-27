const fs = require('fs');
const path = require('path');

const files = [
  '../frontend/src/views/SupplierListView.vue',
  '../frontend/src/views/CustomerListView.vue',
  '../frontend/src/views/ProductListView.vue'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  const moduleName = file.includes('Supplier') ? 'Supplier' :
                     file.includes('Customer') ? 'Customer' : 'Product';

  // 1. 添加toggleStatus函数
  const toggleStatusFunc = `
async function toggleStatus(row: any) {
  const newStatus = row.status === 'active' ? 'inactive' : 'active'
  const actionName = newStatus === 'active' ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(\`确定\${actionName}「\${row.name}」吗？\`, '提示', { type: 'warning' })
    let res
    if (typeof toggle${moduleName}Status !== 'undefined') {
      res = await toggle${moduleName}Status(row.id, newStatus)
    } else {
      // 如果没有专用的toggle函数，使用update
      res = await update${moduleName}(row.id, { status: newStatus })
    }
    if (res.success) {
      ElMessage.success(\`\${actionName}成功\`)
      await loadData()
    } else {
      ElMessage.error(res.message || \`\${actionName}失败\`)
    }
  } catch (e: any) {
    if (e !== 'cancel' && e?.response?.data?.message) {
      ElMessage.error(e.response.data.message)
    }
  }
}
`;

  // 在handleDeleteSupplier之前插入
  const insertPattern = new RegExp(`(async function handleDelete${moduleName}\\([^)]*\\)[\\s\\S]*?await ElMessageBox\\.confirm\\([^)]*\\)\\s*\\(\\)[\\s\\S]*?const res = await delete${moduleName}\\()`, 'm');
  content = content.replace(insertPattern, toggleStatusFunc + '\n$1');

  // 2. 在操作列添加按钮
  const editButtonPattern = new RegExp(`(<el-button link type="primary" size="small" @click="handleEdit${moduleName}\\(row\\)"[^>]*>\\s*编辑\\s*</el-button>)`, 'm');
  const newButtons = `$1
                <el-button link type="warning" size="small" @click="toggleStatus(row)">
                  {{ row.status === 'active' ? '禁用' : '启用' }}
                </el-button>`;

  content = content.replace(editButtonPattern, newButtons);

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${path.basename(file)} 已更新`);
});

console.log('\n✨ 所有文件已成功更新！');
