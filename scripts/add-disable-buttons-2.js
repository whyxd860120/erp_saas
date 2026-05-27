const fs = require('fs');
const path = require('path');

const files = [
  {
    path: 'frontend/src/views/CustomerListView.vue',
    apiFile: '@/api/customer',
    importName: 'toggleCustomerStatus',
    funcName: 'toggleCustomerStatus',
    typeName: 'CustomerItem'
  },
  {
    path: 'frontend/src/views/ProductListView.vue',
    apiFile: '@/api/product',
    importName: 'toggleProductStatus',
    funcName: 'toggleProductStatus',
    typeName: 'ProductItem'
  }
];

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file.path);
  let content = fs.readFileSync(filePath, 'utf-8');

  console.log(`\n处理 ${path.basename(file.path)}...`);

  // 1. 添加导入
  const importPattern = new RegExp(`(${file.apiFile.replace('/', '\\/')}')`);
  const importMatch = content.match(importPattern);

  if (importMatch) {
    const importEnd = content.indexOf(importMatch[1]);
    const beforeImport = content.substring(0, importEnd);
    const afterImport = content.substring(importEnd);

    // 找到 } from '@/api/xxx' 的部分
    const importClosePattern = /}\s*from\s*['"]@\/api\/\w+['"]/;
    const match = afterImport.match(importClosePattern);

    if (match) {
      const insertPos = importEnd + match.index + 1;
      content = content.substring(0, insertPos) + `,\n  ${file.importName}` + content.substring(insertPos);
      console.log(`✅ 添加 ${file.importName} 到导入`);
    }
  }

  // 2. 添加函数 - 查找handleDeleteCustomer或类似的删除函数
  const deleteFuncPattern = /(async function handleDeleteCustomer\(row: CustomerItem\))/;
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

  if (deleteFuncPattern.test(content)) {
    content = content.replace(deleteFuncPattern, newFunc);
    console.log(`✅ 添加 ${file.funcName} 函数`);
  }

  // 3. 添加按钮
  const buttonPattern = /(<el-button link type="primary" size="small" @click="handleEditCustomer\(row\)">\s*编辑\s*<\/el-button>)/;
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
