import zhCN from './zh_CN'

export type Language = typeof zhCN

export const currentLanguage: string = 'zh_CN'
export const languages: Record<string, Language> = { zhCN }

export default zhCN as Language
export const minecraft = zhCN.minecraft
