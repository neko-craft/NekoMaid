import Plugin from './types/web/Plugin'
import language from './types/languages/index'
export { PlayerData, GlobalInfo, Page } from './types/web/Plugin'
export { usePlugin, useGlobalData } from './types/web/Context'
export { Language, languages } from './types/languages/index'

export { language, Plugin }
declare const _default: (name: string) => Plugin
export default _default
