const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;

// 安装程序路径配置
const INSTALLERS_PATH = path.join(__dirname, '..', 'installers');
const INSTALLERS = {
  node: {
    name: 'Node.js',
    file: 'node-v24.15.0-x64.msi',
    checkCommand: 'node --version',
    args: ['/quiet', '/norestart']
  },
  mysql: {
    name: 'MySQL',
    file: 'mysql-installer-community-9.6.0.msi',
    checkCommand: 'mysql --version',
    args: ['/quiet', '/norestart']
  },
  redis: {
    name: 'Redis',
    file: 'Redis-x64-3.2.100.msi',
    checkCommand: 'redis-cli --version',
    args: ['/quiet', '/norestart']
  },
  git: {
    name: 'Git',
    file: 'Git-2.46.0-64-bit.exe',
    checkCommand: 'git --version',
    args: ['/VERYSILENT', '/NORESTART']
  }
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// 检查软件是否已安装
function checkSoftware(key) {
  const installer = INSTALLERS[key];
  return new Promise((resolve) => {
    exec(installer.checkCommand, (error, stdout) => {
      resolve({
        installed: !error,
        version: stdout ? stdout.trim() : '',
        installerExists: fs.existsSync(path.join(INSTALLERS_PATH, installer.file))
      });
    });
  });
}

// 安装软件
ipcMain.handle('install-software', async (event, softwareKey) => {
  const installer = INSTALLERS[softwareKey];
  const installerPath = path.join(INSTALLERS_PATH, installer.file);

  if (!fs.existsSync(installerPath)) {
    return {
      success: false,
      message: `安装程序不存在: ${installer.file}\n请先将安装程序放到 installers/ 目录`
    };
  }

  try {
    event.sender.send('install-progress', {
      step: 0,
      total: 1,
      message: `正在安装 ${installer.name}...`
    });

    return new Promise((resolve) => {
      let installProcess;
      
      if (installer.file.endsWith('.msi')) {
        installProcess = spawn('msiexec', ['/i', installerPath, ...installer.args]);
      } else if (installer.file.endsWith('.exe')) {
        installProcess = spawn(installerPath, installer.args);
      } else {
        resolve({
          success: false,
          message: '不支持的安装程序格式'
        });
        return;
      }

      let output = '';
      installProcess.stdout?.on('data', (data) => {
        output += data.toString();
        event.sender.send('install-log', data.toString());
      });

      installProcess.stderr?.on('data', (data) => {
        output += data.toString();
        event.sender.send('install-log', data.toString());
      });

      installProcess.on('close', (code) => {
        if (code === 0 || code === 1641 || code === 3010) {
          resolve({
            success: true,
            message: `${installer.name} 安装成功！建议重启电脑后继续`,
            output: output
          });
        } else {
          resolve({
            success: false,
            message: `${installer.name} 安装失败 (退出码: ${code})`,
            output: output
          });
        }
      });
    });
  } catch (error) {
    return {
      success: false,
      message: `安装出错: ${error.message}`
    };
  }
});

// 环境检测
ipcMain.handle('check-environment', async () => {
  const results = {};
  const checks = [];

  for (const [key, installer] of Object.entries(INSTALLERS)) {
    checks.push(checkSoftware(key).then(result => {
      results[key] = result;
    }));
  }

  await Promise.all(checks);

  const projectPath = path.join(__dirname, '..');
  results.projectExists = fs.existsSync(projectPath);
  results.envExists = fs.existsSync(path.join(projectPath, '.env'));
  results.frontendExists = fs.existsSync(path.join(projectPath, 'frontend', 'package.json'));
  results.backendPackageExists = fs.existsSync(path.join(projectPath, 'package.json'));

  return results;
});

// 安装依赖
ipcMain.handle('install-dependencies', async (event, envType) => {
  return new Promise((resolve) => {
    const projectPath = path.join(__dirname, '..');
    let step = 0;
    const totalSteps = 7;

    const runCommand = (command, args, cwd, successMsg, failMsg) => {
      return new Promise((cmdResolve) => {
        event.sender.send('install-progress', {
          step: step,
          total: totalSteps,
          message: successMsg.replace('完成', '中...')
        });

        const child = spawn(command, args, { cwd: cwd, shell: true });

        let output = '';
        child.stdout?.on('data', (data) => {
          output += data.toString();
          event.sender.send('install-log', data.toString());
        });

        child.stderr?.on('data', (data) => {
          output += data.toString();
          event.sender.send('install-log', data.toString());
        });

        child.on('close', (code) => {
          if (code !== 0) {
            cmdResolve({ success: false, message: failMsg, output: output });
          } else {
            step++;
            event.sender.send('install-progress', {
              step: step,
              total: totalSteps,
              message: successMsg
            });
            cmdResolve({ success: true, output: output });
          }
        });
      });
    };

    async function runInstall() {
      let result = await runCommand('npm', ['install'], projectPath, '后端依赖安装完成', '后端依赖安装失败');
      if (!result.success) { resolve(result); return; }

      result = await runCommand('npm', ['install'], path.join(projectPath, 'frontend'), '前端依赖安装完成', '前端依赖安装失败');
      if (!result.success) { resolve(result); return; }

      result = await runCommand('npx', ['prisma', 'generate'], projectPath, 'Prisma客户端生成完成', 'Prisma客户端生成失败');
      if (!result.success) { resolve(result); return; }

      result = await runCommand('npx', ['prisma', 'migrate', 'deploy'], projectPath, '数据库迁移完成', '数据库迁移失败');
      if (!result.success) { resolve(result); return; }

      result = await runCommand('npm', ['run', 'seed:admin'], projectPath, '管理员账号初始化完成', '管理员账号初始化失败');
      if (!result.success) { resolve(result); return; }

      result = await runCommand('node', ['scripts/init-menus.js'], projectPath, '菜单数据初始化完成', '菜单数据初始化失败');
      if (!result.success) { resolve(result); return; }

      if (envType === 'production') {
        result = await runCommand('npm', ['run', 'build:prod'], path.join(projectPath, 'frontend'), '前端构建完成', '前端构建失败');
        if (!result.success) { resolve(result); return; }
      }

      resolve({ success: true, message: '所有安装步骤完成！' });
    }

    runInstall();
  });
});

// 配置环境变量
ipcMain.handle('configure-env', async (event, config) => {
  try {
    const envContent = `# 服务器配置
NODE_ENV=${config.nodeEnv}
PORT=${config.port}

# 数据库配置
DATABASE_URL="mysql://${config.dbUser}:${config.dbPassword}@${config.dbHost}:${config.dbPort}/${config.dbName}"

# JWT配置
JWT_SECRET=${config.jwtSecret}
JWT_EXPIRES_IN=${config.jwtExpiresIn}

# Redis配置
REDIS_HOST=${config.redisHost}
REDIS_PORT=${config.redisPort}
REDIS_PASSWORD=${config.redisPassword}

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# 日志配置
LOG_LEVEL=${config.logLevel}
LOG_DIR=./logs

# CORS配置
CORS_ORIGIN=${config.corsOrigin}

# 租户配置
DEFAULT_TRIAL_DAYS=30
DEFAULT_PLAN=free
`;

    await fs.promises.writeFile(path.join(__dirname, '..', '.env'), envContent);

    const frontendEnvContent = `# 前端${config.nodeEnv === 'production' ? '生产' : '开发'}环境配置
VITE_API_BASE_URL=${config.frontendApiUrl}
VITE_APP_TITLE=数企管家 ERP系统
VITE_MOCK_ENABLED=false
`;

    const envFileName = config.nodeEnv === 'production' ? '.env.production' : '.env.development';
    await fs.promises.writeFile(path.join(__dirname, '..', 'frontend', envFileName), frontendEnvContent);

    return { success: true, message: '环境配置完成' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// 启动开发服务器
ipcMain.handle('start-dev-servers', async (event) => {
  return new Promise((resolve) => {
    const projectPath = path.join(__dirname, '..');
    const frontendPath = path.join(projectPath, 'frontend');

    event.sender.send('server-log', '[后端] 启动中...');
    const backendProcess = spawn('npm', ['run', 'dev'], { cwd: projectPath, shell: true });

    backendProcess.stdout?.on('data', (data) => {
      event.sender.send('server-log', '[后端] ' + data.toString().trim());
    });

    backendProcess.stderr?.on('data', (data) => {
      event.sender.send('server-log', '[后端] ' + data.toString().trim());
    });

    backendProcess.on('close', () => {
      event.sender.send('server-log', '[后端] 已停止');
    });

    setTimeout(() => {
      event.sender.send('server-log', '[前端] 启动中...');
      const frontendProcess = spawn('npm', ['run', 'dev'], { cwd: frontendPath, shell: true });

      frontendProcess.stdout?.on('data', (data) => {
        event.sender.send('server-log', '[前端] ' + data.toString().trim());
      });

      frontendProcess.stderr?.on('data', (data) => {
        event.sender.send('server-log', '[前端] ' + data.toString().trim());
      });

      frontendProcess.on('close', () => {
        event.sender.send('server-log', '[前端] 已停止');
      });

      resolve({ success: true, message: '开发服务器启动完成' });
    }, 3000);
  });
});

// 打开安装程序目录
ipcMain.handle('open-installers-folder', async () => {
  const installersPath = path.join(__dirname, '..', 'installers');
  if (!fs.existsSync(installersPath)) {
    fs.mkdirSync(installersPath, { recursive: true });
  }
  shell.openPath(installersPath);
});

// 在浏览器中打开
ipcMain.handle('open-external', async (event, url) => {
  shell.openExternal(url);
});
