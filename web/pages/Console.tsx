/* eslint-disable no-labels */
import React, { useMemo, useEffect, useState, useRef } from 'react'
import { usePlugin } from '../Context'
import { Send } from '@material-ui/icons'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { TextField, Toolbar, IconButton, Paper, Tooltip, Box, Autocomplete } from '@material-ui/core'
import { address } from '../url'
import throttle from 'lodash/throttle'
import toast from '../toast'
import More from '../components/More'

interface LogComponent {
  bold: boolean
  italic: boolean
  strikethrough: boolean
  underlined: boolean
  text: string
  color: { color?: { r: number, g: number, b: number, alpha: number }, name?: string }
  extra: LogComponent[]
  hoverEvent?: {
    action: 'SHOW_TEXT' | 'SHOW_ITEM'
    contents: { value: LogComponent[] }
  }
  clickEvent?: {
    action: 'OPEN_URL' | 'RUN_COMMAND' | 'SUGGEST_COMMAND' | 'COPY_TO_CLIPBOARD'
    value: string
  }
}
type Log = { level: string, msg: string, time: number, logger: string, components?: LogComponent[] }

const hideLoggerRegexp = /net\.minecraft\.|Minecraft|com\.mojang\.|com\.sk89q\.|ru\.tehkode\.|Minecraft\.AWE|com\.corundumstudio\./

