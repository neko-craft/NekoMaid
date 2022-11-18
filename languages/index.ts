/* eslint-disable camelcase */
import zh_CN from './zh_CN'
import en from './en'

export type Language = typeof zh_CN

export const currentLanguage = localStorage.getItem('NekoMaid:language') || 'zh_CN'
export const languages: Record<string, Language> = { zh_CN, en }

const lang = languages[currentLanguage]!
if (process.env.NODE_ENV === 'development') {
  lang.minecraft = new Proxy(lang.minecraft, {
    get (target, p, receiver) {
      const val = Reflect.get(target, p, receiver)
      if (!val) console.warn('No such translation: ' + (p as string))
      return val
    }
  })
}

export default lang
export const minecraft = lang.minecraft
