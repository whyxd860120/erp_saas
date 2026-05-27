/**
 * ERP系统增删改查功能测试脚本
 * 测试供应商、客户、物料、仓库管理的完整CRUD操作
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

const testConfig = {
  username: 'admin@demo.com',
  password: 'admin123',
  tenantSlug: 'demo'
};

let authToken = null;
let tenantId = null;

const log = {
  info: (msg) => console.log(`\n📘 [INFO] ${msg}`),
  success: (msg) => console.log(`\n✅ [SUCCESS] ${msg}`),
  error: (msg) => console.log(`\n❌ [ERROR] ${msg}`),
  warning: (msg) => console.log(`\n⚠️  [WARNING] ${msg}`),
  section: (title) => console.log(`\n${'='.repeat(60)}\n🔷 ${title}\n${'='.repeat(60)}`)
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class ERPTester {
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async login() {
    log.section('用户登录');

    try {
      const response = await this.client.post('/auth/login', {
        username: testConfig.username,
        password: testConfig.password,
        tenantSlug: testConfig.tenantSlug
      });

      if (response.data.success) {
        authToken = response.data.data.token;
        tenantId = response.data.data.tenantId;

        this.client.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

        log.success(`登录成功! Token: ${authToken.substring(0, 20)}...`);
        log.info(`租户ID: ${tenantId}`);

        return true;
      } else {
        log.error(`登录失败: ${response.data.message}`);
        return false;
      }
    } catch (error) {
      log.error(`登录请求失败: ${error.message}`);
      if (error.response) {
        log.error(`状态码: ${error.response.status}`);
        log.error(`错误信息: ${JSON.stringify(error.response.data)}`);
      }
      return false;
    }
  }

  async testWarehouseCRUD() {
    log.section('仓库管理 - 增删改查测试');

    let warehouseId = null;
    const testWarehouse = {
      code: `WH${Date.now()}`,
      name: `测试仓库_${Date.now()}`,
      address: '测试地址',
      manager: '测试管理员',
      status: 'active'
    };

    try {
      // 1. 创建仓库
      log.info('1. 创建仓库...');
      const createRes = await this.client.post('/warehouses', testWarehouse);

      if (createRes.data.success) {
        warehouseId = createRes.data.data.id;
        log.success(`仓库创建成功! ID: ${warehouseId}`);
        this.testResults.passed++;
      } else {
        log.error(`仓库创建失败: ${createRes.data.message}`);
        this.testResults.failed++;
        this.testResults.errors.push({ module: '仓库管理', operation: '创建', error: createRes.data.message });
      }

      // 2. 查询仓库列表
      log.info('2. 查询仓库列表...');
      await sleep(500);
      const listRes = await this.client.get('/warehouses');

      if (listRes.data.success && listRes.data.data.items) {
        log.success(`查询成功! 共 ${listRes.data.data.items.length} 个仓库`);
        this.testResults.passed++;

        const createdWarehouse = listRes.data.data.items.find(w => w.id === warehouseId);
        if (createdWarehouse) {
          log.info(`新创建的仓库在列表中: ${createdWarehouse.name}`);
        }
      } else {
        log.error('查询仓库列表失败');
        this.testResults.failed++;
      }

      // 3. 查询单个仓库详情
      if (warehouseId) {
        log.info('3. 查询仓库详情...');
        await sleep(500);
        const detailRes = await this.client.get(`/warehouses/${warehouseId}`);

        if (detailRes.data.success) {
          log.success(`查询成功! 仓库名称: ${detailRes.data.data.name}`);
          this.testResults.passed++;
        } else {
          log.error('查询仓库详情失败');
          this.testResults.failed++;
        }

        // 4. 更新仓库
        log.info('4. 更新仓库信息...');
        await sleep(500);
        const updateData = {
          name: `测试仓库_已修改_${Date.now()}`,
          manager: '新管理员'
        };
        const updateRes = await this.client.put(`/warehouses/${warehouseId}`, updateData);

        if (updateRes.data.success) {
          log.success('仓库信息更新成功!');
          this.testResults.passed++;
        } else {
          log.error(`仓库更新失败: ${updateRes.data.message}`);
          this.testResults.failed++;
          this.testResults.errors.push({ module: '仓库管理', operation: '更新', error: updateRes.data.message });
        }

        // 5. 删除仓库
        log.info('5. 删除仓库...');
        await sleep(500);
        const deleteRes = await this.client.delete(`/warehouses/${warehouseId}`);

        if (deleteRes.data.success) {
          log.success('仓库删除成功!');
          this.testResults.passed++;
        } else {
          log.error(`仓库删除失败: ${deleteRes.data.message}`);
          this.testResults.failed++;
          this.testResults.errors.push({ module: '仓库管理', operation: '删除', error: deleteRes.data.message });
        }
      }

    } catch (error) {
      log.error(`仓库管理测试异常: ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push({ module: '仓库管理', error: error.message });
    }
  }

  async testSupplierCRUD() {
    log.section('供应商管理 - 增删改查测试');

    let categoryId = null;
    let supplierId = null;

    // 1. 创建供应商分类
    log.info('1. 创建供应商分类...');
    try {
      const categoryRes = await this.client.post('/suppliers/categories', {
        name: `测试分类_${Date.now()}`,
        sortOrder: 0
      });

      if (categoryRes.data.success) {
        categoryId = categoryRes.data.data.id;
        log.success(`供应商分类创建成功! ID: ${categoryId}`);
        this.testResults.passed++;
      } else {
        log.error(`分类创建失败: ${categoryRes.data.message}`);
        this.testResults.failed++;
      }
    } catch (error) {
      log.error(`创建供应商分类异常: ${error.message}`);
      this.testResults.failed++;
    }

    // 2. 创建供应商
    log.info('2. 创建供应商...');
    const testSupplier = {
      code: `SUP${Date.now()}`,
      name: `测试供应商_${Date.now()}`,
      contact: '张三',
      phone: '13800138000',
      email: 'test@supplier.com',
      address: '供应商地址',
      bankName: '测试银行',
      bankAccount: '1234567890',
      categoryId: categoryId,
      status: 'active'
    };

    try {
      await sleep(500);
      const supplierRes = await this.client.post('/suppliers', testSupplier);

      if (supplierRes.data.success) {
        supplierId = supplierRes.data.data.id;
        log.success(`供应商创建成功! ID: ${supplierId}`);
        this.testResults.passed++;
      } else {
        log.error(`供应商创建失败: ${supplierRes.data.message}`);
        this.testResults.failed++;
        this.testResults.errors.push({ module: '供应商管理', operation: '创建', error: supplierRes.data.message });
      }
    } catch (error) {
      log.error(`创建供应商异常: ${error.message}`);
      this.testResults.failed++;
    }

    // 3. 查询供应商列表
    log.info('3. 查询供应商列表...');
    try {
      await sleep(500);
      const listRes = await this.client.get('/suppliers');

      if (listRes.data.success && listRes.data.data.items) {
        log.success(`查询成功! 共 ${listRes.data.data.items.length} 个供应商`);
        this.testResults.passed++;
      } else {
        log.error('查询供应商列表失败');
        this.testResults.failed++;
      }
    } catch (error) {
      log.error(`查询供应商列表异常: ${error.message}`);
      this.testResults.failed++;
    }

    // 4. 查询供应商详情
    if (supplierId) {
      log.info('4. 查询供应商详情...');
      try {
        await sleep(500);
        const detailRes = await this.client.get(`/suppliers/${supplierId}`);

        if (detailRes.data.success) {
          log.success(`查询成功! 供应商名称: ${detailRes.data.data.name}`);
          this.testResults.passed++;
        } else {
          log.error('查询供应商详情失败');
          this.testResults.failed++;
        }
      } catch (error) {
        log.error(`查询供应商详情异常: ${error.message}`);
        this.testResults.failed++;
      }

      // 5. 更新供应商
      log.info('5. 更新供应商信息...');
      try {
        await sleep(500);
        const updateRes = await this.client.put(`/suppliers/${supplierId}`, {
          contact: '李四',
          phone: '13900139000'
        });

        if (updateRes.data.success) {
          log.success('供应商信息更新成功!');
          this.testResults.passed++;
        } else {
          log.error(`供应商更新失败: ${updateRes.data.message}`);
          this.testResults.failed++;
          this.testResults.errors.push({ module: '供应商管理', operation: '更新', error: updateRes.data.message });
        }
      } catch (error) {
        log.error(`更新供应商异常: ${error.message}`);
        this.testResults.failed++;
      }

      // 6. 删除供应商
      log.info('6. 删除供应商...');
      try {
        await sleep(500);
        const deleteRes = await this.client.delete(`/suppliers/${supplierId}`);

        if (deleteRes.data.success) {
          log.success('供应商删除成功!');
          this.testResults.passed++;
        } else {
          log.error(`供应商删除失败: ${deleteRes.data.message}`);
          this.testResults.failed++;
          this.testResults.errors.push({ module: '供应商管理', operation: '删除', error: deleteRes.data.message });
        }
      } catch (error) {
        log.error(`删除供应商异常: ${error.message}`);
        this.testResults.failed++;
      }
    }

    // 7. 删除供应商分类
    if (categoryId) {
      log.info('7. 删除供应商分类...');
      try {
        await sleep(500);
        const deleteCatRes = await this.client.delete(`/suppliers/categories/${categoryId}`);

        if (deleteCatRes.data.success) {
          log.success('供应商分类删除成功!');
          this.testResults.passed++;
        } else {
          log.error(`供应商分类删除失败: ${deleteCatRes.data.message}`);
          this.testResults.failed++;
        }
      } catch (error) {
        log.error(`删除供应商分类异常: ${error.message}`);
        this.testResults.failed++;
      }
    }
  }

  async testCustomerCRUD() {
    log.section('客户管理 - 增删改查测试');

    let categoryId = null;
    let customerId = null;

    // 1. 创建客户分类
    log.info('1. 创建客户分类...');
    try {
      const categoryRes = await this.client.post('/customers/categories', {
        name: `测试客户分类_${Date.now()}`,
        sortOrder: 0
      });

      if (categoryRes.data.success) {
        categoryId = categoryRes.data.data.id;
        log.success(`客户分类创建成功! ID: ${categoryId}`);
        this.testResults.passed++;
      } else {
        log.error(`客户分类创建失败: ${categoryRes.data.message}`);
        this.testResults.failed++;
      }
    } catch (error) {
      log.error(`创建客户分类异常: ${error.message}`);
      this.testResults.failed++;
    }

    // 2. 创建客户
    log.info('2. 创建客户...');
    const testCustomer = {
      code: `CUST${Date.now()}`,
      name: `测试客户_${Date.now()}`,
      contact: '王五',
      phone: '13700137000',
      email: 'test@customer.com',
      address: '客户地址',
      categoryId: categoryId,
      status: 'active'
    };

    try {
      await sleep(500);
      const customerRes = await this.client.post('/customers', testCustomer);

      if (customerRes.data.success) {
        customerId = customerRes.data.data.id;
        log.success(`客户创建成功! ID: ${customerId}`);
        this.testResults.passed++;
      } else {
        log.error(`客户创建失败: ${customerRes.data.message}`);
        this.testResults.failed++;
        this.testResults.errors.push({ module: '客户管理', operation: '创建', error: customerRes.data.message });
      }
    } catch (error) {
      log.error(`创建客户异常: ${error.message}`);
      this.testResults.failed++;
    }

    // 3. 查询客户列表
    log.info('3. 查询客户列表...');
    try {
      await sleep(500);
      const listRes = await this.client.get('/customers');

      if (listRes.data.success && listRes.data.data.items) {
        log.success(`查询成功! 共 ${listRes.data.data.items.length} 个客户`);
        this.testResults.passed++;
      } else {
        log.error('查询客户列表失败');
        this.testResults.failed++;
      }
    } catch (error) {
      log.error(`查询客户列表异常: ${error.message}`);
      this.testResults.failed++;
    }

    // 4. 查询客户详情
    if (customerId) {
      log.info('4. 查询客户详情...');
      try {
        await sleep(500);
        const detailRes = await this.client.get(`/customers/${customerId}`);

        if (detailRes.data.success) {
          log.success(`查询成功! 客户名称: ${detailRes.data.data.name}`);
          this.testResults.passed++;
        } else {
          log.error('查询客户详情失败');
          this.testResults.failed++;
        }
      } catch (error) {
        log.error(`查询客户详情异常: ${error.message}`);
        this.testResults.failed++;
      }

      // 5. 更新客户
      log.info('5. 更新客户信息...');
      try {
        await sleep(500);
        const updateRes = await this.client.put(`/customers/${customerId}`, {
          contact: '赵六',
          phone: '13600136000'
        });

        if (updateRes.data.success) {
          log.success('客户信息更新成功!');
          this.testResults.passed++;
        } else {
          log.error(`客户更新失败: ${updateRes.data.message}`);
          this.testResults.failed++;
          this.testResults.errors.push({ module: '客户管理', operation: '更新', error: updateRes.data.message });
        }
      } catch (error) {
        log.error(`更新客户异常: ${error.message}`);
        this.testResults.failed++;
      }

      // 6. 删除客户
      log.info('6. 删除客户...');
      try {
        await sleep(500);
        const deleteRes = await this.client.delete(`/customers/${customerId}`);

        if (deleteRes.data.success) {
          log.success('客户删除成功!');
          this.testResults.passed++;
        } else {
          log.error(`客户删除失败: ${deleteRes.data.message}`);
          this.testResults.failed++;
          this.testResults.errors.push({ module: '客户管理', operation: '删除', error: deleteRes.data.message });
        }
      } catch (error) {
        log.error(`删除客户异常: ${error.message}`);
        this.testResults.failed++;
      }
    }

    // 7. 删除客户分类
    if (categoryId) {
      log.info('7. 删除客户分类...');
      try {
        await sleep(500);
        const deleteCatRes = await this.client.delete(`/customers/categories/${categoryId}`);

        if (deleteCatRes.data.success) {
          log.success('客户分类删除成功!');
          this.testResults.passed++;
        } else {
          log.error(`客户分类删除失败: ${deleteCatRes.data.message}`);
          this.testResults.failed++;
        }
      } catch (error) {
        log.error(`删除客户分类异常: ${error.message}`);
        this.testResults.failed++;
      }
    }
  }

  async testProductCRUD() {
    log.section('物料管理 - 增删改查测试');

    let categoryId = null;
    let productId = null;

    // 1. 创建物料分类
    log.info('1. 创建物料分类...');
    try {
      const categoryRes = await this.client.post('/products/categories', {
        name: `测试物料分类_${Date.now()}`,
        sortOrder: 0
      });

      if (categoryRes.data.success) {
        categoryId = categoryRes.data.data.id;
        log.success(`物料分类创建成功! ID: ${categoryId}`);
        this.testResults.passed++;
      } else {
        log.error(`物料分类创建失败: ${categoryRes.data.message}`);
        this.testResults.failed++;
      }
    } catch (error) {
      log.error(`创建物料分类异常: ${error.message}`);
      this.testResults.failed++;
    }

    // 2. 创建物料
    log.info('2. 创建物料...');
    const testProduct = {
      code: `PROD${Date.now()}`,
      name: `测试物料_${Date.now()}`,
      spec: '规格型号',
      unit: '个',
      categoryId: categoryId,
      costPrice: 10.5,
      salePrice: 20.0,
      status: 'active'
    };

    try {
      await sleep(500);
      const productRes = await this.client.post('/products', testProduct);

      if (productRes.data.success) {
        productId = productRes.data.data.id;
        log.success(`物料创建成功! ID: ${productId}`);
        this.testResults.passed++;
      } else {
        log.error(`物料创建失败: ${productRes.data.message}`);
        this.testResults.failed++;
        this.testResults.errors.push({ module: '物料管理', operation: '创建', error: productRes.data.message });
      }
    } catch (error) {
      log.error(`创建物料异常: ${error.message}`);
      this.testResults.failed++;
    }

    // 3. 查询物料列表
    log.info('3. 查询物料列表...');
    try {
      await sleep(500);
      const listRes = await this.client.get('/products');

      if (listRes.data.success && listRes.data.data.items) {
        log.success(`查询成功! 共 ${listRes.data.data.items.length} 个物料`);
        this.testResults.passed++;
      } else {
        log.error('查询物料列表失败');
        this.testResults.failed++;
      }
    } catch (error) {
      log.error(`查询物料列表异常: ${error.message}`);
      this.testResults.failed++;
    }

    // 4. 查询物料详情
    if (productId) {
      log.info('4. 查询物料详情...');
      try {
        await sleep(500);
        const detailRes = await this.client.get(`/products/${productId}`);

        if (detailRes.data.success) {
          log.success(`查询成功! 物料名称: ${detailRes.data.data.name}`);
          this.testResults.passed++;
        } else {
          log.error('查询物料详情失败');
          this.testResults.failed++;
        }
      } catch (error) {
        log.error(`查询物料详情异常: ${error.message}`);
        this.testResults.failed++;
      }

      // 5. 更新物料
      log.info('5. 更新物料信息...');
      try {
        await sleep(500);
        const updateRes = await this.client.put(`/products/${productId}`, {
          costPrice: 15.0,
          salePrice: 25.0
        });

        if (updateRes.data.success) {
          log.success('物料信息更新成功!');
          this.testResults.passed++;
        } else {
          log.error(`物料更新失败: ${updateRes.data.message}`);
          this.testResults.failed++;
          this.testResults.errors.push({ module: '物料管理', operation: '更新', error: updateRes.data.message });
        }
      } catch (error) {
        log.error(`更新物料异常: ${error.message}`);
        this.testResults.failed++;
      }

      // 6. 删除物料
      log.info('6. 删除物料...');
      try {
        await sleep(500);
        const deleteRes = await this.client.delete(`/products/${productId}`);

        if (deleteRes.data.success) {
          log.success('物料删除成功!');
          this.testResults.passed++;
        } else {
          log.error(`物料删除失败: ${deleteRes.data.message}`);
          this.testResults.failed++;
          this.testResults.errors.push({ module: '物料管理', operation: '删除', error: deleteRes.data.message });
        }
      } catch (error) {
        log.error(`删除物料异常: ${error.message}`);
        this.testResults.failed++;
      }
    }

    // 7. 删除物料分类
    if (categoryId) {
      log.info('7. 删除物料分类...');
      try {
        await sleep(500);
        const deleteCatRes = await this.client.delete(`/products/categories/${categoryId}`);

        if (deleteCatRes.data.success) {
          log.success('物料分类删除成功!');
          this.testResults.passed++;
        } else {
          log.error(`物料分类删除失败: ${deleteCatRes.data.message}`);
          this.testResults.failed++;
        }
      } catch (error) {
        log.error(`删除物料分类异常: ${error.message}`);
        this.testResults.failed++;
      }
    }
  }

  printSummary() {
    log.section('测试总结');

    const total = this.testResults.passed + this.testResults.failed;
    const passRate = total > 0 ? ((this.testResults.passed / total) * 100).toFixed(2) : 0;

    console.log(`\n📊 总测试数: ${total}`);
    console.log(`✅ 通过: ${this.testResults.passed}`);
    console.log(`❌ 失败: ${this.testResults.failed}`);
    console.log(`📈 通过率: ${passRate}%\n`);

    if (this.testResults.errors.length > 0) {
      log.warning('失败详情:');
      this.testResults.errors.forEach((err, index) => {
        console.log(`\n${index + 1}. 模块: ${err.module}`);
        if (err.operation) console.log(`   操作: ${err.operation}`);
        if (err.error) console.log(`   错误: ${err.error}`);
      });
    }

    console.log('\n' + '='.repeat(60));

    if (this.testResults.failed === 0) {
      console.log('\n🎉 所有测试通过! 系统功能运行正常。\n');
    } else {
      console.log(`\n⚠️  有 ${this.testResults.failed} 项测试失败，请检查上述错误信息。\n`);
    }
  }

  async runAllTests() {
    console.log('\n🚀 ERP系统增删改查功能测试开始...\n');
    console.log('测试时间:', new Date().toLocaleString('zh-CN'));
    console.log('后端地址:', BASE_URL);
    console.log('登录账号:', testConfig.username);

    // 1. 登录
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      log.error('登录失败，测试终止');
      return;
    }

    await sleep(1000);

    // 2. 测试仓库管理
    await this.testWarehouseCRUD();

    await sleep(1000);

    // 3. 测试供应商管理
    await this.testSupplierCRUD();

    await sleep(1000);

    // 4. 测试客户管理
    await this.testCustomerCRUD();

    await sleep(1000);

    // 5. 测试物料管理
    await this.testProductCRUD();

    // 6. 打印测试总结
    this.printSummary();
  }
}

// 运行测试
const tester = new ERPTester();
tester.runAllTests().catch(error => {
  console.error('\n❌ 测试脚本执行失败:', error.message);
  process.exit(1);
});
