import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/material.css'
import 'codemirror/mode/xml/xml'
import 'codemirror/mode/yaml/yaml'
import 'codemirror/mode/shell/shell'
import 'codemirror/mode/powershell/powershell'
import 'codemirror/mode/properties/properties'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/addon/scroll/annotatescrollbar'
import 'codemirror/addon/search/matchesonscrollbar'
import 'codemirror/addon/search/match-highlighter'
import 'codemirror/addon/search/jump-to-line'

import 'codemirror/addon/dialog/dialog'
import 'codemirror/addon/dialog/dialog.css'
import 'codemirror/addon/search/searchcursor'
import 'codemirror/addon/search/search'

import React, { useEffect, useState, useRef } from 'react'
import toast, { action, failed, success } from '../toast'
import lang, { minecraft } from '../../languages'
import icons from '../../icons.json'
import { styled, alpha, useTheme } from '@mui/material/styles'
import { iconClasses } from '@mui/material/Icon'
import TreeView from '@mui/lab/TreeView'
import TreeItem, { treeItemClasses, TreeItemProps } from '@mui/lab/TreeItem'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePlugin, useDrawerWidth } from '../Context'
import { UnControlled } from 'react-codemirror2'
import { address } from '../url'
import { cardActionStyles } from '../theme'
import validFilename from 'valid-filename'
import Empty from '../components/Empty'
import Plugin from '../Plugin'
import dialog from '../dialog'

import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Icon from '@mui/material/Icon'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import Input from '@mui/material/Input'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'

import ArrowDropDown from '@mui/icons-material/ArrowDropDown'
import ArrowRight from '@mui/icons-material/ArrowRight'
import Save from '@mui/icons-material/Save'
import Undo from '@mui/icons-material/Undo'
import Redo from '@mui/icons-material/Redo'
import DeleteForever from '@mui/icons-material/DeleteForever'
import CreateNewFolder from '@mui/icons-material/CreateNewFolder'
import Refresh from '@mui/icons-material/Refresh'
import MoreHoriz from '@mui/icons-material/MoreHoriz'
import Description from '@mui/icons-material/Description'
import Upload from '@mui/icons-material/Upload'
import Download from '@mui/icons-material/Download'
import Outbox from '@mui/icons-material/Outbox'
import Inbox from '@mui/icons-material/Inbox'
import DriveFileRenameOutline from '@mui/icons-material/DriveFileRenameOutline'
import FileCopy from '@mui/icons-material/FileCopy'
import ContentPaste from '@mui/icons-material/ContentPaste'

const getMode = (path: string) => {
  switch (path.slice(path.lastIndexOf('.') + 1)) {
    case 'js': return 'javascript'
    case 'json': return 'application/json'
    case 'yml': return 'yaml'
    case 'xml':
    case 'htm':
    case 'html': return 'xml'
    case 'ini':
    case 'properties': return 'properties'
    case 'sh': return 'shell'
    case 'bat':
    case 'cmd':
    case 'powershell': return 'powershell'
  }
  return ''
}

const StyledTreeItem = styled((props: TreeItemProps) => <TreeItem {...props} />)(({ theme }) => ({
  [`& .${treeItemClasses.label}`]: {
    display: 'flex',
    paddingLeft: '0!important',
    '& embed': {
      width: 'inherit',
      height: 'inherit'
    },
    [`& .${iconClasses.root}`]: {
      margin: '-2px 4px 0 0'
    }
  },
  [`& .${treeItemClasses.group}`]: {
    marginLeft: 15,
    borderLeft: `1px dashed ${alpha(theme.palette.text.primary, 0.4)}`
  }
}))

