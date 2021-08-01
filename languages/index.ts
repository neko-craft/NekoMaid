import zhCN from './zh_CN'

export interface Language {
  minecraft: Record<string, string>
  name: string
}

export default { zhCN } as Record<string, Language>
