/**
 * 标准化API响应格式
 * Standardized API Response Format
 * 
 * 遵循主流SaaS API设计规范：
 * - JSend规范 (https://github.com/omniti-labs/jsend)
 * - JSON API规范 (https://jsonapi.org/)
 * - Stripe API风格
 */

// 标准响应结构
export interface ApiResponse<T = any> {
  success: boolean;
  code: string;
  message: string;
  data?: T;
  meta?: ResponseMeta;
  errors?: ApiError[];
}

// 响应元数据
export interface ResponseMeta {
  timestamp: string;
  requestId: string;
  path?: string;
  method?: string;
  // 分页信息
  pagination?: PaginationMeta;
  // 额外统计信息
  stats?: Record<string, number>;
}

// 分页元数据
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// API错误结构
export interface ApiError {
  field?: string;
  code: string;
  message: string;
  details?: any;
}

// 错误码定义
export enum ErrorCode {
  // 通用错误 (1xxx)
  UNKNOWN_ERROR = 'E1000',
  INTERNAL_ERROR = 'E1001',
  NOT_IMPLEMENTED = 'E1002',
  SERVICE_UNAVAILABLE = 'E1003',
  TIMEOUT = 'E1004',

  // 请求错误 (2xxx)
  BAD_REQUEST = 'E2000',
  VALIDATION_ERROR = 'E2001',
  MISSING_PARAMETER = 'E2002',
  INVALID_PARAMETER = 'E2003',
  INVALID_JSON = 'E2004',
  REQUEST_TOO_LARGE = 'E2005',
  UNSUPPORTED_MEDIA_TYPE = 'E2006',

  // 认证授权错误 (3xxx)
  UNAUTHORIZED = 'E3000',
  TOKEN_EXPIRED = 'E3001',
  TOKEN_INVALID = 'E3002',
  TOKEN_MISSING = 'E3003',
  INSUFFICIENT_PERMISSIONS = 'E3004',
  FORBIDDEN = 'E3005',
  API_KEY_INVALID = 'E3006',
  API_KEY_EXPIRED = 'E3007',
  API_KEY_MISSING = 'E3008',

  // 资源错误 (4xxx)
  NOT_FOUND = 'E4000',
  RESOURCE_NOT_FOUND = 'E4001',
  RESOURCE_ALREADY_EXISTS = 'E4002',
  RESOURCE_CONFLICT = 'E4003',
  RESOURCE_GONE = 'E4004',

  // 租户错误 (5xxx)
  TENANT_NOT_FOUND = 'E5000',
  TENANT_INACTIVE = 'E5001',
  TENANT_SUSPENDED = 'E5002',
  TENANT_EXPIRED = 'E5003',
  TENANT_QUOTA_EXCEEDED = 'E5004',
  FEATURE_NOT_ENABLED = 'E5005',

  // 业务错误 (6xxx)
  BUSINESS_RULE_VIOLATION = 'E6000',
  INVALID_STATUS_TRANSITION = 'E6001',
  INSUFFICIENT_INVENTORY = 'E6002',
  DUPLICATE_ENTRY = 'E6003',
  OPERATION_NOT_ALLOWED = 'E6004',
  DEPENDENCY_EXISTS = 'E6005',

  // 限流错误 (7xxx)
  RATE_LIMIT_EXCEEDED = 'E7000',
  QUOTA_EXCEEDED = 'E7001',
  CONCURRENT_LIMIT_EXCEEDED = 'E7002',
}

