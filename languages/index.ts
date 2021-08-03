import zhCN from './zh_CN'

export interface Language {
  minecraft: Record<string, string>
  name: string
}

export const currentLanguage: string = 'zh_CN'
export const languages: Record<string, Language> = { zhCN }

export default zhCN as Language
