import React from 'react'
import { lang, minecraft } from '../languages/index'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import Tooltip from '@mui/material/Tooltip'
import type { GlobalInfo } from './Plugin'

export interface ObjectColor { color?: { r: number, g: number, b: number, alpha: number }, name?: string }
export interface TextComponent {
  bold?: boolean
  italic?: boolean
  strikethrough?: boolean
  underlined?: boolean
  obfuscated?: boolean
  text?: string
  color?: ObjectColor | string
  extra?: TextComponent[]
  translate?: string
  with?: Array<TextComponent | string>
  hoverEvent?: {
    action: 'SHOW_TEXT' | 'SHOW_ITEM'
    contents: { value: TextComponent[] }
  }
  clickEvent?: {
    action: 'OPEN_URL' | 'RUN_COMMAND' | 'SUGGEST_COMMAND' | 'COPY_TO_CLIPBOARD'
    value: string
  }
}

const colorsMap: Record<string, number> = {
  black: 0,
  dark_blue: 1,
  dark_green: 2,
  dark_aqua: 3,
  dark_red: 4,
  dark_purple: 5,
  gold: 6,
  gray: 7,
  dark_gray: 8,
  blue: 9,
  green: 10,
  aqua: 11,
  red: 12,
  light_purple: 13,
  yellow: 14,
  white: 15
}

const colors = ['#212121', '#3f51b5', '#4caf50', '#00bcd4', '#b71c1c', '#9c27b0', '#ff5722', '#9e9e9e', '#616161', '#2196f3', '#8bc34a',
  '#03a9f4', '#f44336', '#ffc107', '#ff9800', '#eeeeee']

export const parseStringColor = (it: string): ObjectColor => it[0] === '#'
  ? { color: { r: parseInt(it.slice(1, 3), 16), g: parseInt(it.slice(3, 5), 16), b: parseInt(it.slice(5, 7), 16), alpha: 1 } }
  : { name: it }

export const parseStringOrComponent = (it: string | TextComponent, runCommand?: (it: string) => void, suggest?: (it: string) => void) =>
  typeof it === 'string'
    ? it
    : <ParsedComponent component={it} runCommand={runCommand} suggest={suggest} />

export const ParsedComponent: React.FC<{ component: TextComponent, runCommand?: (it: string) => void, suggest?: (it: string) => void }> =
  ({ component: it, runCommand, suggest }) => {
    let className: string | undefined
    const style: any = { }
    if (it.bold) style.fontWeight = 'bold'
    if (it.italic) style.fontStyle = 'italic'
    if (it.underlined) style.textDecoration = 'underline'
    if (it.strikethrough) style.textDecoration = (style.textDecoration ? style.textDecoration + ' ' : '') + 'line-through'
    let color = it.color
    if (typeof color === 'string') color = parseStringColor(color)
    if (color?.name && color.name in colorsMap) {
      style.color = colors[colorsMap[color.name]]
      if (color.name === 'white' || color.name === 'black') className = color.name
    } else if (color?.color) style.color = `rgba(${color.color.r},${color.color.g},${color.color.b},${color.color.alpha})`
    if (style.color && !(color?.name === 'white' || color?.name === 'black')) style.textShadow = 'none'
    if (it.clickEvent) style.cursor = 'pointer'
    let content: any
    if (it.translate) {
      if (it.translate in minecraft) {
        let i = 0
        const arr = it.with || []
        content = minecraft[it.translate].split('%').map((str, j) => {
          let comp: any
          if (j) {
            if (str[0] === 's') {
              comp = arr[i++]
              str = str.slice(1)
            } else {
              const id = parseInt(str)
              if (id > 0) {
                comp = arr[id - 1]
                str = str.slice(id.toString().length + 2)
              }
            }
          }
          return <>{comp && parseStringOrComponent(comp)}{str}</>
        })
      } else content = it.text ? parseMessage(it.text) : it.translate
    } else if (it.text) content = parseMessage(it.text)
    let elm = <span
      style={style}
      className={className}
      onClick={it.clickEvent
        ? () => {
            const value = it.clickEvent!.value
            switch (it.clickEvent!.action) {
              case 'OPEN_URL': return window.open(value, '_blank')
              case 'RUN_COMMAND': return runCommand && runCommand(value.slice(1))
              case 'SUGGEST_COMMAND': return suggest && suggest(value.slice(1))
            }
          }
        : undefined
      }
    >{content}{it.extra && parseComponents(it.extra, runCommand, suggest)}</span>
    if (it.hoverEvent?.action === 'SHOW_TEXT' && it.hoverEvent.contents.value) {
      elm = <Tooltip title={<>{parseComponents(it.hoverEvent.contents.value, runCommand, suggest)}</>}>{elm}</Tooltip>
    }
    return it.clickEvent?.action === 'COPY_TO_CLIPBOARD' ? <CopyToClipboard text={it.clickEvent!.value}>{elm}</CopyToClipboard> : elm
  }

export const parseComponent = (arr: Array<string | TextComponent> | string | TextComponent, runCommand?: (it: string) => void, suggest?: (it: string) => void) =>
  (Array.isArray(arr) ? arr : [arr]).map((it, i) => typeof it === 'string' ? it : <ParsedComponent key={i} component={it} runCommand={runCommand} suggest={suggest} />)
