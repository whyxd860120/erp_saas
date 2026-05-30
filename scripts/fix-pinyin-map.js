const fs = require('fs');

const filePath = 'src/controllers/auth.controller.ts';

console.log('🔧 开始修复 auth.controller.ts 中的重复属性名...\n');

let content = fs.readFileSync(filePath, 'utf-8');

// 找到 pinyinMap 的开始和结束位置
const startMarker = "const pinyinMap: Record<string, string> = {";
const endMarker = "};";

const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
  console.error('❌ 未找到 pinyinMap 开始标记');
  process.exit(1);
}

// 找到第一个结束标记（在开始标记之后）
let endIndex = content.indexOf(endMarker, startIndex);
if (endIndex === -1) {
  console.error('❌ 未找到 pinyinMap 结束标记');
  process.exit(1);
}

// 提取 pinyinMap 对象内容
const oldMapContent = content.substring(startIndex + startMarker.length, endIndex);

// 分割成键值对（按逗号分割，但要小心处理）
const pairs = [];
let current = '';
let inString = false;
let stringChar = '';

for (let i = 0; i < oldMapContent.length; i++) {
  const char = oldMapContent[i];
  
  if (!inString && (char === '"' || char === "'")) {
    inString = true;
    stringChar = char;
    current += char;
  } else if (inString && char === stringChar) {
    inString = false;
    current += char;
  } else if (!inString && char === ',') {
    const trimmed = current.trim();
    if (trimmed) {
      pairs.push(trimmed);
    }
    current = '';
  } else {
    current += char;
  }
}

// 处理最后一项
const lastTrimmed = current.trim();
if (lastTrimmed) {
  pairs.push(lastTrimmed);
}

// 解析并去重
const seen = new Map();
const uniquePairs = [];
const duplicates = [];

for (const pair of pairs) {
  const colonIndex = pair.indexOf(':');
  if (colonIndex === -1) continue;
  
  const key = pair.substring(0, colonIndex).trim();
  const value = pair.substring(colonIndex + 1).trim();
  
  // 移除引号
  const cleanKey = key.replace(/['"]/g, '');
  
  if (seen.has(cleanKey)) {
    duplicates.push({ key: cleanKey, value, oldValue: seen.get(cleanKey) });
  } else {
    seen.set(cleanKey, value);
    uniquePairs.push({ key, value });
  }
}

if (duplicates.length === 0) {
  console.log('✅ 没有发现重复属性');
  process.exit(0);
}

console.log(`📊 发现 ${duplicates.length} 个重复属性：\n`);
duplicates.slice(0, 20).forEach(d => {
  console.log(`  ⚠️  '${d.key}' 重复 (新值: '${d.value}', 旧值: '${d.oldValue}')`);
});
if (duplicates.length > 20) {
  console.log(`  ... 还有 ${duplicates.length - 20} 个重复`);
}

// 重建 pinyinMap 对象
const newMapContent = uniquePairs.map(p => `${p.key}: ${p.value}`).join(',\n    ');

// 替换原文中的 pinyinMap 对象
const newContent = content.substring(0, startIndex) 
  + startMarker + '\n    ' + newMapContent + '\n  ' + endMarker
  + content.substring(endIndex + endMarker.length);

// 写回文件
fs.writeFileSync(filePath, newContent);

console.log(`\n✅ 已修复 ${duplicates.length} 个重复属性`);
console.log(`📝 文件已更新: ${filePath}`);
console.log(`💾 原始唯一对数: ${uniquePairs.length}`);
