const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 数企管家 - 环境检查工具\n');

const checks = [];

// 检查 Node.js
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  checks.push({ name: 'Node.js', status: '✅', version: nodeVersion });
} catch (e) {
  checks.push({ name: 'Node.js', status: '❌', error: '未安装' });
}

// 检查 npm
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  checks.push({ name: 'npm', status: '✅', version: npmVersion });
} catch (e) {
  checks.push({ name: 'npm', status: '❌', error: '未安装' });
}

// 检查 MySQL
try {
  const mysqlVersion = execSync('mysql --version', { encoding: 'utf8' }).trim();
  checks.push({ name: 'MySQL', status: '✅', version: mysqlVersion });
} catch (e) {
  checks.push({ name: 'MySQL', status: '⚠️', error: '未安装或未配置到PATH' });
}

// 检查 Redis
try {
  const redisVersion = execSync('redis-cli --version', { encoding: 'utf8' }).trim();
  checks.push({ name: 'Redis', status: '✅', version: redisVersion });
} catch (e) {
  checks.push({ name: 'Redis', status: '⚠️', error: '未安装或未配置到PATH' });
}

// 检查 Git
try {
  const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
  checks.push({ name: 'Git', status: '✅', version: gitVersion });
} catch (e) {
  checks.push({ name: 'Git', status: '⚠️', error: '未安装或未配置到PATH' });
}

// 检查项目文件
const projectPath = path.join(__dirname, '..');
checks.push({ 
  name: '后端项目', 
  status: fs.existsSync(path.join(projectPath, 'package.json')) ? '✅' : '❌' 
});

checks.push({ 
  name: '前端项目', 
  status: fs.existsSync(path.join(projectPath, 'frontend', 'package.json')) ? '✅' : '❌' 
});

checks.push({ 
  name: '.env文件', 
  status: fs.existsSync(path.join(projectPath, '.env')) ? '✅' : '❌' 
});

// 输出结果
checks.forEach(check => {
  console.log(`${check.status} ${check.name}`);
  if (check.version) console.log(`   版本: ${check.version}`);
  if (check.error) console.log(`   ${check.error}`);
});

console.log('\n📋 检查完成！');
