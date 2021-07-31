import React, { useMemo, useEffect, useState, useRef, createRef } from 'react'
import { usePlugin } from '../Context'
import { Send } from '@material-ui/icons'
import { TextField, Toolbar, IconButton, Paper, Tooltip, Box, Autocomplete } from '@material-ui/core'
import { parseComponents, parseMessage, TextComponent } from '../utils'
import { address } from '../url'
import throttle from 'lodash/throttle'
import toast, { success } from '../toast'
import More from '../components/More'
import dialog from '../dialog'

type Log = { level: string, msg: string, time: number, logger: string, components?: TextComponent[] }

const hideLoggerRegexp = /net\.minecraft\.|Minecraft|com\.mojang\.|com\.sk89q\.|ru\.tehkode\.|Minecraft\.AWE|com\.corundumstudio\./

const levelNames: Record<string, string> = {
  FATAL: '严重',
  ERROR: '错误',
  WARN: '警告',
  INFO: '信息',
  DEBUG: '调试',
  TRACE: '堆栈'
}

const pad = (it: number) => it.toString().padStart(2, '0')

const parseLog = (data: Log, runCommand: (it: string) => void, suggest: (it: string) => void) => {
  const t = new Date(data.time)
  const ref = createRef<HTMLParagraphElement>()
  const onShare = () => {
    if (!ref.current) return
    const text = ref.current.textContent || ref.current.innerText
    dialog(<><span className='bold'>确认要分享这段日志吗:</span><br />{text.slice(5, 150)}...</>).then(res => {
      if (!res) return
      toast('分享中...')
      const body = new FormData()
      body.set('content', text)
      fetch('https://api.mclo.gs/1/log', { method: 'POST', body }).then(it => it.json()).then(it => {
        if (!it.success) throw new Error('Failed!')
        success()
        window.open(it.url, '_blank')
      })
    })
  }
  const time = pad(t.getHours()) + ':' + pad(t.getMinutes()) + ':' + pad(t.getSeconds())
  let moreLines = false
  if (data.components) {
    return <p ref={ref} key={i}>
      <Tooltip title={time} placement='right'><span className='level' onClick={onShare}>[信息] </span></Tooltip>
      <span className='msg'>{parseComponents(data.components, runCommand, suggest)}</span>
    </p>
  } else {
    const msg = parseMessage(data.msg)
    const isError = data.level === 'FATAL' || data.level === 'ERROR'
    moreLines = (isError || data.level === 'WARN') && data.msg.includes('\n')
    const elm = <p ref={ref} key={i} className={isError ? 'error' : data.level === 'WARN' ? 'warn' : undefined}>
      <Tooltip title={time} placement='right'>
        <span className='level' onClick={onShare}>[{levelNames[data.level] || '信息'}] </span>
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
        cursor: 'pointer',
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
