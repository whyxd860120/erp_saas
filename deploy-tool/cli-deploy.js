const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const projectPath = path.join(__dirname, '..');

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function runCommand(command, cwd = projectPath) {
  try {
    console.log(`执行: ${command}`);
    execSync(command, { cwd, stdio: 'inherit' });
    return true;
  } catch (e) {
    console.error(`❌ 命令执行失败: ${command}`);
    return false;
  }
}

async function main() {
  console.log('🚀 数企管家 - 命令行部署工具\n');

  // 显示菜单
  console.log('请选择操作:');
  console.log('1. 环境检查');
  console.log('2. 配置环境变量');
  console.log('3. 安装后端依赖');
  console.log('4. 安装前端依赖');
  console.log('5. 初始化数据库');
  console.log('6. 启动开发服务器');
  console.log('7. 完整部署 (1-6)');
  console.log('0. 退出\n');

  const choice = await question('请输入选项编号: ');

  switch (choice.trim()) {
    case '1':
      await checkEnv();
      break;
    case '2':
      await configEnv();
      break;
    case '3':
      await installBackend();
      break;
    case '4':
      await installFrontend();
      break;
    case '5':
      await initDatabase();
      break;
    case '6':
      await startServers();
      break;
    case '7':
      await fullDeploy();
      break;
    case '0':
      console.log('👋 再见！');
      rl.close();
      process.exit(0);
    default:
      console.log('❌ 无效选项');
  }

  rl.close();
}

async function checkEnv() {
  console.log('\n🔍 开始环境检查...\n');
  runCommand('node deploy-tool/check-env.js', projectPath);
}

async function configEnv() {
  console.log('\n⚙️ 配置环境变量...\n');

  const envPath = path.join(projectPath, '.env');
  const envExamplePath = path.join(projectPath, '.env.example');

  if (fs.existsSync(envPath)) {
    const overwrite = await question('.env 文件已存在，是否覆盖？(y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('已取消配置');
      return;
    }
  }

  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ 已复制 .env.example 到 .env');
    console.log('请手动编辑 .env 文件配置数据库连接等信息');
  } else {
    console.log('⚠️ .env.example 文件不存在，请手动创建 .env 文件');
  }
}

async function installBackend() {
  console.log('\n📦 安装后端依赖...\n');
  runCommand('npm install', projectPath);
  console.log('\n✅ 后端依赖安装完成');
}

async function installFrontend() {
  console.log('\n📦 安装前端依赖...\n');
  runCommand('npm install', path.join(projectPath, 'frontend'));
  console.log('\n✅ 前端依赖安装完成');
}

async function initDatabase() {
  console.log('\n💾 初始化数据库...\n');

  console.log('步骤 1: 生成 Prisma 客户端');
  if (!runCommand('npx prisma generate', projectPath)) return;

  console.log('\n步骤 2: 运行数据库迁移');
  if (!runCommand('npx prisma migrate deploy', projectPath)) return;

  console.log('\n步骤 3: 初始化管理员账号');
  if (!runCommand('npm run seed:admin', projectPath)) return;

  console.log('\n步骤 4: 初始化菜单数据');
  const menuScript = path.join(projectPath, 'scripts', 'init-menus.js');
  if (fs.existsSync(menuScript)) {
    runCommand('node scripts/init-menus.js', projectPath);
  } else {
    console.log('⚠️ 菜单初始化脚本不存在，跳过');
  }

  console.log('\n✅ 数据库初始化完成');
}

async function startServers() {
  console.log('\n🔧 启动开发服务器...\n');

  console.log('启动后端服务器...');
  const backend = spawn('npm', ['run', 'dev'], { 
    cwd: projectPath, 
    shell: true,
    detached: false
  });

  backend.stdout.on('data', (data) => {
    console.log(`[后端] ${data.toString().trim()}`);
  });

  backend.stderr.on('data', (data) => {
    console.error(`[后端错误] ${data.toString().trim()}`);
  });

  // 等待后端启动
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('\n启动前端服务器...');
  const frontend = spawn('npm', ['run', 'dev'], { 
    cwd: path.join(projectPath, 'frontend'), 
    shell: true,
    detached: false
  });

  frontend.stdout.on('data', (data) => {
    console.log(`[前端] ${data.toString().trim()}`);
  });

  frontend.stderr.on('data', (data) => {
    console.error(`[前端错误] ${data.toString().trim()}`);
  });

  console.log('\n✅ 服务器已启动！');
  console.log('前端地址: http://localhost:5173');
  console.log('后端地址: http://localhost:3000');
  console.log('\n按 Ctrl+C 停止服务器\n');

  // 保持进程运行
  process.on('SIGINT', () => {
    console.log('\n👋 正在停止服务器...');
    backend.kill();
    frontend.kill();
    process.exit(0);
  });
}

async function fullDeploy() {
  console.log('\n🚀 开始完整部署...\n');

  await checkEnv();
  
  const continueDeploy = await question('\n继续部署？(Y/n): ');
  if (continueDeploy.toLowerCase() === 'n') {
    console.log('已取消部署');
    return;
  }

  await configEnv();
  
  const hasEnv = fs.existsSync(path.join(projectPath, '.env'));
  if (!hasEnv) {
    console.log('❌ 请先配置 .env 文件');
    return;
  }

  await installBackend();
  await installFrontend();
  await initDatabase();

  const startNow = await question('\n是否立即启动服务器？(Y/n): ');
  if (startNow.toLowerCase() !== 'n') {
    await startServers();
  } else {
    console.log('\n✅ 部署完成！');
    console.log('使用 npm run dev 启动后端');
    console.log('使用 cd frontend && npm run dev 启动前端');
  }
}

main().catch(console.error);
