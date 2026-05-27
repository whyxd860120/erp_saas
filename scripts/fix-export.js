const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/controllers/product.controller.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// 查找并修复默认导出
const pattern = /export default \{[\s\S]*?\};/;
const match = content.match(pattern);

if (match) {
  let exportContent = match[0];

  // 检查是否已经包含toggleProductStatus
  if (!exportContent.includes('toggleProductStatus')) {
    // 添加toggleProductStatus
    exportContent = exportContent.replace(
      /(importProducts,)\s*\};/,
      '$1\n  toggleProductStatus,\n};'
    );

    content = content.replace(pattern, exportContent);
    console.log('✅ 添加 toggleProductStatus 到默认导出');

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('✅ 文件已保存');
  } else {
    console.log('ℹ️  toggleProductStatus 已经在默认导出中');
  }
} else {
  console.error('❌ 未找到默认导出');
}
