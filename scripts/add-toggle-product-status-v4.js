const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/controllers/product.controller.ts');
let lines = fs.readFileSync(filePath, 'utf-8').split('\n');

// 找到第885行（};）之后的位置
const insertIndex = 885;

const newFunction = [
  '',
  '/**',
  ' * 切换商品状态',
  ' * PATCH /api/v1/products/:id/status',
  ' */',
  'export const toggleProductStatus = async (req: Request, res: Response) => {',
  '  try {',
  '    const { id } = req.params;',
  '    const { status } = req.body;',
  '',
  '    if (!req.user?.tenantId) {',
  '      return res.status(400).json({',
  '        success: false,',
  '        message: \'未关联租户\',',
  '      });',
  '    }',
  '',
  '    if (!status || ![\'active\', \'inactive\'].includes(status)) {',
  '      return res.status(400).json({',
  '        success: false,',
  '        message: \'无效的状态值\',',
  '      });',
  '    }',
  '',
  '    const product = await prisma.product.findFirst({',
  '      where: { id, tenantId: req.user.tenantId },',
  '    });',
  '',
  '    if (!product) {',
  '      return res.status(404).json({',
  '        success: false,',
  '        message: \'商品不存在\',',
  '      });',
  '    }',
  '',
  '    const updated = await prisma.product.update({',
  '      where: { id },',
  '      data: { status },',
  '      include: {',
  '        category: {',
  '          select: { id: true, name: true },',
  '        },',
  '      },',
  '    });',
  '',
  '    await auditLog({',
  '      tenantId: req.user.tenantId,',
  '      userId: req.user.id,',
  '      action: \'update\',',
  '      module: \'product\',',
  '      resource: id,',
  '      detail: `切换商品状态: ${product.name} -> ${status}`,',
  '      ip: req.ip,',
  '      userAgent: req.get(\'user-agent\'),',
  '    });',
  '',
  '    return res.json({',
  '      success: true,',
  '      data: updated,',
  '      message: `商品${status === \'active\' ? \'启用\' : \'禁用\'}成功`,',
  '    });',
  '  } catch (error) {',
  '    console.error(\'切换商品状态错误:\', error);',
  '    return res.status(500).json({',
  '      success: false,',
  '      message: \'切换商品状态失败\',',
  '    });',
  '  }',
  '};',
  ''
];

// 插入新函数
lines.splice(insertIndex, 0, ...newFunction);

console.log('✅ 在第' + insertIndex + '行后插入 toggleProductStatus 函数');

// 更新默认导出
const content = lines.join('\n');
const updatedContent = content.replace(
  /export default \{[\s\S]*?importProducts,[\s\S]*?\};/,
  (match) => {
    return match.replace('importProducts,', 'importProducts,\n  toggleProductStatus,');
  }
);

console.log('✅ 更新默认导出');

fs.writeFileSync(filePath, updatedContent, 'utf-8');
console.log('✅ product.controller.ts 已保存');

console.log('\n✨ 操作完成！');
