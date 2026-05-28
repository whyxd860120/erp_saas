const axios = require('axios');

// 配置信息 - 请根据实际情况修改
const CONFIG = {
  baseUrl: 'http://localhost:8088', // 你的服务器地址
  token: '', // 直接填入你的token，或者留空使用用户名密码登录
  username: 'admin', // 管理员用户名
  password: 'admin123', // 管理员密码
};

// 获取认证token
async function getAuthToken() {
  if (CONFIG.token) {
    return CONFIG.token;
  }

  try {
    const response = await axios.post(`${CONFIG.baseUrl}/api/v1/auth/login`, {
      username: CONFIG.username,
      password: CONFIG.password,
    });
    return response.data.data.token;
  } catch (error) {
    console.error('登录失败:', error.response?.data || error.message);
    throw error;
  }
}

// 获取所有物料
async function getAllProducts(token) {
  const products = [];
  let page = 1;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await axios.get(`${CONFIG.baseUrl}/api/v1/products`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit },
      });

      const { items, total } = response.data.data;
      if (!items || items.length === 0) break;
      
      products.push(...items);
      console.log(`已获取 ${products.length}/${total} 个物料`);
      
      if (products.length >= total || items.length < limit) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (error) {
      console.error('获取物料列表失败:', error.response?.data || error.message);
      break;
    }
  }

  return products;
}

// 批量删除物料
async function deleteProductsBatch(token, productIds) {
  try {
    const response = await axios.delete(`${CONFIG.baseUrl}/api/v1/products/batch`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { ids: productIds },
    });
    return response.data;
  } catch (error) {
    console.error('批量删除失败:', error.response?.data || error.message);
    throw error;
  }
}

// 主函数
async function deleteAllProducts() {
  console.log('========================================');
  console.log('   批量删除所有物料脚本');
  console.log('========================================\n');

  try {
    // 1. 获取认证token
    console.log('步骤 1: 获取认证token...');
    const token = await getAuthToken();
    console.log('✓ 认证成功\n');

    // 2. 获取所有物料
    console.log('步骤 2: 获取物料列表...');
    const products = await getAllProducts(token);
    console.log(`✓ 共找到 ${products.length} 个物料\n`);

    if (products.length === 0) {
      console.log('没有物料需要删除');
      return;
    }

    // 3. 显示物料列表
    console.log('步骤 3: 物料列表预览:');
    console.log('----------------------------------------');
    products.slice(0, 10).forEach((p, index) => {
      console.log(`${index + 1}. ${p.code} - ${p.name}`);
    });
    if (products.length > 10) {
      console.log(`... 还有 ${products.length - 10} 个物料`);
    }
    console.log('----------------------------------------\n');

    // 4. 确认删除
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question(`确认删除全部 ${products.length} 个物料吗？输入 'YES' 确认: `, resolve);
    });
    rl.close();

    if (answer !== 'YES') {
      console.log('取消删除操作');
      return;
    }

    // 5. 批量删除
    console.log('\n步骤 4: 开始批量删除...');
    const batchSize = 50; // 每批删除50个
    let totalDeleted = 0;
    let totalFailed = 0;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const batchIds = batch.map(p => p.id);

      try {
        const result = await deleteProductsBatch(token, batchIds);
        const successCount = result.data.successIds.length;
        const failedCount = result.data.errors.length;
        
        totalDeleted += successCount;
        totalFailed += failedCount;
        
        console.log(`批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(products.length/batchSize)}: 成功 ${successCount}, 失败 ${failedCount}`);
        
        if (failedCount > 0) {
          result.data.errors.forEach(err => {
            console.log(`  ✗ ${err.message}`);
          });
        }
      } catch (error) {
        console.error(`批次 ${Math.floor(i/batchSize) + 1} 删除失败:`, error.message);
        totalFailed += batchIds.length;
      }

      // 延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n========================================');
    console.log('   删除完成');
    console.log('========================================');
    console.log(`总计: ${products.length} 个物料`);
    console.log(`成功: ${totalDeleted} 个`);
    console.log(`失败: ${totalFailed} 个`);
    console.log('========================================');

  } catch (error) {
    console.error('\n删除过程出错:', error.message);
    process.exit(1);
  }
}

// 运行
deleteAllProducts();