const compressFileExt = ['zip', 'tar', 'jar', 'ar', 'cpio']
const CompressDialog: React.FC<{ file: string | null, dirs: Record<string, boolean>, onClose: () => void, plugin: Plugin, path: string, refresh: () => void }> =
  ({ dirs, file, onClose, plugin, path, refresh }) => {
    const [value, setValue] = useState('')
    const [ext, setExt] = useState('zip')
    useEffect(() => {
      setValue(file || 'server')
    }, [file])
    let error: string | undefined
    if (!validFilename(value)) error = lang.files.wrongName
    else if (((path || '/') + value + '.' + ext) in dirs) error = lang.files.exists
    return <Dialog open={file != null} onClose={onClose}>
      <DialogTitle>{lang.files.compress}</DialogTitle>
      <DialogContent>
        <DialogContentText>{lang.files.compressName}</DialogContentText>
        <TextField value={value} variant='standard' error={!!error} helperText={error} onChange={e => setValue(e.target.value)} />
        <Select variant='standard' value={ext} onChange={e => setExt(e.target.value)}>
          {compressFileExt.map(it => <MenuItem key={it} value={it}>.{it}</MenuItem>)}
        </Select>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{minecraft['gui.cancel']}</Button>
        <Button disabled={!!error} onClick={() => {
          onClose()
          plugin.emit('files:compress', (res: boolean) => {
            action(res)
            refresh()
          }, file, value, ext)
        }}>{minecraft['gui.ok']}</Button>
      </DialogActions>
    </Dialog>
  }

const Item: React.FC<{ plugin: Plugin, path: string, loading: Record<string, () => Promise<void>>, dirs: Record<string, boolean> }> =
  ({ dirs, plugin, path, loading }) => {
    const [open, setOpen] = useState(false)
    const [files, setFiles] = useState<[string[], string[]] | undefined>()
    const load = () => new Promise<void>(resolve => plugin.emit('files:fetch', (data: [string[], string[]]) => {
      setFiles(data)
      resolve()
      if (typeof ''.localeCompare === 'function') {
        data[0].sort((a, b) => a.localeCompare(b))
        data[1].sort((a, b) => a.localeCompare(b))
      }
      data[1].forEach((it: string) => (dirs[path + '/' + it] = false))
    }, path))
    useEffect(() => {
      dirs[path] = true
      if (path) loading[path] = load; else load()
    }, [])
    const children = files
      ? files[0].map(it => <Item plugin={plugin} key={it} path={path ? path + '/' + it : it} loading={loading} dirs={dirs} />)
        .concat(files[1].map(it => {
          let id = (icons as any).files[it]
          if (id == null) {
            const parts = it.split('.')
            id = (icons as any).extensions[parts[parts.length - 1]]
          }
          return <StyledTreeItem
            key={it}
            nodeId={path + '/' + it}
            label={<><Icon className='icon'>
              <embed src={`/icons/material/${icons.icons[id] || 'file'}.svg`} />
            </Icon>{it}</>}
          />
        }))
      : <StyledTreeItem key={0} nodeId={path + '/.'} label='' />
    const paths = path.split('/')
    const name = paths[paths.length - 1]
    return path
      ? <StyledTreeItem nodeId={path} onClick={() => setOpen(!open)} label={<>
        <Icon className='icon'>
          <embed src={`/icons/material/${icons.icons[(icons as any).folders[name]] || 'folder'}${open ? '-open' : ''}.svg`} />
        </Icon>{name}
      </>}>{children}</StyledTreeItem>
      : <>{children}</>
  }

