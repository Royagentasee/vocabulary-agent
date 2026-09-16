// Taro 应用入口配置
// 启用分包加载：主包只保留核心流程，词库 bundle / AI 对话放在分包
export default {
  pages: [
    'pages/index/index',
    'pages/wordbooks/index',
    'pages/review/index',
    'pages/practice/index',
    'pages/stats/index',
    'pages/me/index',
    // legal 页面放主包（合规要求随时可访问）
    'pages/legal/user-agreement',
    'pages/legal/privacy-policy',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#111111',
    navigationBarTitleText: 'Vocabulary Agent',
    navigationBarTextStyle: 'white',
  },
  tabBar: {
    color: '#6b7280',
    selectedColor: '#111111',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/index/index', text: '首页' },
      { pagePath: 'pages/review/index', text: '复习' },
      { pagePath: 'pages/stats/index', text: '统计' },
      { pagePath: 'pages/me/index', text: '我的' },
    ],
  },
  // 分包配置
  subpackages: [
    {
      // 词库分包：仅在选择词书 / 复习时按需加载
      root: 'package-dict',
      name: 'dict',
      pages: [
        'pages/dict-bundle/index',  // 大词库页面（选词书时按需加载 5000 词）
      ],
    },
    {
      // AI 功能分包：口语陪练 / 错因分析
      root: 'package-ai',
      name: 'ai',
      pages: [
        'pages/analysis/index',
        'pages/dialogue/index',
      ],
    },
  ],
  // 分包预下载规则（可选：进入首页时预加载 AI 分包）
  preloadRule: {
    'pages/index/index': {
      network: 'all',
      packages: ['ai'],
    },
  },
}