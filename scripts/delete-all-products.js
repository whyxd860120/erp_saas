const axios = require('axios');

// 配置信息
const CONFIG = {
  baseUrl: 'http://localhost:8088', // 你的服务器地址
  username: 'admin', // 管理员用户名
  password: 'admin123', // 管理员密码
};

// 获取认证token
async function getAuthToken() {
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
      products.push(...items);
      
      console.log(`已获取 ${products.length}/${total} 个物料`);
      
      if (products.length >= total) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (error) {
      console.error('获取物料列表失败:', error.response?.data || error.message);
      throw error;
    }
  }

  return products;
}

// 检查物料是否可以删除
async function checkProductDeletable(token, product) {
  try {
    // 检查库存
    const inventoryResponse = await axios.get(`${CONFIG.baseUrl}/api/v1/inventory`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { productId: product.id },
    });

    const inventoryItems = inventoryResponse.data.data?.items || [];
    const hasInventory = inventoryItems.some(item => item.quantity > 0);

    if (hasInventory) {
      return { deletable: false, reason: '有库存' };
    }

    return { deletable: true };
  } catch (error) {
    console.error(`检查物料 ${product.code} 失败:`, error.response?.data || error.message);
    return { deletable: false, reason: '检查失败' };
  }
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
  console.log('开始删除所有物料...\n');

  try {
    // 1. 获取认证token
    console.log('1. 正在登录...');
    const token = await getAuthToken();
    console.log('✓ 登录成功\n');

    // 2. 获取所有物料
    console.log('2. 正在获取物料列表...');
    const products = await getAllProducts(token);
    console.log(`✓ 共找到 ${products.length} 个物料\n`);

    if (products.length === 0) {
      console.log('没有物料需要删除');
      return;
    }

    // 3. 检查每个物料是否可以删除
    console.log('3. 正在检查物料状态...');
    const deletableProducts = [];
    const nonDeletableProducts = [];

    for (const product of products) {
      const check = await checkProductDeletable(token, product);
      if (check.deletable) {
        deletableProducts.push(product);
      } else {
        nonDeletableProducts.push({
          ...product,
          reason: check.reason
        });
      }
      process.stdout.write(`\r检查进度: ${deletableProducts.length + nonDeletableProducts.length}/${products.length}`);
    }
    console.log('\n');

    console.log(`✓ 可删除: ${deletableProducts.length} 个`);
    console.log(`✗ 不可删除: ${nonDeletableProducts.length} 个\n`);

    if (nonDeletableProducts.length > 0) {
      console.log('不可删除的物料:');
      nonDeletableProducts.forEach(p => {
        console.log(`  - ${p.code} ${p.name} (${p.reason})`);
      });
      console.log();
    }

    if (deletableProducts.length === 0) {
      console.log('没有可删除的物料');
      return;
    }

    // 4. 确认删除
    console.log(`即将删除 ${deletableProducts.length} 个物料`);
    console.log('物料列表:');
    deletableProducts.forEach(p => {
      console.log(`  - ${p.code} ${p.name}`);
    });

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('\n确认删除吗？(yes/no): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('取消删除');
      return;
    }

    // 5. 批量删除
    console.log('\n4. 正在删除物料...');
    const batchSize = 50; // 每批删除50个
    let totalDeleted = 0;
    let totalFailed = 0;

    for (let i = 0; i < deletableProducts.length; i += batchSize) {
      const batch = deletableProducts.slice(i, i + batchSize);
      const batchIds = batch.map(p => p.id);

      try {
        const result = await deleteProductsBatch(token, batchIds);
        totalDeleted += result.data.successIds.length;
        totalFailed += result.data.errors.length;
        
        console.log(`批次 ${Math.floor(i/batchSize) + 1}: 成功 ${result.data.successIds.length}, 失败 ${result.data.errors.length}`);
        
        if (result.data.errors.length > 0) {
          result.data.errors.forEach(err => {
            console.log(`  - 失败: ${err.message}`);
          });
        }
      } catch (error) {
        console.error(`批次 ${Math.floor(i/batchSize) + 1} 删除失败:`, error.message);
        totalFailed += batchIds.length;
      }

      process.stdout.write(`\r总进度: ${Math.min(i + batchSize, deletableProducts.length)}/${deletableProducts.length}`);
    }
    console.log('\n');

    console.log('✓ 删除完成');
    console.log(`  成功: ${totalDeleted} 个`);
    console.log(`  失败: ${totalFailed} 个`);

  } catch (error) {
    console.error('\n删除过程出错:', error.message);
    process.exit(1);
  }
}

// 运行
deleteAllProducts();