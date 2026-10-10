/**
 * 平台 / 浏览器识别
 *
 * 中国用户的入口很分散：微信内置浏览器、小米浏览器、华为浏览器、
 * QQ 浏览器、UC……「添加到主屏幕」的路径每家都不一样，
 * 给错步骤等于没给。所以这里做精确识别，再给对应指引。
 */

export type Platform =
  | 'wechat'          // 微信内置浏览器（不支持加主屏，必须先跳浏览器）
  | 'xiaomi'          // 小米浏览器
  | 'huawei'          // 华为浏览器（含鸿蒙）
  | 'honor'           // 荣耀浏览器
  | 'qq'              // QQ 浏览器
  | 'uc'              // UC 浏览器
  | 'android-chrome'  // 安卓 Chrome / Edge
  | 'android-other'
  | 'ios-safari'
  | 'ios-inapp'       // iOS 上的 App 内置浏览器（非 Safari）
  | 'ios-other'
  | 'desktop'

export interface PlatformInfo {
  platform: Platform
  name: string
  isMobile: boolean
  isWechat: boolean
  isIOS: boolean
  isAndroid: boolean
  /** 是否已经作为独立 App 运行（已加到主屏） */
  standalone: boolean
  /** 当前环境能否「添加到主屏幕」 */
  canAddToHome: boolean
  /** 当前环境能否接收推送（技术层面） */
  canPush: boolean
  /** 推送是否真的能送达（中国大陆的安卓基本不行，见 pushCaveat） */
  pushReliable: boolean
  /** 推送不可靠的原因（给用户看的解释） */
  pushCaveat: string
  /** 推荐的提醒方式 */
  reminderMode: 'push' | 'calendar' | 'none'
  /** 加到主屏幕的步骤 */
  steps: string[]
  /** 补充说明 */
  note: string
}

const ua = () => (typeof navigator === 'undefined' ? '' : navigator.userAgent || '')

function detectPlatform(): Platform {
  const u = ua()
  if (/MicroMessenger/i.test(u)) return 'wechat'
  if (/MiuiBrowser|XiaoMi|HMSCore.*Browser/i.test(u)) return 'xiaomi'
  // 荣耀已独立于华为，UA 各不相同，分开识别
  if (/HonorBrowser|HONOR|HuaweiBrowser.*Honor/i.test(u)) return 'honor'
  if (/HuaweiBrowser|HBPC|HarmonyOS|ArkWeb/i.test(u)) return 'huawei'
  if (/MQQBrowser/i.test(u) && !/MicroMessenger/i.test(u)) return 'qq'
  if (/UCBrowser|UBrowser|UCWEB/i.test(u)) return 'uc'

  const ios = /iPad|iPhone|iPod/.test(u) || (/Macintosh/.test(u) && 'ontouchend' in document)
  if (ios) {
    // iOS 上非 Safari 的浏览器（Chrome iOS / 各 App 内置）都加不了主屏
    if (/CriOS|FxiOS|EdgiOS/i.test(u)) return 'ios-other'
    if (/Safari/i.test(u)) return 'ios-safari'
    return 'ios-inapp'
  }

  if (/Android/i.test(u)) {
    if (/Chrome|EdgA|SamsungBrowser/i.test(u)) return 'android-chrome'
    return 'android-other'
  }
  return 'desktop'
}

