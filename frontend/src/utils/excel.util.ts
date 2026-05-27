import * as XLSX from 'xlsx'

/**
 * 导出数据到 Excel 文件
 * @param data 数据数组
 * @param headers 表头配置 { key: 字段名, label: 显示名称 }
 * @param filename 文件名
 */
export function exportToExcel(
  data: any[],
  headers: { key: string; label: string }[],
  filename: string
) {
  // 转换数据格式
  const exportData = data.map(item => {
    const row: any = {}
    headers.forEach(header => {
      row[header.label] = item[header.key]
    })
    return row
  })

  // 创建工作簿
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(exportData)

  // 设置列宽
  const colWidths = headers.map(() => ({ wch: 15 }))
  ws['!cols'] = colWidths

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

  // 导出文件
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/**
 * 从 Excel 文件导入数据
 * @param file 文件对象
 * @param headers 表头配置 { key: 字段名, label: 显示名称 }
 * @returns Promise<导入的数据数组>
 */
export function importFromExcel(
  file: File,
  headers: { key: string; label: string }[]
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })

        // 读取第一个工作表
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // 转换为 JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        // 转换字段名
        const result = jsonData.map((row: any) => {
          const newRow: any = {}
          headers.forEach(header => {
            newRow[header.key] = row[header.label]
          })
          return newRow
        })

        resolve(result)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = (error) => reject(error)
    reader.readAsBinaryString(file)
  })
}

/**
 * 下载导入模板
 * @param headers 表头配置 { key: 字段名, label: 显示名称, example: 示例值 }
 * @param filename 文件名
 */
export function downloadTemplate(
  headers: { key: string; label: string; example?: string }[],
  filename: string
) {
  // 创建示例数据
  const exampleData: any = {}
  headers.forEach(header => {
    exampleData[header.label] = header.example || ''
  })

  // 创建工作簿
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet([exampleData])

  // 设置列宽
  const colWidths = headers.map(() => ({ wch: 15 }))
  ws['!cols'] = colWidths

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '模板')

  // 导出文件
  XLSX.writeFile(wb, `${filename}_模板.xlsx`)
}