const EMPTY = '$NekoMaid$Editor$Empty'
const Editor: React.FC<{ plugin: Plugin, editorRef: React.Ref<UnControlled>, loading: { '!#LOADING'?: boolean },
  dirs: Record<string, boolean>, refresh: () => void }> = React.memo(({ plugin, editorRef, loading, dirs, refresh }) => {
    const doc = (editorRef as any).current?.editor?.doc
    const theme = useTheme()
    const navigate = useNavigate()
    const lnText = useRef('')
    const path = useLocation().pathname.replace(/^\/NekoMaid\/files\/?/, '')
    const [text, setText] = useState<string | null>(null)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [notUndo, setNotUndo] = useState(true)
    const [notRedo, setNotRedo] = useState(true)
    const [notSave, setNotSave] = useState(true)
    const [isNewFile, setIsNewFile] = useState(false)
    useEffect(() => {
      setText(null)
      setError('')
      setIsNewFile(false)
      lnText.current = ''
      if (!path || dirs[path] || path.endsWith('/')) return
      loading['!#LOADING'] = true
      plugin.emit('files:content', (data: number | string | null) => {
        loading['!#LOADING'] = false
        switch (data) {
          case null: return setError(lang.files.unsupportedFormat)
          case 0: return setError(lang.files.notExists)
          case 1:
            setIsNewFile(true)
            setText('')
            setNotSave(true)
            break
          case 2: return navigate('./')
          case 3: return setError(lang.files.tooBig)
          default:
            if (typeof data !== 'string') return
            setText(data)
            lnText.current = data.replace(/\r/g, '')
            setNotSave(true)
        }
      }, path)
    }, [path])
    return <Card sx={{
      position: 'relative',
      '& .CodeMirror-dialog, .CodeMirror-scrollbar-filler': { backgroundColor: theme.palette.background.paper + '!important' }
    }}>
      <CardHeader
        title={<span style={{ fontWeight: 'normal' }}>
          {lang.files.editor}{path && ': ' + path}{path && isNewFile && <span className='bold'> ({lang.files.newFile})</span>}</span>}
        sx={{ position: 'relative' }}
        action={!error && path && text != null
          ? <Box sx={cardActionStyles}>
            <Tooltip title={lang.files.undo}>
              <span><IconButton size='small' disabled={notUndo} onClick={() => doc?.undo()}><Undo /></IconButton></span>
            </Tooltip>
            <Tooltip title={lang.files.undo}>
              <span><IconButton size='small' disabled={notRedo} onClick={() => doc?.redo()}><Redo /></IconButton></span>
            </Tooltip>
            <Tooltip title={lang.files.save}>{saving
              ? <CircularProgress size={24} sx={{ margin: '5px' }} />
              : <span><IconButton
              size='small'
              disabled={notSave}
              onClick={() => {
                if (!doc) return
                setSaving(true)
                const data = doc.getValue(text?.includes('\r\n') ? '\r\n' : '\n')
                plugin.emit('files:update', (res: boolean) => {
                  setSaving(false)
                  if (!res) failed()
                  lnText.current = data.replace(/\r/g, '')
                  setText(data)
                  setNotSave(true)
                  if (isNewFile) {
                    setIsNewFile(false)
                    success()
                    refresh()
                  }
                }, path, data)
              }}
            ><Save /></IconButton></span>}</Tooltip>
          </Box>
          : undefined}
      />
      <Divider />
      {(error || !path) && <CardContent><Empty title={error || lang.files.notSelected} /></CardContent>}
      <div style={{ position: text == null ? 'absolute' : undefined }}>
        <UnControlled
          ref={editorRef}
          value={text == null ? EMPTY : text}
          options={{
            phrases: lang.codeMirrorPhrases,
            mode: text == null ? '' : getMode(path),
            theme: theme.palette.mode === 'dark' ? 'material' : 'one-light',
            lineNumbers: true
          }}
          onChange={(_: any, { removed }: { removed: string[] }, newText: string) => {
            setNotSave(lnText.current === newText)
            if (removed?.[0] === EMPTY) doc?.clearHistory()
            const histroy = doc?.historySize()
            if (!histroy) return
            setNotUndo(!histroy.undo)
            setNotRedo(!histroy.redo)
          }}
        />
      </div>
    </Card>
  })

const fileNameDialog = (title: string, dirPath: string) => dialog({
  title,
  content: lang.files.dialogContent,
  input: {
    error: true,
    helperText: lang.files.invalidName,
    validator: validFilename,
    InputProps: { startAdornment: <InputAdornment position='start'>{dirPath}/</InputAdornment> }
  }
})

