const fs = require('fs');

const filePath = 'src/controllers/auth.controller.ts';

console.log('🔧 开始修复 auth.controller.ts 中的重复属性名...\n');

let content = fs.readFileSync(filePath, 'utf-8');

// 使用正则表达式找到 pinyinMap 对象
const pinyinMapRegex = /const pinyinMap: Record<string, string> = \{([\s\S]*?)\n\};/;
const match = content.match(pinyinMapRegex);

if (!match) {
  console.error('❌ 未找到 pinyinMap 对象');
  process.exit(1);
}

const mapContent = match[1];

// 分割成键值对
const lines = mapContent.split(',').map(s => s.trim()).filter(s => s);

// 解析键值对
const seen = new Set();
const uniquePairs = [];
const duplicates = [];

for (const line of lines) {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) continue;
  
  const key = line.substring(0, colonIndex).trim();
  const value = line.substring(colonIndex + 1).trim();
  
  // 移除引号
  const cleanKey = key.replace(/['"]/g, '');
  
  if (seen.has(cleanKey)) {
    duplicates.push({ key: cleanKey, value });
  } else {
    seen.add(cleanKey);
    uniquePairs.push({ key: cleanKey, value });
  }
}

if (duplicates.length === 0) {
  console.log('✅ 没有发现重复属性');
  process.exit(0);
}

console.log(`📊 发现 ${duplicates.length} 个重复属性：\n`);
duplicates.forEach(d => {
  console.log(`  ⚠️  '${d.key}' 重复 (值: '${d.value}')`);
});

// 重建 pinyinMap 对象
const newMapContent = uniquePairs.map(p => `'${p.key}': '${p.value}'`).join(', ');

// 替换原文中的 pinyinMap 对象
const newContent = content.replace(
  /const pinyinMap: Record<string, string> = \{[\s\S]*?\n\};/,
  `const pinyinMap: Record<string, string> = {\n    ${newMapContent}\n  };`
);

// 写回文件
fs.writeFileSync(filePath, newContent);

console.log(`\n✅ 已修复 ${duplicates.length} 个重复属性`);
console.log(`📝 文件已更新: ${filePath}`);