// 成功响应类
export class ApiSuccess {
  /**
   * 创建成功响应
   */
  static create<T>(
    data: T,
    message: string = '操作成功',
    code: string = 'SUCCESS',
    meta?: Partial<ResponseMeta>
  ): ApiResponse<T> {
    return {
      success: true,
      code,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: meta?.requestId || generateRequestId(),
        ...meta,
      },
    };
  }

  /**
   * 创建列表响应（带分页）
   */
  static list<T>(
    items: T[],
    pagination: PaginationMeta,
    message: string = '查询成功',
    meta?: Partial<ResponseMeta>
  ): ApiResponse<T[]> {
    return {
      success: true,
      code: 'SUCCESS',
      message,
      data: items,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: meta?.requestId || generateRequestId(),
        pagination,
        ...meta,
      },
    };
  }

  /**
   * 创建创建成功响应
   */
  static created<T>(
    data: T,
    message: string = '创建成功',
    meta?: Partial<ResponseMeta>
  ): ApiResponse<T> {
    return this.create(data, message, 'CREATED', meta);
  }

  /**
   * 创建更新成功响应
   */
  static updated<T>(
    data: T,
    message: string = '更新成功',
    meta?: Partial<ResponseMeta>
  ): ApiResponse<T> {
    return this.create(data, message, 'UPDATED', meta);
  }

  /**
   * 创建删除成功响应
   */
  static deleted(
    message: string = '删除成功',
    meta?: Partial<ResponseMeta>
  ): ApiResponse<null> {
    return {
      success: true,
      code: 'DELETED',
      message,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: meta?.requestId || generateRequestId(),
        ...meta,
      },
    };
  }

  /**
   * 创建空数据响应
   */
  static empty(
    message: string = '暂无数据',
    meta?: Partial<ResponseMeta>
  ): ApiResponse<null> {
    return {
      success: true,
      code: 'EMPTY',
      message,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: meta?.requestId || generateRequestId(),
        ...meta,
      },
    };
  }
}

// 错误响应类
export class ApiError {
  /**
   * 创建错误响应
   */
  static create(
    code: ErrorCode | string,
    message: string,
    errors?: Array<{ field?: string; message: string; details?: any }>,
    meta?: Partial<ResponseMeta>
  ): ApiResponse {
    return {
      success: false,
      code,
      message,
      errors: errors?.map(e => ({
        field: e.field,
        code: code.toString(),
        message: e.message,
        details: e.details,
      })),
      meta: {
        timestamp: new Date().toISOString(),
        requestId: meta?.requestId || generateRequestId(),
        ...meta,
      },
    };
  }

  /**
   * 400 - 请求错误
   */
  static badRequest(
    message: string = '请求参数错误',
    errors?: Array<{ field?: string; message: string }>,
    meta?: Partial<ResponseMeta>
  ): ApiResponse {
    return this.create(ErrorCode.BAD_REQUEST, message, errors, meta);
  }

  /**
   * 401 - 未认证
   */
  static unauthorized(
    message: string = '请先登录',
    meta?: Partial<ResponseMeta>
  ): ApiResponse {
    return this.create(ErrorCode.UNAUTHORIZED, message, undefined, meta);
  }

  /**
   * 403 - 无权限
   */
  static forbidden(
    message: string = '权限不足',
    meta?: Partial<ResponseMeta>
  ): ApiResponse {
    return this.create(ErrorCode.FORBIDDEN, message, undefined, meta);
  }

  /**
   * 404 - 资源不存在
   */
  static notFound(
    resource: string = '资源',
    meta?: Partial<ResponseMeta>
  ): ApiResponse {
    return this.create(ErrorCode.NOT_FOUND, `${resource}不存在`, undefined, meta);
  }

  /**
   * 409 - 资源冲突
   */
  static conflict(
    message: string = '资源冲突',
    meta?: Partial<ResponseMeta>
  ): ApiResponse {
    return this.create(ErrorCode.RESOURCE_CONFLICT, message, undefined, meta);
  }

  /**
   * 422 - 验证错误
   */
  static validation(
    errors: Array<{ field: string; message: string }>,
    meta?: Partial<ResponseMeta>
  ): ApiResponse {
    return this.create(ErrorCode.VALIDATION_ERROR, '数据验证失败', errors, meta);
  }

