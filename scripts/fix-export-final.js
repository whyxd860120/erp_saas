const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/controllers/product.controller.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// 移除转义字符和修复导出
content = content.replace(/\\n/g, '\n');
content = content.replace(/\\t/g, '\t');

// 确保默认导出正确
const exportPattern = /export default \{[\s\S]*?\};/;
const exportMatch = content.match(exportPattern);

if (exportMatch) {
  let exportContent = exportMatch[0];

  // 移除getCategoryTree（如果存在）
  exportContent = exportContent.replace(/getCategoryTree,\s*/g, '');

  // 确保所有必需的函数都存在
  const requiredFunctions = [
    'getCategories',
    'createCategory',
    'updateCategory',
    'deleteCategory',
    'importCategories',
    'getProducts',
    'getProductById',
    'createProduct',
    'updateProduct',
    'deleteProduct',
    'importProducts',
    'toggleProductStatus'
  ];

  let missingFunctions = requiredFunctions.filter(fn => !exportContent.includes(fn));

  if (missingFunctions.length > 0) {
    console.log('⚠️  发现缺失的函数:', missingFunctions.join(', '));
  }

  // 重新生成导出
  const newExport = `export default {
  ${requiredFunctions.join(',\n  ')},
};`;

  content = content.replace(exportPattern, newExport);
  console.log('✅ 已修复默认导出');
}

// 保存文件
fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ 文件已保存');

console.log('\n✨ 操作完成！');
