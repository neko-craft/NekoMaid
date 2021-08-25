/* eslint-disable camelcase */
import zh_CN from './zh_CN'
import en from './en'

export type Language = typeof zh_CN

export const currentLanguage = localStorage.getItem('NekoMaid:language') || 'zh_CN'
export const languages: Record<string, Language> = { zh_CN, en }

const lang = languages[currentLanguage]!

export default lang
export const minecraft = lang.minecraft