/* eslint-disable no-labels */
export const parseComponents = (arr: (TextComponent | string)[], runCommand?: (it: string) => void, suggest?: (it: string) => void) =>
  arr.map((it, i) => it
    ? typeof it === 'string' ? it : <ParsedComponent key={i} component={it} runCommand={runCommand} suggest={suggest} />
    : <br key={i} />)
export const parseStyledText = (it: string) => {
  if (!it.includes('§')) return it
  it = ' ' + it
  const index = it.search(/§[lmno]/)
  const a = it.slice(0, index)
  let b = it.slice(index)
  let i = 0
  const style: Record<string, string> = { }
  while (i < b.length) {
    if (b[i] !== '§') break
    switch (b[++i]) {
      case 'l':
        style.fontWeight = 'bold'
        break
      case 'm':
        style.textDecoration = style.textDecoration === 'underline' ? 'underline line-through' : 'line-through'
        break
      case 'n':
        style.textDecoration = style.textDecoration === 'line-through' ? 'underline line-through' : 'underline'
        break
      case 'o':
        style.fontStyle = 'italic'
    }
    i++
  }
  b = b.slice(i)
  return <>{a.slice(1)}{b && <span style={style}>{b[0] === '§' ? parseStyledText(b) : b}</span>}</>
}
export const parseMessage = (msg: string) => {
  const msgClean = msg
      .replace(/\u007f(#[0-9a-f]{6}|.)/g, '') // Let DEL symbol delete later character. Sometimes there would be hex color after DEL symbol.
      .replace(/\u001b\[[0-9;]+m/g, ''); // TODO: Remove ANSI color code for now, until this project support this in Terminal.
  const arr = msgClean.replace(/§k/g, '').split(/(?=§[0-9a-fA-FxXrR])/g)
  const res: JSX.Element[] = []
  let color = ''
  loop: for (let i = 0; i < arr.length; i++) {
    let it = arr[i]
    let curColor = null
    let className: string | undefined
    if (it[0] === '§') {
      curColor = it[1]
      if (curColor === 'x' || curColor === 'X') {
        color = ''
        for (let j = 0; j < 5; j++) {
          // eslint-disable-next-line no-labels
          if (++i >= arr.length) break loop
          if (arr[i][0] === '§') color += arr[i][1]
        }
        continue
      }
      if (curColor === 'r' || curColor === 'R') {
        curColor = null
        it = it.slice(2)
      } else {
        curColor = curColor.toLowerCase()
        const code = curColor.charCodeAt(0)
        // eslint-disable-next-line yoda
        if ((48 <= code && code <= 57) || (97 <= code && code <= 102)) {
          if (curColor === '0') className = 'black'
          else if (curColor === 'f') className = 'white'
          curColor = color ? '#' + color.toLowerCase() + curColor : colors[code <= 57 ? code - 48 : 10 + code - 97]
          it = it.slice(2)
        } else curColor = null
      }
      color = ''
    }
    const style = curColor ? { color: curColor } : undefined
    res.push(<span key={i} style={style} className={className}>{parseStyledText(it)}</span>)
  }
  return res
}

const padColor = (it: number) => {
  const s = it.toString(16).padStart(2, '0')
  return `§${s[0]}§${s[1]}`
}
export const stringifyTextComponent = (arr: string | TextComponent | Array<string | TextComponent>) => (Array.isArray(arr) ? arr : [arr])
  .reduce((p, it) => {
    let str: string
    if (typeof it !== 'string') {
      str = ''
      let color = it.color
      if (typeof color === 'string') color = parseStringColor(color)
      if (color?.name && color.name in colorsMap) {
        str += '§' + colorsMap[color.name].toString(16)
      } else if (color?.color) {
        str += '§x' + padColor(color.color.r) + padColor(color.color.g) + padColor(color.color.b)
      }
      if (it.bold) str += '§l'
      if (it.italic) str += '§o'
      if (it.strikethrough) str += '§n'
      if (it.underlined) str += '§m'
      if (it.obfuscated) str += '§k'
      str += it.text
      if (it.extra?.length) str += stringifyTextComponent(it.extra)
    } else str = it
    return p + str
  }, '')

const classesNameMap: Record<string, string> = {
  Z: 'boolean',
  B: 'byte',
  C: 'char',
  L: '',
  D: 'double',
  F: 'float',
  I: 'int',
  J: 'long',
  S: 'short'
}

export const getClassName = (it: string) => {
  if (it === 'others') return lang.others
  let i = 0
  while (it[i] === '[' && i < it.length) i++
  const name = it.slice(i)
  return (classesNameMap[name] || (name.startsWith('L') ? name.slice(1) : name)) + '[]'.repeat(i)
}

export const getCurrentTime = () => {
  const time = new Date()
  return time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0') +
    ':' + time.getSeconds().toString().padStart(2, '0')
}

export const formatMS = (time: number) => {
  if (time < 10) return time.toFixed(2) + ' ' + lang.ms
  if (time < 100) return time.toFixed(1) + ' ' + lang.ms
  if (time < 5000) return (time | 0) + ' ' + lang.ms
  if (time <= 60000) return (time / 1000).toFixed(2) + lang.secound
  return (time / 1000 | 0) + ' ' + lang.secound
}

export const getSkin = (data: Partial<GlobalInfo> | null | undefined, name: any, isHead = false) => {
  const { headUrl, skinUrl } = data || { }
  return isHead
    ? headUrl ? headUrl.replace(/{}/g, name) : `https://minotar.net/helm/${name}/40.png`
    : skinUrl ? skinUrl.replace(/{}/g, name) : `https://minotar.net/skin/${name}`
}
