/**
 * 多语言字典
 *
 * 简洁 i18n 方案：扁平键值 + 嵌套对象
 * 添加新语言：复制一份 zh-CN 翻译成目标语言
 */

export type Locale = 'zh-CN' | 'en-US'

export const SUPPORTED_LOCALES: Array<{ code: Locale; label: string }> = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'en-US', label: 'English' },
]

// 中文
const zhCN = {
  app: {
    name: 'Vocabulary Agent',
    loading: '加载中...',
  },
  home: {
    greeting: '你好，今天学一会儿',
    subtitle: 'AI 陪伴，考点驱动，让每个单词都记得更牢',
    todayNew: '今日新词',
    todayReview: '今日复习',
    wrongCount: '错词本',
    startLearning: '选词书开始',
    startLearningHint: '从 GRE / 雅思 / 托福高频词库中选择',
    continueReview: '继续复习',
    continueReviewHint: 'FSRS 智能调度，到期卡片依次复现',
    practice: '专项练习',
    practiceHint: '拼写听写 / 例句填空 / 看英忆中',
  },
  review: {
    selectWordbook: '请先选择词书',
    goSelect: '去选词书',
    finished: '今日复习完成',
    finishedHint: (n: number) => `共 ${n} 张卡片`,
    showMeaning: '显示释义',
    askAI: '✨ 让 AI 解释',
    aiThinking: 'AI 思考中...',
    aiTitle: 'AI 解读',
    again: '忘记',
    hard: '困难',
    good: '良好',
    easy: '简单',
    submit: '提交',
    notRecognized: '不认识',
    remembered: '记住了',
    correct: '✓ 正确',
    wrong: '✗ 正确：',
    showAnswer: '显示答案',
    example: '例句',
    modes: {
      recall: '看英忆中',
      spell: '拼写听写',
      cloze: '例句填空',
    },
    spellInstruction: '根据释义与音标，写出单词',
    clozeInstruction: '根据语境填空',
    spellPlaceholder: '请输入单词',
  },
  wordbooks: {
    title: '选择词书',
    subtitle: '选好后即可开始今日复习',
    countUnit: '词',
  },
  stats: {
    title: '学习报告',
    subtitle: 'FSRS 帮你调度每一次复习',
    todayNew: '今日新词',
    todayReview: '今日复习',
    wrongCount: '错词本',
    progress: '完成进度',
    wrongList: '错词本',
  },
  me: {
    title: '我的',
    loginPrompt: '登录后可同步学习数据',
    login: '微信一键登录',
    agreement: '用户协议',
    privacy: '隐私政策',
    demoMode: '演示模式',
    demoOn: '已开启',
    demoOff: '未开启',
    feedback: '意见反馈',
    about: '关于',
    language: '语言',
    aboutContent: '版本 1.0.0\nAI 个性化辅导型单词学习\n© 2026 Vocabulary Agent',
  },
  legal: {
    userAgreement: '用户协议',
    privacyPolicy: '隐私政策',
  },
}

// English
const enUS: typeof zhCN = {
  app: {
    name: 'Vocabulary Agent',
    loading: 'Loading...',
  },
  home: {
    greeting: 'Hi, ready to learn',
    subtitle: 'AI-powered learning, exam-focused, every word counts',
    todayNew: 'New today',
    todayReview: 'Reviewed',
    wrongCount: 'Mistakes',
    startLearning: 'Pick a wordbook',
    startLearningHint: 'From GRE / IELTS / TOEFL core wordlists',
    continueReview: 'Continue review',
    continueReviewHint: 'FSRS schedules cards at the right time',
    practice: 'Practice',
    practiceHint: 'Spelling / Cloze / Recall — switch modes',
  },
  review: {
    selectWordbook: 'Please pick a wordbook first',
    goSelect: 'Pick wordbook',
    finished: 'All done for today',
    finishedHint: (n: number) => `${n} cards completed`,
    showMeaning: 'Show meaning',
    askAI: '✨ Ask AI',
    aiThinking: 'AI thinking...',
    aiTitle: 'AI Insight',
    again: 'Again',
    hard: 'Hard',
    good: 'Good',
    easy: 'Easy',
    submit: 'Submit',
    notRecognized: "Don't know",
    remembered: 'Got it',
    correct: '✓ Correct',
    wrong: '✗ Correct: ',
    showAnswer: 'Show answer',
    example: 'Example',
    modes: {
      recall: 'Recall',
      spell: 'Spelling',
      cloze: 'Cloze',
    },
    spellInstruction: 'Type the word from its meaning and IPA',
    clozeInstruction: 'Fill the blank from context',
    spellPlaceholder: 'Type the word',
  },
  wordbooks: {
    title: 'Pick a wordbook',
    subtitle: 'Start reviewing once selected',
    countUnit: 'words',
  },
  stats: {
    title: 'Learning report',
    subtitle: 'FSRS powers your review schedule',
    todayNew: 'New today',
    todayReview: 'Reviewed',
    wrongCount: 'Mistakes',
    progress: 'Progress',
    wrongList: 'Mistake list',
  },
  me: {
    title: 'Me',
    loginPrompt: 'Sign in to sync learning data',
    login: 'Sign in with WeChat',
    agreement: 'User agreement',
    privacy: 'Privacy policy',
    demoMode: 'Demo mode',
    demoOn: 'On',
    demoOff: 'Off',
    feedback: 'Feedback',
    about: 'About',
    language: 'Language',
    aboutContent: 'Version 1.0.0\nAI-powered vocabulary learning\n© 2026 Vocabulary Agent',
  },
  legal: {
    userAgreement: 'User Agreement',
    privacyPolicy: 'Privacy Policy',
  },
}

export const translations = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

export type Translations = typeof zhCN