const anchorOrigin: any = {
  vertical: 'top',
  horizontal: 'right'
}
const Files: React.FC = () => {
  const plugin = usePlugin()
  const theme = useTheme()
  const navigate = useNavigate()
  const loc = useLocation()
  const drawerWidth = useDrawerWidth()
  const tree = useRef<HTMLHRElement | null>(null)
  const editor = useRef<UnControlled | null>(null)
  const prevExpanded = useRef<string[]>([])
  const dirs = useRef<Record<string, boolean>>({ })
  // eslint-disable-next-line func-call-spacing
  const loading = useRef<Record<string, () => Promise<void>> & { '!#LOADING'?: boolean }>({ })
  const [id, setId] = useState(0)
  const [curPath, setCurPath] = useState('')
  const [progress, setProgress] = useState(-1)
  const [copyPath, setCopyPath] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const [compressFile, setCompressFile] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null)

  const isDir = !!dirs.current[curPath]
  const dirPath = isDir ? curPath : curPath.substring(0, curPath.lastIndexOf('/'))

  const spacing = theme.spacing(3)
  const refresh = () => {
    loading.current = { }
    dirs.current = { }
    prevExpanded.current = []
    setCurPath('')
    setExpanded([])
    setId(id + 1)
  }

  useEffect(() => {
    if (!tree.current) return
    const resize = () => {
      if (!tree.current) return
      const height = tree.current.style.maxHeight = (window.innerHeight - tree.current.offsetTop - parseInt(spacing)) + 'px'
      const style = (editor as any).current?.editor?.display?.wrapper?.style
      if (style) style.height = height
    }
    resize()
    window.addEventListener('resize', resize)
    return window.removeEventListener('resize', resize)
  }, [tree.current, spacing])

  return <Box sx={{ height: '100vh', py: 3 }}>
    <Toolbar />
    <Container maxWidth={false}>
      <Grid container spacing={3} sx={{ width: { sm: `calc(100vw - ${drawerWidth}px - ${theme.spacing(3)})` } }}>
        <Grid item lg={4} md={12} xl={3} xs={12}>
          <Card sx={{ minHeight: 400 }}>
            <CardHeader
              title={lang.files.filesList}
              sx={{ position: 'relative' }}
              action={<Box sx={{ position: 'absolute', right: theme.spacing(1), top: '50%', transform: 'translateY(-50%)' }}
            >
              <Tooltip title={lang.files.delete}><span>
                <IconButton
                  disabled={!curPath}
                  size='small'
                  onClick={() => dialog({
                    okButton: { color: 'error' },
                    content: <>{lang.files.confirmDelete(<span className='bold'>{curPath}</span>)}&nbsp;
                      <span className='bold' style={{ color: theme.palette.error.main }}>({lang.unrecoverable})</span></>
                  }).then(it => it && plugin.emit('files:update', (res: boolean) => {
                    action(res)
                    if (!res) return
                    refresh()
                    if (loc.pathname.replace(/^\/NekoMaid\/files\/?/, '') === curPath) navigate('/NekoMaid/files')
                  }, curPath))}
                ><DeleteForever /></IconButton>
              </span></Tooltip>
              <Tooltip title={lang.files.createFile}>
                <IconButton size='small' onClick={() => fileNameDialog(lang.files.createFile, curPath)
                  .then(it => it != null && navigate(`/NekoMaid/files/${dirPath ? dirPath + '/' : ''}${it}`))}>
              <Description /></IconButton></Tooltip>
              <Tooltip title={lang.files.createFolder}>
                <IconButton size='small' onClick={() => fileNameDialog(lang.files.createFolder, curPath)
                  .then(it => it != null && plugin.emit('files:createDirectory', (res: boolean) => {
                    action(res)
                    if (res) refresh()
                  }, dirPath + '/' + it))}><CreateNewFolder /></IconButton></Tooltip>
              <Tooltip title={lang.more}>
                <IconButton size='small' onClick={e => setAnchorEl(anchorEl ? null : e.currentTarget)}><MoreHoriz /></IconButton>
              </Tooltip>
            </Box>} />
            <Divider />
            <TreeView
              ref={tree}
              defaultCollapseIcon={<ArrowDropDown />}
              defaultExpandIcon={<ArrowRight />}
              sx={{ flexGrow: 1, width: '100%', overflowY: 'auto' }}
              expanded={expanded}
              onNodeToggle={(_: any, it: string[]) => {
                const l = loading.current
                if (it.length < prevExpanded.current.length || !l[it[0]]) {
                  setExpanded(it)
                  prevExpanded.current = it
                  return
                }
                l[it[0]]().then(() => {
                  prevExpanded.current.unshift(it[0])
                  setExpanded([...prevExpanded.current])
                  delete l[it[0]]
                })
                delete l[it[0]]
              }}
              onNodeSelect={(_: any, it: string) => {
                setCurPath(it[0] === '/' ? it.slice(1) : it)
                if (dirs.current[it] || loading.current['!#LOADING']) return
                if (it.startsWith('/')) it = it.slice(1)
                navigate('/NekoMaid/files/' + it)
              }}
            >
              <Item plugin={plugin} path='' loading={loading.current} dirs={dirs.current} key={id} />
            </TreeView>
          </Card>
        </Grid>
        <Grid item lg={8} md={12} xl={9} xs={12} sx={{ maxWidth: `calc(100vw - ${theme.spacing(1)})`, paddingBottom: 3 }}>
          <Editor plugin={plugin} editorRef={editor} loading={loading.current} dirs={dirs.current} refresh={refresh} />
        </Grid>
      </Grid>
    </Container>
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={() => setAnchorEl(null)}
      anchorOrigin={anchorOrigin}
      transformOrigin={anchorOrigin}
    >
      <MenuItem onClick={() => {
        refresh()
        setAnchorEl(null)
      }}><ListItemIcon><Refresh /></ListItemIcon>{lang.refresh}</MenuItem>
      <MenuItem disabled={!curPath} onClick={() => {
        setAnchorEl(null)
        fileNameDialog(lang.files.rename, curPath).then(it => it != null && plugin.emit('files:rename', (res: boolean) => {
          action(res)
          if (res) refresh()
        }, curPath, dirPath + '/' + it))
      }}><ListItemIcon><DriveFileRenameOutline /></ListItemIcon>{lang.files.rename}</MenuItem>
      <MenuItem disabled={!curPath} onClick={() => {
        setAnchorEl(null)
        setCopyPath(curPath)
      }}>
        <ListItemIcon><FileCopy /></ListItemIcon>{lang.files.copy}
      </MenuItem>
      <MenuItem disabled={!copyPath} onClick={() => {
        setAnchorEl(null)
        toast(lang.files.pasting)
        plugin.emit('files:copy', (res: boolean) => {
          action(res)
          refresh()
        }, copyPath, dirPath)
      }}>
        <ListItemIcon><ContentPaste /></ListItemIcon>{lang.files.paste}
      </MenuItem>
      <MenuItem disabled={progress !== -1} component='label' htmlFor='NekoMaid-files-upload-input' onClick={() => setAnchorEl(null)}>
        <ListItemIcon><Upload /></ListItemIcon>{progress === -1 ? lang.files.upload : `${lang.files.uploading} (${progress.toFixed(2)}%)`}
      </MenuItem>
      <MenuItem disabled={isDir} onClick={() => {
        setAnchorEl(null)
        toast(lang.files.downloading)
        plugin.emit('files:download', (res: ArrayBuffer | null) => {
          if (res) window.open(address! + 'Download/' + res, '_blank')
          else failed()
        }, curPath)
      }}><ListItemIcon><Download /></ListItemIcon>{lang.files.download}</MenuItem>
      <MenuItem onClick={() => {
        setAnchorEl(null)
        setCompressFile(curPath)
      }}><ListItemIcon><Inbox /></ListItemIcon>{lang.files.compress}</MenuItem>
      <MenuItem onClick={() => {
        setAnchorEl(null)
        toast(lang.files.uncompressing)
        plugin.emit('files:compress', (res: boolean) => {
          action(res)
          refresh()
        }, curPath)
      }}><ListItemIcon><Outbox /></ListItemIcon>{lang.files.decompress}</MenuItem>
    </Menu>
    <Input id='NekoMaid-files-upload-input' type='file' sx={{ display: 'none' }} onChange={e => {
      const elm = e.target as HTMLInputElement
      const file = elm.files?.[0]
      elm.value = ''
      if (!file) return
      const size = file.size
      if (size > 128 * 1024 * 1024) return failed(lang.files.uploadTooBig)
      toast(lang.files.uploading)
      const name = dirPath + '/' + file.name
      if (dirs.current[name] != null) return failed(lang.files.exists)
      plugin.emit('files:upload', (res: string | null) => {
        if (!res) return failed(lang.files.exists)
        const formdata = new FormData()
        formdata.append('file', file)
        const xhr = new XMLHttpRequest()
        setProgress(0)
        xhr.open('put', address! + 'Upload/' + res)
        xhr.onreadystatechange = () => {
          if (xhr.readyState !== 4) return
          setProgress(-1)
          action(xhr.status === 200)
          refresh()
        }
        xhr.upload.onprogress = e => e.lengthComputable && setProgress(e.loaded / e.total * 100)
        xhr.send(formdata)
      }, name[0] === '/' ? name.slice(1) : name)
    }} />
    <CompressDialog file={compressFile} path={dirPath} dirs={dirs.current} onClose={() => setCompressFile(null)} refresh={refresh} plugin={plugin} />
  </Box>
}

export default Files
