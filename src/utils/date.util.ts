/**
 * 日期工具函数
 * 处理中国时区（UTC+8）的日期解析
 */

// 中国时区偏移量（毫秒）
const CHINA_TIMEZONE_OFFSET = 8 * 60 * 60 * 1000;

/**
 * 解析日期字符串，返回中国时区当天开始时间
 * @param dateStr 日期字符串，如 "2025-05-01"
 * @returns 中国时区当天 00:00:00 的 UTC Date 对象
 */
export function parseDateStart(dateStr: string): Date {
  // 先按当地时区解析日期部分
  const [year, month, day] = dateStr.split('-').map(Number);
  // 构造中国时区当天 00:00:00 的本地时间
  const localStart = new Date(year, month - 1, day, 0, 0, 0, 0);
  // 转换为 UTC 时间（减去 8 小时）
  return new Date(localStart.getTime() - CHINA_TIMEZONE_OFFSET);
}

/**
 * 解析日期字符串，返回中国时区当天结束时间
 * @param dateStr 日期字符串，如 "2025-05-01"
 * @returns 中国时区当天 23:59:59.999 的 UTC Date 对象
 */
export function parseDateEnd(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  // 构造中国时区当天 23:59:59.999 的本地时间
  const localEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
  // 转换为 UTC 时间（减去 8 小时）
  return new Date(localEnd.getTime() - CHINA_TIMEZONE_OFFSET);
}

/**
 * 将 Date 对象格式化为中国时区日期字符串
 * @param date Date 对象
 * @returns 格式化的日期字符串 "YYYY-MM-DD"
 */
export function formatDateToString(date: Date): string {
  // 获取中国时区的本地日期
  const chinaDate = new Date(date.getTime() + CHINA_TIMEZONE_OFFSET);
  const year = chinaDate.getUTCFullYear();
  const month = String(chinaDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(chinaDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default {
  parseDateStart,
  parseDateEnd,
  formatDateToString,
};