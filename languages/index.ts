/* eslint-disable camelcase */
import type zh_CN from './nekomaid/zh_CN'

export type Language = typeof zh_CN

export const currentLanguage = localStorage.getItem('NekoMaid:language') || 'zh_CN'
export const languages = {
  'zh_CN': '简体中文',
  'en': 'English'
}

let lang: Language = (await import(`./nekomaid/${currentLanguage}.tsx`)).default

export default lang
export const minecraft = lang.minecraft
