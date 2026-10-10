/**
 * 日历提醒
 *
 * 为什么要有这个：安卓的 Web Push 走 Google FCM，中国大陆收不到；
 * 小米/华为/荣耀/QQ/UC 浏览器大多没开放 Web Push。
 * 日历提醒不依赖任何推送服务 —— 系统日历会准点提醒，全平台通用。
 */
import { config } from '../config'

/** 订阅用的 .ics 地址（小米/华为日历里粘这个） */
export function calendarUrl(hour = 20, minute = 0, uid = 'default'): string {
  const p = `/api/push/calendar.ics?h=${hour}&m=${minute}&uid=${encodeURIComponent(uid)}`
  return config.aiGateway ? `${config.aiGateway}${p}` : p
}

/** webcal 形式（部分日历 App 认这个协议头，点了直接进订阅） */
export function webcalUrl(hour = 20, uid = 'default'): string {
  return calendarUrl(hour, 0, uid).replace(/^https?:\/\//, 'webcal://')
}

/** 下载 .ics 文件（系统会问用哪个日历打开） */
export function downloadIcs(hour = 20, uid = 'default'): void {
  const a = document.createElement('a')
  a.href = calendarUrl(hour, 0, uid)
  a.download = `vocabulary-agent-提醒-${hour}点.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** 各品牌日历的订阅入口（用户看这个才知道去哪粘） */
export function calendarSubscribeHint(): { brand: string; path: string }[] {
  return [
    { brand: '小米 / 红米', path: '日历 → 右上角「⋯」→ 订阅日历 → 添加 → 粘贴链接' },
    { brand: '华为 / 荣耀', path: '日历 → 右上角「⋯」→ 订阅管理 → 添加订阅 → 粘贴链接' },
    { brand: 'OPPO / vivo', path: '日历 → 设置 → 订阅日历 / 导入日历 → 粘贴链接' },
    { brand: 'iPhone', path: '设置 → 日历 → 账户 → 添加账户 → 其他 → 添加已订阅的日历' },
  ]
}
