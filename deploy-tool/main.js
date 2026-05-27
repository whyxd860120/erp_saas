const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { spawn, exec } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: '数企管家 部署工具',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setMenu(null);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 环境检测
ipcMain.handle('check-environment', async () => {
  return new Promise((resolve) => {
    const results = {
      node: { installed: false, version: '', status: 'unknown' },
      mysql: { installed: false, version: '', status: 'unknown' },
      redis: { installed: false, version: '', status: 'unknown' },
      npm: { installed: false, version: '', status: 'unknown' },
      prisma: { installed: false, version: '', status: 'unknown' },
      projectExists: false,
      envExists: false,
      frontendExists: false,
      backendPackageExists: false
    };

    let completed = 0;
    const totalChecks = 6;

    const checkComplete = () => {
      completed++;
      if (completed >= totalChecks) {
        resolve(results);
      }
    };

    // 检测 Node.js
    exec('node --version', (error, stdout) => {
      if (!error) {
        results.node.installed = true;
        results.node.version = stdout.trim();
        results.node.status = 'ok';
      } else {
        results.node.status = 'missing';
      }
      checkComplete();
    });

    // 检测 npm
    exec('npm --version', (error, stdout) => {
      if (!error) {
        results.npm.installed = true;
        results.npm.version = stdout.trim();
        results.npm.status = 'ok';
      } else {
        results.npm.status = 'missing';
      }
      checkComplete();
    });

    // 检测 MySQL
    exec('mysql --version', (error, stdout) => {
      if (!error) {
        results.mysql.installed = true;
        results.mysql.version = stdout.trim();
        results.mysql.status = 'ok';
      } else {
        // 尝试另一种检测方式
        exec('where mysql', (err) => {
          if (!err) {
            results.mysql.installed = true;
            results.mysql.status = 'ok';
          }
          checkComplete();
        });
        return;
      }
      checkComplete();
    });

    // 检测 Redis
    exec('redis-cli --version', (error, stdout) => {
      if (!error) {
        results.redis.installed = true;
        results.redis.version = stdout.trim();
        results.redis.status = 'ok';
      } else {
        exec('where redis-cli', (err) => {
          if (!err) {
            results.redis.installed = true;
            results.redis.status = 'ok';
          }
          checkComplete();
        });
        return;
      }
      checkComplete();
    });

    // 检测 Prisma
    exec('npx prisma --version', (error, stdout) => {
      if (!error) {
        results.prisma.installed = true;
        results.prisma.version = stdout.trim();
        results.prisma.status = 'ok';
      } else {
        results.prisma.status = 'missing';
      }
      checkComplete();
    });

    // 检测项目文件
    setTimeout(() => {
      const projectPath = path.join(__dirname, '..');
      results.projectExists = fs.existsSync(projectPath);
      results.envExists = fs.existsSync(path.join(projectPath, '.env'));
      results.frontendExists = fs.existsSync(path.join(projectPath, 'frontend', 'package.json'));
      results.backendPackageExists = fs.existsSync(path.join(projectPath, 'package.json'));
      checkComplete();
    }, 100);
  });
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

        const child = spawn(command, args, { cwd: cwd });
        
        child.stdout.on('data', (data) => {
          event.sender.send('install-log', data.toString());
        });

        child.stderr.on('data', (data) => {
          event.sender.send('install-log', data.toString());
        });

        child.on('close', (code) => {
          if (code !== 0) {
            cmdResolve({ success: false, message: failMsg });
          } else {
            step++;
            event.sender.send('install-progress', { 
              step: step, 
              total: totalSteps,
              message: successMsg 
            });
            cmdResolve({ success: true });
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
        result = await runCommand('npm', ['run', 'build'], path.join(projectPath, 'frontend'), '前端构建完成', '前端构建失败');
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

    await fs.writeFile(path.join(__dirname, '..', '.env'), envContent);

    // 配置前端环境
    const frontendEnvContent = `# 前端${config.nodeEnv === 'production' ? '生产' : '开发'}环境配置
VITE_API_BASE_URL=${config.frontendApiUrl}
VITE_APP_TITLE=ERP2026 进销存管理系统
VITE_MOCK_ENABLED=false
`;

    const envFileName = config.nodeEnv === 'production' ? '.env.production' : '.env.development';
    await fs.writeFile(path.join(__dirname, '..', 'frontend', envFileName), frontendEnvContent);

    return { success: true, message: '环境配置完成' };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// 初始化数据库
ipcMain.handle('init-database', async (event) => {
  return new Promise((resolve) => {
    const projectPath = path.join(__dirname, '..');
    
    event.sender.send('install-progress', { step: 0, message: '开始数据库迁移...' });

    const migrate = spawn('npx', ['prisma', 'migrate', 'deploy'], { cwd: projectPath });
    
    migrate.stdout.on('data', (data) => {
      event.sender.send('install-log', data.toString());
    });

    migrate.stderr.on('data', (data) => {
      event.sender.send('install-log', data.toString());
    });

    migrate.on('close', (code) => {
      if (code !== 0) {
        resolve({ success: false, message: '数据库迁移失败' });
        return;
      }

      event.sender.send('install-progress', { step: 1, message: '数据库迁移完成，初始化管理员账号...' });

      const seedAdmin = spawn('npm', ['run', 'seed:admin'], { cwd: projectPath });
      
      seedAdmin.stdout.on('data', (data) => {
        event.sender.send('install-log', data.toString());
      });

      seedAdmin.stderr.on('data', (data) => {
        event.sender.send('install-log', data.toString());
      });

      seedAdmin.on('close', (code) => {
        if (code !== 0) {
          resolve({ success: false, message: '管理员账号初始化失败' });
          return;
        }

        event.sender.send('install-progress', { step: 2, message: '初始化菜单数据...' });

        const initMenus = spawn('node', ['scripts/init-menus.js'], { cwd: projectPath });
        
        initMenus.stdout.on('data', (data) => {
          event.sender.send('install-log', data.toString());
        });

        initMenus.stderr.on('data', (data) => {
          event.sender.send('install-log', data.toString());
        });

        initMenus.on('close', (code) => {
          if (code !== 0) {
            resolve({ success: false, message: '菜单数据初始化失败' });
            return;
          }

          resolve({ success: true, message: '数据库初始化完成' });
        });
      });
    });
  });
});

// 构建前端
ipcMain.handle('build-frontend', async (event, envType) => {
  return new Promise((resolve) => {
    const frontendPath = path.join(__dirname, '..', 'frontend');
    const buildCommand = envType === 'production' ? 'build:prod' : 'build:dev';

    event.sender.send('install-progress', { step: 0, message: '开始构建前端...' });

    const build = spawn('npm', ['run', buildCommand], { cwd: frontendPath });
    
    build.stdout.on('data', (data) => {
      event.sender.send('install-log', data.toString());
    });

    build.stderr.on('data', (data) => {
      event.sender.send('install-log', data.toString());
    });

    build.on('close', (code) => {
      if (code !== 0) {
        resolve({ success: false, message: '前端构建失败' });
        return;
      }
      resolve({ success: true, message: '前端构建完成' });
    });
  });
});

// 启动开发服务器
let backendProcess = null;
let frontendProcess = null;

ipcMain.handle('start-dev-servers', async (event) => {
  return new Promise((resolve) => {
    const projectPath = path.join(__dirname, '..');
    const frontendPath = path.join(projectPath, 'frontend');

    // 启动后端
    event.sender.send('server-log', '[后端] 启动中...');
    backendProcess = spawn('npm', ['run', 'dev'], { cwd: projectPath });

    backendProcess.stdout.on('data', (data) => {
      event.sender.send('server-log', '[后端] ' + data.toString().trim());
    });

    backendProcess.stderr.on('data', (data) => {
      event.sender.send('server-log', '[后端] ' + data.toString().trim());
    });

    backendProcess.on('close', () => {
      event.sender.send('server-log', '[后端] 已停止');
      backendProcess = null;
    });

    // 启动前端
    setTimeout(() => {
      event.sender.send('server-log', '[前端] 启动中...');
      frontendProcess = spawn('npm', ['run', 'dev'], { cwd: frontendPath });

      frontendProcess.stdout.on('data', (data) => {
        event.sender.send('server-log', '[前端] ' + data.toString().trim());
      });

      frontendProcess.stderr.on('data', (data) => {
        event.sender.send('server-log', '[前端] ' + data.toString().trim());
      });

      frontendProcess.on('close', () => {
        event.sender.send('server-log', '[前端] 已停止');
        frontendProcess = null;
      });

      resolve({ success: true, message: '开发服务器启动完成' });
    }, 3000);
  });
});

// 停止服务器
ipcMain.handle('stop-servers', async () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  if (frontendProcess) {
    frontendProcess.kill();
    frontendProcess = null;
  }
  return { success: true, message: '服务器已停止' };
});

// 选择项目目录
ipcMain.handle('select-project-dir', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择项目目录'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});
