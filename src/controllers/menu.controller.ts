import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllMenus = async (req: Request, res: Response) => {
  try {
    const menus = await prisma.permission.findMany({
      where: { type: 'menu' },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const buildTree = (items: any[], parentId: string | null = null): any[] => {
      return items
        .filter(item => item.parentId === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id),
          hasChildren: items.some(i => i.parentId === item.id),
        }));
    };

    const tree = buildTree(menus);

    return res.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    console.error('获取菜单列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取菜单列表失败',
    });
  }
};

export const getMenuById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const menu = await prisma.permission.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, name: true },
        },
        children: {
          where: { type: 'menu' },
          select: { id: true, name: true },
        },
      },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: '菜单不存在',
      });
    }

    return res.json({
      success: true,
      data: menu,
    });
  } catch (error) {
    console.error('获取菜单详情错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取菜单详情失败',
    });
  }
};

export const getAllMenusFlat = async (req: Request, res: Response) => {
  try {
    const menus = await prisma.permission.findMany({
      where: { type: 'menu' },
      select: {
        id: true,
        name: true,
        parentId: true,
        code: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return res.json({
      success: true,
      data: menus,
    });
  } catch (error) {
    console.error('获取扁平菜单列表错误:', error);
    return res.status(500).json({
      success: false,
      message: '获取扁平菜单列表失败',
    });
  }
};

export const createMenu = async (req: Request, res: Response) => {
  try {
    const { name, code, path, icon, parentId, sortOrder, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: '菜单名称和编码不能为空',
      });
    }

    const existingMenu = await prisma.permission.findUnique({
      where: { code },
    });

    if (existingMenu) {
      return res.status(400).json({
        success: false,
        message: '菜单编码已存在',
      });
    }

    if (parentId) {
      const parentMenu = await prisma.permission.findUnique({
        where: { id: parentId },
      });

      if (!parentMenu || parentMenu.type !== 'menu') {
        return res.status(400).json({
          success: false,
          message: '父菜单不存在或不是菜单类型',
        });
      }
    }

    const menu = await prisma.permission.create({
      data: {
        name,
        code,
        type: 'menu',
        path: path || null,
        icon: icon || null,
        parentId: parentId || null,
        sortOrder: sortOrder || 0,
        description: description || null,
        isSystem: false,
      },
    });

    return res.json({
      success: true,
      message: '菜单创建成功',
      data: menu,
    });
  } catch (error) {
    console.error('创建菜单错误:', error);
    return res.status(500).json({
      success: false,
      message: '创建菜单失败',
    });
  }
};

export const updateMenu = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, path, icon, parentId, sortOrder, description } = req.body;

    const existingMenu = await prisma.permission.findUnique({
      where: { id },
    });

    if (!existingMenu) {
      return res.status(404).json({
        success: false,
        message: '菜单不存在',
      });
    }

    if (existingMenu.isSystem) {
      return res.status(400).json({
        success: false,
        message: '系统内置菜单不能修改',
      });
    }

    if (code && code !== existingMenu.code) {
      const codeExists = await prisma.permission.findUnique({
        where: { code },
      });

      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: '菜单编码已存在',
        });
      }
    }

    if (parentId === id) {
      return res.status(400).json({
        success: false,
        message: '不能将自己设置为父菜单',
      });
    }

    const children = await prisma.permission.findMany({
      where: { parentId: id },
    });
    const childIds = children.map(c => c.id);
    if (parentId && childIds.includes(parentId)) {
      return res.status(400).json({
        success: false,
        message: '不能将子菜单设置为父菜单',
      });
    }

    if (parentId) {
      const parentMenu = await prisma.permission.findUnique({
        where: { id: parentId },
      });

      if (!parentMenu || parentMenu.type !== 'menu') {
        return res.status(400).json({
          success: false,
          message: '父菜单不存在或不是菜单类型',
        });
      }
    }

    const menu = await prisma.permission.update({
      where: { id },
      data: {
        name,
        code,
        path: path || null,
        icon: icon || null,
        parentId: parentId || null,
        sortOrder: sortOrder !== undefined ? sortOrder : existingMenu.sortOrder,
        description: description !== undefined ? description : existingMenu.description,
      },
    });

    return res.json({
      success: true,
      message: '菜单更新成功',
      data: menu,
    });
  } catch (error) {
    console.error('更新菜单错误:', error);
    return res.status(500).json({
      success: false,
      message: '更新菜单失败',
    });
  }
};

export const deleteMenu = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingMenu = await prisma.permission.findUnique({
      where: { id },
    });

    if (!existingMenu) {
      return res.status(404).json({
        success: false,
        message: '菜单不存在',
      });
    }

    if (existingMenu.isSystem) {
      return res.status(400).json({
        success: false,
        message: '系统内置菜单不能删除',
      });
    }

    const childMenus = await prisma.permission.findMany({
      where: { parentId: id, type: 'menu' },
    });

    if (childMenus.length > 0) {
      return res.status(400).json({
        success: false,
        message: '请先删除子菜单',
      });
    }

    await prisma.rolePermission.deleteMany({
      where: { permissionId: id },
    });

    await prisma.permission.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: '菜单删除成功',
    });
  } catch (error) {
    console.error('删除菜单错误:', error);
    return res.status(500).json({
      success: false,
      message: '删除菜单失败',
    });
  }
};

export const batchUpdateMenus = async (req: Request, res: Response) => {
  try {
    const { menus } = req.body;

    if (!Array.isArray(menus)) {
      return res.status(400).json({
        success: false,
        message: '菜单数据格式错误',
      });
    }

    const updateOperations = async (items: any[], parentId: string | null = null, sortOrder = 0) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await prisma.permission.updateMany({
          where: { id: item.id },
          data: {
            parentId,
            sortOrder: sortOrder + i,
          },
        });

        if (item.children && item.children.length > 0) {
          await updateOperations(item.children, item.id, 0);
        }
      }
    };

    await updateOperations(menus);

    return res.json({
      success: true,
      message: '菜单排序更新成功',
    });
  } catch (error) {
    console.error('批量更新菜单错误:', error);
    return res.status(500).json({
      success: false,
      message: '批量更新菜单失败',
    });
  }
};

export default {
  getAllMenus,
  getMenuById,
  getAllMenusFlat,
  createMenu,
  updateMenu,
  deleteMenu,
  batchUpdateMenus,
};