  /**
   * 429 - 请求过于频繁
   */
  static rateLimit(
    retryAfter: number,
    meta?: Partial<ResponseMeta>
  ): ApiResponse {
    return this.create(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      `请求过于频繁，请${retryAfter}秒后重试`,
      undefined,
      meta
    );
  }

  /**
   * 500 - 服务器内部错误
   */
  static internal(
    message: string = '服务器内部错误',
    meta?: Partial<ResponseMeta>
  ): ApiResponse {
    return this.create(ErrorCode.INTERNAL_ERROR, message, undefined, meta);
  }

  /**
   * 503 - 服务不可用
   */
  static serviceUnavailable(
    message: string = '服务暂时不可用',
    meta?: Partial<ResponseMeta>
  ): ApiResponse {
    return this.create(ErrorCode.SERVICE_UNAVAILABLE, message, undefined, meta);
  }
}

// 分页工具类
export class Pagination {
  /**
   * 创建分页元数据
   */
  static createMeta(
    page: number,
    pageSize: number,
    totalCount: number
  ): PaginationMeta {
    const totalPages = Math.ceil(totalCount / pageSize);
    
    return {
      page,
      pageSize,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  /**
   * 计算skip值
   */
  static calculateSkip(page: number, pageSize: number): number {
    return (page - 1) * pageSize;
  }

  /**
   * 规范化分页参数
   */
  static normalizeParams(
    page: any,
    pageSize: any,
    defaultPageSize: number = 20,
    maxPageSize: number = 100
  ): { page: number; pageSize: number } {
    let normalizedPage = parseInt(page) || 1;
    let normalizedPageSize = parseInt(pageSize) || defaultPageSize;

    if (normalizedPage < 1) normalizedPage = 1;
    if (normalizedPageSize < 1) normalizedPageSize = defaultPageSize;
    if (normalizedPageSize > maxPageSize) normalizedPageSize = maxPageSize;

    return { page: normalizedPage, pageSize: normalizedPageSize };
  }
}

// 辅助函数
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Express响应扩展
export const apiResponse = {
  /**
   * 发送成功响应
   */
  success: function<T>(
    this: any,
    data: T,
    message?: string,
    code?: string
  ) {
    const meta = {
      requestId: this.req.headers['x-request-id'] as string,
      path: this.req.path,
      method: this.req.method,
    };
    return this.json(ApiSuccess.create(data, message, code, meta));
  },

  /**
   * 发送列表响应
   */
  list: function<T>(
    this: any,
    items: T[],
    pagination: PaginationMeta,
    message?: string
  ) {
    const meta = {
      requestId: this.req.headers['x-request-id'] as string,
      path: this.req.path,
      method: this.req.method,
    };
    return this.json(ApiSuccess.list(items, pagination, message, meta));
  },

  /**
   * 发送创建成功响应
   */
  created: function<T>(this: any, data: T, message?: string) {
    const meta = {
      requestId: this.req.headers['x-request-id'] as string,
      path: this.req.path,
      method: this.req.method,
    };
    return this.status(201).json(ApiSuccess.created(data, message, meta));
  },

  /**
   * 发送错误响应
   */
  error: function(
    this: any,
    code: ErrorCode | string,
    message: string,
    statusCode: number = 400,
    errors?: any[]
  ) {
    const meta = {
      requestId: this.req.headers['x-request-id'] as string,
      path: this.req.path,
      method: this.req.method,
    };
    return this.status(statusCode).json(ApiError.create(code, message, errors, meta));
  },
};

// 全局响应扩展声明
declare global {
  namespace Express {
    interface Response {
      apiSuccess: <T>(data: T, message?: string, code?: string) => void;
      apiList: <T>(items: T[], pagination: PaginationMeta, message?: string) => void;
      apiCreated: <T>(data: T, message?: string) => void;
      apiError: (code: ErrorCode | string, message: string, statusCode?: number, errors?: any[]) => void;
    }
  }
}

export default {
  ApiSuccess,
  ApiError,
  Pagination,
  ErrorCode,
  apiResponse,
};
