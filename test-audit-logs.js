const axios = require('axios');

async function testAuditLogsAPI() {
  try {
    console.log('🧪 开始测试审计日志API...');
    
    // 1. 登录获取Token
    console.log('\n1️⃣ 登录获取Token...');
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: 'admin@example.com',
      password: '123456',
    });
    
    if (!loginResponse.data.success) {
      console.error('❌ 登录失败:', loginResponse.data.message);
      return;
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ 登录成功，Token已获取');
    
    // 2. 测试审计日志API
    console.log('\n2️⃣ 测试审计日志API...');
    const auditLogsResponse = await axios.get('http://localhost:3000/api/v1/audit-logs?page=1&limit=10', {
      headers: {
        'Authorization': 'Bearer ' + token,
      },
    });
    
    console.log('✅ 审计日志API调用成功！');
    console.log('📊 返回数据:');
    console.log('  - 总数:', auditLogsResponse.data.data.total);
    console.log('  - 当前页:', auditLogsResponse.data.data.page);
    console.log('  - 每页条数:', auditLogsResponse.data.data.limit);
    console.log('  - 数据条数:', auditLogsResponse.data.data.items.length);
    
    if (auditLogsResponse.data.data.items.length > 0) {
      console.log('\n📝 第一条记录:');
      const firstItem = auditLogsResponse.data.data.items[0];
      console.log('  - ID:', firstItem.id);
      console.log('  - 用户ID:', firstItem.userId);
      console.log('  - 用户名称:', firstItem.user?.name || '无');
      console.log('  - 操作:', firstItem.action);
      console.log('  - 实体:', firstItem.entity);
      console.log('  - 创建时间:', firstItem.createdAt);
    }
    
    console.log('\n🎉 测试完成！审计日志API正常工作！');
    
  } catch (error) {
    console.error('\n❌ 测试失败！');
    
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误响应:', error.response.data);
      
      if (error.response.status === 500) {
        console.error('\n🔍 500错误详情:');
        if (error.response.data.error) {
          console.error('  - 错误信息:', error.response.data.error);
        }
        if (error.response.data.message) {
          console.error('  - 错误消息:', error.response.data.message);
        }
      }
    } else {
      console.error('错误:', error.message);
    }
  }
}

testAuditLogsAPI();