const STEPS: Record<Platform, { name: string; steps: string[]; note: string; canAdd: boolean }> = {
  wechat: {
    name: '微信内置浏览器',
    canAdd: false,
    steps: [
      '点右上角的「⋯」按钮',
      '选「在浏览器打开」',
      '跳转后用下面「安卓/iPhone」对应的步骤添加到主屏幕',
    ],
    note: '微信内置浏览器不支持添加到主屏幕，必须先跳到系统浏览器。',
  },
  xiaomi: {
    name: '小米浏览器',
    canAdd: true,
    steps: [
      '点底部中间的「≡」菜单',
      '选「添加到桌面」',
      '弹窗点「添加」',
    ],
    note: '小米浏览器（MIUI）在底部菜单里，不在右上角。',
  },
  huawei: {
    name: '华为浏览器',
    canAdd: true,
    steps: [
      '点右下角的「≡」菜单',
      '选「添加到桌面」',
      '弹窗点「添加」',
    ],
    note: '华为/荣耀浏览器在右下角菜单。',
  },
  honor: {
    name: '荣耀浏览器',
    canAdd: true,
    steps: [
      '点右下角的「≡」菜单',
      '选「添加到桌面」',
      '弹窗点「添加」',
    ],
    note: '荣耀浏览器和华为一样，菜单在右下角。',
  },
  qq: {
    name: 'QQ 浏览器',
    canAdd: true,
    steps: [
      '点底部中间的「≡」菜单',
      '选「添加到桌面」',
      '确认添加',
    ],
    note: '',
  },
  uc: {
    name: 'UC 浏览器',
    canAdd: true,
    steps: [
      '点底部中间的「≡」菜单',
      '选「添加到桌面」',
      '确认添加',
    ],
    note: '',
  },
  'android-chrome': {
    name: 'Chrome / Edge（安卓）',
    canAdd: true,
    steps: [
      '点右上角的「⋮」菜单',
      '选「添加到主屏幕」或「安装应用」',
      '点「添加」/「安装」确认',
    ],
    note: '如果看到「安装应用」，说明可以装成完整 App，体验更好。',
  },
  'android-other': {
    name: '安卓浏览器',
    canAdd: true,
    steps: [
      '打开浏览器的菜单（通常是「⋮」或「≡」）',
      '找「添加到主屏幕」或「添加到桌面」',
      '确认添加',
    ],
    note: '',
  },
  'ios-safari': {
    name: 'Safari（iPhone）',
    canAdd: true,
    steps: [
      '点底部中间的「分享」按钮（方框加向上箭头 ⬆️）',
      '在列表里下滑找到「添加到主屏幕」',
      '点右上角「添加」',
    ],
    note: 'iPhone 只有用 Safari 才能添加，而且必须从这里加才能收推送通知。',
  },
  'ios-inapp': {
    name: 'iPhone 上的内置浏览器',
    canAdd: false,
    steps: [
      '点右上角或底部的「⋯」/「分享」',
      '选「在 Safari 中打开」',
      '再用 Safari 的「分享 → 添加到主屏幕」',
    ],
    note: 'iPhone 上只有 Safari 能添加到主屏幕。',
  },
  'ios-other': {
    name: 'iPhone 第三方浏览器',
    canAdd: false,
    steps: [
      '复制当前网址',
      '用 Safari 打开这个网址',
      '点「分享 → 添加到主屏幕」',
    ],
    note: 'iPhone 上只有 Safari 能添加到主屏幕（Chrome/Edge 都不行）。',
  },
  desktop: {
    name: '电脑浏览器',
    canAdd: false,
    steps: [
      '电脑上不需要添加 —— 直接收藏书签即可',
      '如果想当 App 用：Chrome 地址栏右侧有「安装」图标，点一下即可',
      '手机上访问同一个网址，按提示添加到主屏幕',
    ],
    note: '推送提醒和主屏幕功能主要在手机上体验。',
  },
}

export function getPlatform(): PlatformInfo {
  const platform = detectPlatform()
  const conf = STEPS[platform]
  const u = ua()
  const isIOS = platform.startsWith('ios')
  const isAndroid = platform.startsWith('android') || ['xiaomi', 'huawei', 'qq', 'uc'].includes(platform)

  const standalone =
    (typeof window !== 'undefined' &&
      (window.matchMedia?.('(display-mode: standalone)').matches ||
        window.matchMedia?.('(display-mode: fullscreen)').matches)) ||
    (navigator as any)?.standalone === true

  // 推送可达性：中国大陆的安卓基本收不到，要如实告诉用户
  let canPush = false
  if (typeof window !== 'undefined' && 'PushManager' in window) {
    if (platform === 'wechat') canPush = false
    else if (isIOS) canPush = standalone      // iOS 必须已加到主屏（16.4+）
    else if (isAndroid) canPush = true        // 技术上支持，但下面会说明风险
    else canPush = true                       // 桌面端
  }

  // 「技术上支持」≠「真的能收到」。安卓的 Web Push 走 Google FCM，
  // 该域名在中国大陆被墙；国产浏览器大多没开放 Web Push 接口。
  const chinaAndroid =
    isAndroid && !['android-chrome'].includes(platform) ||
    platform === 'android-chrome' ||
    platform === 'xiaomi' || platform === 'huawei' || platform === 'honor' ||
    platform === 'qq' || platform === 'uc' || platform === 'android-other'

  let pushCaveat = ''
  let pushReliable = false

  if (!canPush) {
    pushReliable = false
    if (platform === 'wechat') {
      pushCaveat = '微信内置浏览器不支持通知，需要先在浏览器里打开。'
    } else if (isIOS && !standalone) {
      pushCaveat = 'iPhone 需要先「添加到主屏幕」，从主屏图标打开才能收推送。'
    } else if (!('PushManager' in window)) {
      pushCaveat = '当前浏览器不支持推送通知。'
    }
  } else if (isIOS) {
    pushReliable = true               // iOS 走苹果 APNs，国内可达
  } else if (!isAndroid) {
    pushReliable = true               // 桌面端 Chrome/Firefox 正常
  } else {
    // 安卓：诚实说明
    pushReliable = false
    pushCaveat =
      '安卓的网页推送依赖 Google 服务，在中国大陆通常收不到。' +
      '建议用下面的「日历提醒」，一样能每天准点提醒你。'
  }

  return {
    platform,
    name: conf.name,
    isMobile: isIOS || isAndroid || platform === 'wechat',
    isWechat: platform === 'wechat',
    isIOS,
    isAndroid,
    standalone,
    canAddToHome: conf.canAdd && !standalone,
    canPush,
    pushReliable,
    pushCaveat,
    reminderMode: pushReliable ? 'push' : (isMobile ? 'calendar' : 'none'),
    steps: conf.steps,
    note: conf.note || '',
  }
}

/** 是不是 iOS（给别的组件用） */
export function isIOSDevice(): boolean {
  return getPlatform().isIOS
}

/** 是不是微信内（很多功能在微信里受限） */
export function isWechat(): boolean {
  return /MicroMessenger/i.test(ua())
}
