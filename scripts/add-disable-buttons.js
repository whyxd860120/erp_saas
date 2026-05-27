const fs = require('fs');
const path = require('path');

const files = [
  {
    path: 'frontend/src/views/SupplierListView.vue',
    importName: 'toggleSupplierStatus',
    funcName: 'toggleSupplierStatus'
  },
  {
    path: 'frontend/src/views/CustomerListView.vue',
    importName: 'toggleCustomerStatus',
    funcName: 'toggleCustomerStatus'
  },
  {
    path: 'frontend/src/views/ProductListView.vue',
    importName: 'toggleProductStatus',
    funcName: 'toggleProductStatus'
  }
];

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file.path);
  let content = fs.readFileSync(filePath, 'utf-8');

  console.log(`\n处理 ${path.basename(file.path)}...`);

  // 1. 添加导入
  const importPattern = /(getSuppliers,\s*\n\s*getSupplierById,\s*\n\s*createSupplier,\s*\n\s*updateSupplier,\s*\n\s*deleteSupplier,\s*\n\s*importSuppliers)/;
  if (importPattern.test(content)) {
    content = content.replace(importPattern, `$1,\n  ${file.importName}`);
    console.log(`✅ 添加 ${file.importName} 到导入`);
  }

  // 2. 添加函数
  const funcPattern = /(async function handleDeleteSupplier\(row: SupplierItem\))/;
  const newFunc = `async function ${file.funcName}(row: any) {
  const newStatus = row.status === 'active' ? 'inactive' : 'active'
  const actionName = newStatus === 'active' ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(\`确定\${actionName}「\${row.name}」吗？\`, '提示', { type: 'warning' })
    const res = await ${file.importName}(row.id, newStatus)
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

  if (funcPattern.test(content)) {
    content = content.replace(funcPattern, newFunc);
    console.log(`✅ 添加 ${file.funcName} 函数`);
  }

  // 3. 添加按钮
  const buttonPattern = /(<el-button link type="primary" size="small" @click="handleEditSupplier\(row\)">\s*编辑\s*<\/el-button>)/;
  const newButton = `$1
                <el-button link type="warning" size="small" @click="${file.funcName}(row)">
                  {{ row.status === 'active' ? '禁用' : '启用' }}
                </el-button>`;

  if (buttonPattern.test(content)) {
    content = content.replace(buttonPattern, newButton);
    console.log(`✅ 添加禁用/启用按钮`);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${path.basename(file.path)} 已保存`);
});

console.log('\n✨ 所有文件修改完成！');
