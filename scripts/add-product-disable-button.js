const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/views/ProductListView.vue');
let content = fs.readFileSync(filePath, 'utf-8');

console.log('处理 ProductListView.vue...');

// 1. 添加导入
const importPattern = /(importProducts\s*\n})\s*from\s*['"]@\/api\/product['"]/;
if (importPattern.test(content)) {
  content = content.replace(importPattern, `importProducts,\n  toggleProductStatus\n} from '@/api/product'`);
  console.log('✅ 添加 toggleProductStatus 到导入');
}

// 2. 添加函数 - 查找handleDeleteProduct
const deleteFuncPattern = /(async function handleDeleteProduct\(row: ProductItem\))/;
const newFunc = `async function toggleProductStatus(row: any) {
  const newStatus = row.status === 'active' ? 'inactive' : 'active'
  const actionName = newStatus === 'active' ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(\`确定\${actionName}「\${row.name}」吗？\`, '提示', { type: 'warning' })
    const res = await toggleProductStatus(row.id, newStatus)
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

$1`;

if (deleteFuncPattern.test(content)) {
  content = content.replace(deleteFuncPattern, newFunc);
  console.log('✅ 添加 toggleProductStatus 函数');
}

// 3. 添加按钮
const buttonPattern = /(<el-button link type="primary" size="small" @click="handleEditProduct\(row\)">\s*编辑\s*<\/el-button>)/;
const newButton = `$1
                <el-button link type="warning" size="small" @click="toggleProductStatus(row)">
                  {{ row.status === 'active' ? '禁用' : '启用' }}
                </el-button>`;

if (buttonPattern.test(content)) {
  content = content.replace(buttonPattern, newButton);
  console.log('✅ 添加禁用/启用按钮');
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ ProductListView.vue 已保存');

console.log('\n✨ ProductListView.vue 修改完成！');
