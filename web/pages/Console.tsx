/* eslint-disable no-labels */
import React, { useMemo, useEffect, useState } from 'react'
import { usePlugin } from '../Context'
import { makeStyles } from '@material-ui/core/styles'
import { Send } from '@material-ui/icons'
import { TextField, Toolbar, IconButton, Paper } from '@material-ui/core'
import Autocomplete from '@material-ui/lab/Autocomplete'

interface Log { level: string, msg: string, time: number, logger: string }

const hideLoggerRegexp = /net\.minecraft\.|Minecraft|com\.mojang\.|com\.sk89q\.|ru\.tehkode\.|Minecraft\.AWE/

const colors = ['#212121', '#3f51b5', '#4caf50', '#00bcd4', '#b71c1c', '#9c27b0', '#ff5722', '#ff5722', '#616161', '#2196f3', '#8bc34a',
  '#03a9f4', '#f44336', '#ffc107', '#ff9800', '#eeeeee']

const levelNames: Record<string, string> = {
  FATAL: '严重',
  ERROR: '错误',
  WARN: '警告',
  INFO: '信息',
  DEBUG: '调试',
  TRACE: '堆栈'
}

const useStyles = makeStyles(theme => ({
  wrap: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    '& p': {
      margin: 0,
      display: 'flex',
      '& .time': {
        color: theme.palette.grey[500],
        marginRight: theme.spacing(1)
      },
      '& .message': {
        whiteSpace: 'pre-line',
        wordBreak: 'break-word'
      },
      '& .logger': {
        color: theme.palette.success.main
      },
      '& .level': {
        color: theme.palette.primary.main,
        fontWeight: 'bold'
      },
      '& .warn': {
        color: theme.palette.warning.main
      },
      '& .error': {
        color: theme.palette.error.main
      }
    }
  },
  logs: {
    height: '100%',
    overflow: 'hidden scroll',
    padding: theme.spacing(1, 1, 0, 1)
  },
  command: {
    display: 'flex',
    padding: theme.spacing(1, 1, 2),
    marginBottom: -theme.spacing(1)
  },
  input: {
    flex: '1'
  },
  popper: {
    top: '-30px !important'
  }
}))

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

let i = 0
const Console: React.FC = () => {
  const logs = useMemo<JSX.Element[]>(() => [], [])
  const plugin = usePlugin()
  const classes = useStyles()
  const [, update] = useState(0)

  useEffect(() => {
    const f = (data: Log) => {
      const t = new Date(data.time)
      const arr = data.msg.replace(/§k/g, '').split(/(?=§[0-9a-fA-FxXrR])/g)
      const res: JSX.Element[] = []
      let color = ''
      loop: for (let i = 0; i < arr.length; i++) {
        let it = arr[i]
        let curColor = null
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
              curColor = color ? '#' + color.toLowerCase() + curColor : colors[code <= 57 ? code - 48 : 10 + code - 97]
              it = it.slice(2)
            } else curColor = null
          }
          color = ''
        }
        const style = { color: curColor || undefined }
        res.push(<span key={i} style={style}>{parseStyledText(it)}</span>)
      }
      const type = data.level === 'FATAL' || data.level === 'ERROR' ? 'error' : data.level === ' WARN' ? ' warn' : ''
      logs.push(<p key={i++}>
        <span className='time'>{pad(t.getHours())}:{pad(t.getMinutes())}</span>
        <span className='message'>
          <span className={'level' + type}>[{levelNames[data.level] || '信息'}] </span>
          {data.logger && !hideLoggerRegexp.test(data.logger) && <span className='logger'>[{data.logger}]</span>} {res}</span>
      </p>)
      update(i)
    }
    plugin.once('logs', (logs: Log[]) => logs.forEach(f)).on('log', f).switchPage('console')
    return () => { plugin.off('log', f).off('logs', f) }
  }, [])
  return <div className={classes.wrap}>
    <Toolbar />
    <div className={classes.logs}>{logs}</div>
    <Paper className={classes.command}>
      <Autocomplete
        freeSolo
        options={['a', 'b']}
        className={classes.input}
        classes={{ popper: classes.popper }}
        renderInput={(params) => <TextField
          {...params}
          label='命令'
        />}
      />
      <IconButton color='primary'>
        <Send />
      </IconButton>
    </Paper>
  </div>
}

export default Console