const colorsMap: any = {
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

const levelNames: Record<string, string> = {
  FATAL: '严重',
  ERROR: '错误',
  WARN: '警告',
  INFO: '信息',
  DEBUG: '调试',
  TRACE: '堆栈'
}

const pad = (it: number) => it.toString().padStart(2, '0')

const parseComponents = (arr: LogComponent[], runCommand: (it: string) => void, suggest: (it: string) => void) => {
  return arr.map((it, i) => {
    if (!it) return <br key={i} />
    let className: string | undefined
    const style: any = { }
    if (it.bold) style.fontWeight = 'bold'
    if (it.italic) style.fontStyle = 'italic'
    if (it.underlined) style.textDecoration = 'underline'
    if (it.strikethrough) style.textDecoration = (style.textDecoration ? style.textDecoration + ' ' : '') + 'line-through'
    if (it.color.name && it.color.name in colorsMap) {
      style.color = colors[colorsMap[it.color.name]]
      if (it.color.name === 'white' || it.color.name === 'black') className = it.color.name
    } else if (it.color.color) style.color = `rgba(${it.color.color.r},${it.color.color.g},${it.color.color.b},${it.color.color.alpha})`
    if (style.color && !(it.color.name === 'white' || it.color.name === 'black')) style.textShadow = 'none'
    if (it.clickEvent) style.cursor = 'pointer'
    let elm = <span
      key={i}
      style={style}
      className={className}
      onClick={it.clickEvent
        ? () => {
            const value = it.clickEvent!.value
            switch (it.clickEvent!.action) {
              case 'OPEN_URL': return window.open(value, '_blank')
              case 'RUN_COMMAND': return runCommand(value.slice(1))
              case 'SUGGEST_COMMAND': return suggest(value.slice(1))
            }
          }
        : undefined
      }
    >{parseMessage(it.text)}{it.extra && parseComponents(it.extra, runCommand, suggest)}</span>
    if (it.hoverEvent?.action === 'SHOW_TEXT' && it.hoverEvent.contents.value) {
      elm = <Tooltip key={i} title={<>{parseComponents(it.hoverEvent.contents.value, runCommand, suggest)}</>}>{elm}</Tooltip>
    }
    return it.clickEvent?.action === 'COPY_TO_CLIPBOARD' ? <CopyToClipboard text={it.clickEvent!.value} key={i}>{elm}</CopyToClipboard> : elm
  })
}
const parseStyledText = (it: string) => {
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
const parseMessage = (msg: string) => {
  const arr = msg.replace(/§k/g, '').split(/(?=§[0-9a-fA-FxXrR])/g)
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
const parseLog = (data: Log, runCommand: (it: string) => void, suggest: (it: string) => void) => {
  const t = new Date(data.time)
  const time = pad(t.getHours()) + ':' + pad(t.getMinutes()) + ':' + pad(t.getSeconds())
  let moreLines = false
  if (data.components) {
    return <p key={i}>
      <Tooltip title={time} placement='right'><span className='level'>[信息] </span></Tooltip>
      <span className='msg'>{parseComponents(data.components, runCommand, suggest)}</span>
    </p>
  } else {
    const msg = parseMessage(data.msg)
    const isError = data.level === 'FATAL' || data.level === 'ERROR'
    moreLines = (isError || data.level === 'WARN') && data.msg.includes('\n')
    const elm = <p key={i} className={isError ? 'error' : data.level === 'WARN' ? 'warn' : undefined}>
      <Tooltip title={time} placement='right'>
        <span className='level'>[{levelNames[data.level] || '信息'}] </span>
      </Tooltip>
      <span className='msg'>
        {moreLines && <span className='more' data-collapse='[收起]'>[展开]</span>}
        {data.logger && !hideLoggerRegexp.test(data.logger) && <span className='logger'>[{data.logger}] </span>}
        {msg}</span>
    </p>
    return moreLines ? <More key={i}>{elm}</More> : elm
  }
}

let i = 0
const Console: React.FC = () => {
  const logs = useMemo<JSX.Element[]>(() => [], [])
  const ref = useRef<HTMLDivElement | null>(null)
  const plugin = usePlugin()
  const [, update] = useState(0)
  const [open, setOpen] = useState(false)
  const [command, setCommand] = useState('')
  const [suggestions, setSuggestions] = useState<Array<[string, boolean] | [string]>>([])
  const getSuggestions = useMemo(() => throttle(
    (it: string) => {
      let cmd = it.substr(0, it.lastIndexOf(' '))
      if (cmd) cmd += ' '
      return plugin.emit('console:complete', (data: string[] = []) => {
        setSuggestions(JSON.parse(localStorage.getItem(`NekoMaid:${address}:commandHistory`) || '[]').concat(data.map(c => [cmd + c] as [string])))
      }, it)
    },
    500
  ), [])
  const scrollToEnd = useMemo(() => throttle(
    (elm: HTMLDivElement) => {
      const select = (window.getSelection || document.getSelection)()
      if (select && !select.isCollapsed) {
        let node = select?.anchorNode
        while (node && node !== document) {
          if (node === elm) return
          node = node.parentNode
        }
      }
      if (elm) elm.lastElementChild?.scrollIntoView()
    },
    300
  ), [])
  const execCommand = () => {
    if (!command) return
    plugin.emit('console:run', (res: boolean) => res ? toast('执行成功!', 'success') : toast('执行失败!', 'error'), command)
    const arr = JSON.parse(localStorage.getItem(`NekoMaid:${address}:commandHistory`) || '[]').filter((it: [string]) => it[0] !== command)
    if (arr.length === 5) arr.pop()
    arr.unshift([command, true])
    localStorage.setItem(`NekoMaid:${address}:commandHistory`, JSON.stringify(arr))
    setCommand('')
  }

  useEffect(() => {
    const runCommand = (it: string) => plugin.emit('console:run', (res: boolean) => res ? toast('执行成功!', 'success') : toast('执行失败!', 'error'), it)
    let lastLog: Log = {} as any
    const onLog = (data: Log) => {
      if (lastLog.logger === data.logger && (lastLog.time / 100 | 0) === (data.time / 100 | 0) &&
        lastLog.level === data.level && (!lastLog.components === !data.components)) {
        logs.pop()
        if (data.components) {
          lastLog.components!.push(null as any)
          lastLog.components = lastLog.components!.concat(data.components)
        } else lastLog.msg += '\n' + data.msg
        data = lastLog
      } else lastLog = data
      logs.push(parseLog(data, runCommand, setCommand))
      update(++i)
    }
    const offLogs = plugin.on('console:logs', (it: Log[]) => {
      logs.length = 0
      it.forEach(onLog)
    })
    const offLog = plugin.on('console:log', onLog)
    plugin.switchPage('console')
    return () => {
      offLogs()
      offLog()
    }
  }, [])

  useEffect(() => { ref.current && scrollToEnd(ref.current) }, [logs[logs.length - 1]])

  return <Box sx={{
    width: '100%',
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    fontSize: '0.97rem',
    flexDirection: 'column',
    fontFamily: '"Roboto Mono","Helvetica","Arial",sans-serif',
    '& p': {
      margin: 0,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      display: 'flex',
      '& .msg': {
        flex: '1'
      },
      '& .logger': {
        color: theme => theme.palette.secondary.main,
        fontStyle: 'italic'
      },
      '& .level': {
        userSelect: 'none',
        height: 'fit-content',
        fontWeight: 'bolder',
        color: theme => theme.palette.primary.main
      },
      '& .white': {
        textShadow: theme => theme.palette.mode === 'light' ? '#000 1px 0 0, #000 0 1px 0, #000 -1px 0 0, #000 0 -1px 0' : undefined
      },
      '& .black': {
        textShadow: theme => theme.palette.mode === 'dark' ? '#fff 1px 0 0, #fff 0 1px 0, #fff -1px 0 0, #fff 0 -1px 0' : undefined
      },
      '& .more': {
        color: theme => theme.palette.secondary.main,
        marginRight: '4px',
        cursor: 'pointer',
        textDecoration: 'underline'
      }
    },
    '& .warn, & .warn .level': {
      color: theme => theme.palette.warning.main
    },
    '& .error, & .error .level': {
      color: theme => theme.palette.error.main
    }
  }}>
    <Toolbar />
    <Box
      ref={ref}
      sx={{
        height: '100%',
        overflow: 'hidden scroll',
        backgroundColor: theme => theme.palette.background.default,
        padding: theme => theme.spacing(1)
      }}>
      {logs}
    </Box>
    <Paper sx={{
      display: 'flex',
      borderRadius: '4px 4px 0 0',
      padding: theme => theme.spacing(1),
      zIndex: 2
    }}>
      <Autocomplete
        freeSolo
        open={open}
        inputValue={command}
        options={suggestions}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        onFocus={() => getSuggestions(command)}
        onKeyUp={(e: any) => e.key === 'Enter' && (!open || !suggestions.length) && execCommand()}
        sx={{ flex: '1' }}
        classes={{ popper: 'command-popper' }}
        renderInput={params => <TextField {...params as any} label='命令' />}
        getOptionLabel={it => typeof it === 'string' ? it : it[0]}
        groupBy={it => it[1] ? '历史记录' : '命令'}
        onInputChange={(_, it) => {
          getSuggestions(it)
          setCommand(it)
        }}
      />
      <IconButton color='primary' disabled={!command} onClick={execCommand} sx={{ margin: theme => theme.spacing('auto', 0, 'auto', 1) }}><Send /></IconButton>
    </Paper>
  </Box>
}

export default Console
