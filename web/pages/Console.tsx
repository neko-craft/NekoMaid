/* eslint-disable no-labels */
import React, { useMemo, useEffect, useState, useRef } from 'react'
import { usePlugin } from '../Context'
import { Send } from '@material-ui/icons'
import { TextField, Toolbar, IconButton, Paper, Tooltip, Box, Autocomplete } from '@material-ui/core'
import { address } from '../url'
import { css } from '@emotion/css'
import throttle from 'lodash.throttle'
import toast from '../toast'

interface Log { level: string, msg: string, time: number, logger: string }

const hideLoggerRegexp = /net\.minecraft\.|Minecraft|com\.mojang\.|com\.sk89q\.|ru\.tehkode\.|Minecraft\.AWE/

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

const parseStyledText = (it: string) => {
  let [a, b = ''] = (' ' + it).split(/(?=§[lmno])/, 2)
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
  return <>{a.slice(1)}{b && <span style={style}>{parseStyledText(b)}</span>}</>
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
      return plugin.emit('console:complete', it, (data: string[] = []) => setSuggestions(
        JSON.parse(localStorage.getItem(`NekoMaid:${address}:commandHistory`) || '[]').concat(data.map(c => [cmd + c] as [string]))))
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
    plugin.emit('console:run', command)
    toast('执行成功!', 'success')
    const arr = JSON.parse(localStorage.getItem(`NekoMaid:${address}:commandHistory`) || '[]').filter((it: [string]) => it[0] !== command)
    if (arr.length === 5) arr.pop()
    arr.unshift([command, true])
    localStorage.setItem(`NekoMaid:${address}:commandHistory`, JSON.stringify(arr))
    setCommand('')
  }

  useEffect(() => {
    const onLog = (data: Log) => {
      const t = new Date(data.time)
      const time = pad(t.getHours()) + ':' + pad(t.getMinutes()) + ':' + pad(t.getSeconds())
      logs.push(<p key={i++} className={data.level === 'FATAL' || data.level === 'ERROR' ? 'error' : data.level === 'WARN' ? 'warn' : undefined}>
        <Tooltip title={time} placement='right'>
          <span className='level'>[{levelNames[data.level] || '信息'}] </span>
        </Tooltip>
        <span className='msg'>{data.logger && !hideLoggerRegexp.test(data.logger) && <span className='logger'>[{data.logger}] </span>}
          {parseMessage(data.msg)}</span>
      </p>)
      update(i)
    }
    const onLogs = (it: Log[]) => {
      logs.length = 0
      it.forEach(onLog)
    }
    plugin.on('console:logs', onLogs).on('console:log', onLog).switchPage('console')
    return () => { plugin.off('console:log', onLog).off('console:logs', onLogs) }
  }, [])

  useEffect(() => { ref.current && scrollToEnd(ref.current) }, [logs[logs.length - 1]])

  return <Box sx={{
    width: '100%',
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    '& p': {
      margin: 0,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      display: 'flex',
      '& .msg': {
        flex: '1'
      },
      '& .logger': {
        color: theme => theme.palette.success.main,
        fontStyle: 'italic'
      },
      '& .level': {
        userSelect: 'none',
        color: theme => theme.palette.primary.main,
        fontWeight: 'bolder'
      },
      '& .white': {
        textShadow: theme => theme.palette.mode === 'light' ? '#000 1px 0 0, #000 0 1px 0, #000 -1px 0 0, #000 0 -1px 0' : undefined
      },
      '& .black': {
        textShadow: theme => theme.palette.mode === 'dark' ? '#fff 1px 0 0, #fff 0 1px 0, #fff -1px 0 0, #fff 0 -1px 0' : undefined
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
      zIndex: theme => theme.zIndex.drawer + 1
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
        classes={{ popper: css({ marginBottom: '20px !important' }) }}
        // classes={{ popper: css({ top: '-30px !important' }) }}
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
