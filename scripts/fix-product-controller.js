const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/controllers/product.controller.ts');
let content = fs.readFileSync(filePath, 'utf-8');

console.log('修复 product.controller.ts...');

// 1. 在 deleteProduct 函数之后添加 toggleProductStatus
const insertStr = `message: '商品删除成功',
    });
  } catch (error) {
    console.error('删除商品错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除商品失败',
    });
  }
};

/**
 * 构建带计数的分类树
 */`;

const newContent = `message: '商品删除成功',
    });
  } catch (error) {
    console.error('删除商品错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除商品失败',
    });
  }
};

/**
 * 切换商品状态
 * PATCH /api/v1/products/:id/status
 */
export const toggleProductStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!req.user?.tenantId) {
      return res.status(400).json({
        success: false,
        message: '未关联租户',
      });
    }

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值',
      });
    }

    const product = await prisma.product.findFirst({
      where: { id, tenantId: req.user.tenantId },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在',
      });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { status },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    await auditLog({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: 'update',
      module: 'product',
      resource: id,
      detail: \`切换商品状态: \${product.name} -> \${status}\`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      success: true,
      data: updated,
      message: \`商品\${status === 'active' ? '启用' : '禁用'}成功\`,
    });
  } catch (error) {
    console.error('切换商品状态错误:', error);
    return res.status(500).json({
      success: false,
      message: '切换商品状态失败',
    });
  }
};

/**
 * 构建带计数的分类树
 */`;

content = content.replace(insertStr, newContent);
console.log('✅ 已添加 toggleProductStatus 函数');

// 2. 更新默认导出
const exportPattern = /export default \{[\s\S]*?\};/;
const exportMatch = content.match(exportPattern);

if (exportMatch) {
  let exportContent = exportMatch[0];

  // 检查是否已经包含所有必要的函数
  const requiredFunctions = [
    'getCategoryTree',
    'getCategories',
    'createCategory',
    'updateCategory',
    'deleteCategory',
    'importCategories',
    'getProducts',
    'getProductById',
    'createProduct',
    'updateProduct',
    'deleteProduct',
    'importProducts',
    'toggleProductStatus'
  ];

  let missingFunctions = requiredFunctions.filter(fn => !exportContent.includes(fn));

  if (missingFunctions.length > 0) {
    console.log('⚠️  发现缺失的函数:', missingFunctions.join(', '));

    // 重新生成导出
    const newExport = `export default {
  ${requiredFunctions.join(',\n  ')},
};`;

    content = content.replace(exportPattern, newExport);
    console.log('✅ 已修复默认导出');
  } else {
    console.log('ℹ️  默认导出已经完整');
  }
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ 文件已保存');

console.log('\n✨ 操作完成！');
