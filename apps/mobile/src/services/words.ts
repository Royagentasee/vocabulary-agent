/**
 * Mock 词库（与小程序 / Web 端共享）
 */
import type { Word } from '@vocab-agent/types'

export const MOCK_WORDS: Word[] = [
  { id: 'w1', headword: 'ephemeral', pos: ['adj'], ipa: '/ɪˈfem.ər.əl/', audioUrl: '', senses: [{ pos: 'adj', definitionEn: 'lasting for a very short time', definitionCn: '短暂的' }], etymology: '希腊语 ephemeros', collocations: [], examTags: [{ exam: 'GRE', frequency: 0.8 }], examples: [{ sentence: 'Fashions are ephemeral.', translation: '时尚易逝。' }] },
  { id: 'w2', headword: 'ubiquitous', pos: ['adj'], ipa: '/juːˈbɪk.wɪ.təs/', audioUrl: '', senses: [{ pos: 'adj', definitionEn: 'present everywhere', definitionCn: '无处不在的' }], etymology: '拉丁语 ubique', collocations: [], examTags: [{ exam: 'GRE', frequency: 0.85 }], examples: [{ sentence: 'Smartphones are ubiquitous.', translation: '智能手机无处不在。' }] },
  { id: 'w3', headword: 'meticulous', pos: ['adj'], ipa: '/məˈtɪk.jə.ləs/', audioUrl: '', senses: [{ pos: 'adj', definitionEn: 'very careful', definitionCn: '一丝不苟的' }], etymology: '拉丁语 metus', collocations: [], examTags: [{ exam: 'GRE', frequency: 0.9 }], examples: [{ sentence: 'A meticulous researcher.', translation: '细致的研究者。' }] },
  { id: 'w4', headword: 'pragmatic', pos: ['adj'], ipa: '/præɡˈmæt.ɪk/', audioUrl: '', senses: [{ pos: 'adj', definitionEn: 'practical', definitionCn: '务实的' }], etymology: '希腊语 pragmatikos', collocations: [], examTags: [{ exam: 'GRE', frequency: 0.7 }], examples: [{ sentence: 'A pragmatic approach.', translation: '务实的方法。' }] },
  { id: 'w5', headword: 'resilient', pos: ['adj'], ipa: '/rɪˈzɪl.i.ənt/', audioUrl: '', senses: [{ pos: 'adj', definitionEn: 'able to recover', definitionCn: '有韧性的' }], etymology: '拉丁语 resilire', collocations: [], examTags: [{ exam: 'TOEFL', frequency: 0.7 }], examples: [{ sentence: 'Children are resilient.', translation: '孩子们有韧性。' }] },
  { id: 'w6', headword: 'scrutinize', pos: ['v'], ipa: '/ˈskruː.tə.naɪz/', audioUrl: '', senses: [{ pos: 'v', definitionEn: 'examine carefully', definitionCn: '详细检查' }], etymology: '法语 scrutin', collocations: [], examTags: [{ exam: 'GRE', frequency: 0.8 }], examples: [{ sentence: 'Scrutinize the data.', translation: '仔细审查数据。' }] },
  { id: 'w7', headword: 'ambivalent', pos: ['adj'], ipa: '/æmˈbɪv.ə.lənt/', audioUrl: '', senses: [{ pos: 'adj', definitionEn: 'having mixed feelings', definitionCn: '矛盾的' }], etymology: 'ambi- + valent', collocations: [], examTags: [{ exam: 'GRE', frequency: 0.9 }], examples: [{ sentence: 'She felt ambivalent.', translation: '她感到矛盾。' }] },
  { id: 'w8', headword: 'concise', pos: ['adj'], ipa: '/kənˈsaɪs/', audioUrl: '', senses: [{ pos: 'adj', definitionEn: 'brief and clear', definitionCn: '简明的' }], etymology: '拉丁语 concidere', collocations: [], examTags: [{ exam: 'IELTS', frequency: 0.8 }], examples: [{ sentence: 'Keep it concise.', translation: '保持简洁。' }] },
]

export const MOCK_WORDBOOKS = [
  { id: 'wb-high5000', name: '高频 5000 词', description: '覆盖雅思 / 托福核心高频词', examTag: 'GENERAL', wordCount: 5000, coverColor: '#3b82f6' },
  { id: 'wb-gre-core', name: 'GRE 核心词汇', description: '高频 GRE 词汇精选', examTag: 'GRE', wordCount: 49, coverColor: '#111111' },
  { id: 'wb-ielts-7', name: '雅思 7+ 词汇', description: '冲 7 分必备', examTag: 'IELTS', wordCount: 2500, coverColor: '#10b981' },
]

export async function fetchWords(): Promise<Word[]> {
  return Promise.resolve(MOCK_WORDS)
}
export async function fetchWordbooks() {
  return Promise.resolve(MOCK_WORDBOOKS)
}