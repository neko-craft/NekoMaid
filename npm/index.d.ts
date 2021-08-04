import Plugin from './types/web/Plugin'
import language from './types/languages/index'
export { PlayerData, GlobalInfo, Page } from './types/web/Plugin'
export { usePlugin, useGlobalData, useDrawerWidth } from './types/web/Context'
export { Language, languages, currentLanguage } from './types/languages/index'

export { language, Plugin }
declare const _default: (name: string) => Plugin
export default _default
