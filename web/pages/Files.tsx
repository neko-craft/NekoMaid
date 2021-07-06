import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/material.css'
import 'codemirror/mode/xml/xml'
import 'codemirror/mode/yaml/yaml'
import 'codemirror/mode/shell/shell'
import 'codemirror/mode/powershell/powershell'
import 'codemirror/mode/properties/properties'
import 'codemirror/mode/javascript/javascript'

import React, { useEffect, useState, useRef } from 'react'
import { styled, alpha, useTheme } from '@material-ui/core/styles'
import { TreeView, TreeItem } from '@material-ui/lab'
import { iconClasses } from '@material-ui/core/Icon'
import { treeItemClasses, TreeItemProps } from '@material-ui/lab/TreeItem'
import { Box, Toolbar, Container, Grid, Card, CardHeader, Divider, Icon, CardContent, IconButton, Tooltip,
  Menu, MenuItem, ListItemIcon, CircularProgress, InputAdornment } from '@material-ui/core'
import { ArrowDropDown, ArrowRight, Save, Undo, Redo, DeleteForever, CreateNewFolder, Refresh, MoreHoriz,
  Description, Upload, Download } from '@material-ui/icons'
import { useHistory, useLocation } from 'react-router-dom'
import { UnControlled } from 'react-codemirror2'
import { usePlugin } from '../Context'
import * as icons from '../../icons.json'
import validFilename from 'valid-filename'
import Empty from '../components/Empty'
import Plugin from '../Plugin'
import toast from '../toast'
import dialog from '../dialog'

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

const Item: React.FC<{ plugin: Plugin, path: string, loading: Record<string, () => Promise<void>>, dirs: Record<string, null> }> =
  ({ dirs, plugin, path, loading }) => {
    const [files, setFiles] = useState<[string[], string[]] | undefined>()
    const load = () => new Promise<void>(resolve => plugin.emit('files:fetch', path, (data: any) => {
      setFiles(data)
      resolve()
    }))
    useEffect(() => {
      dirs[path] = null
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
              <embed src={`/icons/${icons.icons[id] || 'file'}.svg`} />
            </Icon>{it}</>}
          />
        }))
      : [<StyledTreeItem key={0} nodeId={path + '/.'} label='' />]
    const paths = path.split('/')
    const name = paths[paths.length - 1]
    return path
      ? <StyledTreeItem nodeId={path} label={<>
        <Icon className='icon'><embed src={`/icons/${icons.icons[(icons as any).folders[name]] || 'folder'}.svg`} /></Icon>{name}
      </>}>{children}</StyledTreeItem>
      : <>{children}</>
  }

const EMPTY = '$NekoMaid$Editor$Empty'
const Editor: React.FC<{ plugin: Plugin, editorRef: React.Ref<UnControlled>, loading: { '!#LOADING'?: boolean },
  dirs: Record<string, null>, refresh: () => void }> = ({ plugin, editorRef, loading, dirs, refresh }) => {
    const doc = (editorRef as any).current?.editor?.doc
    const theme = useTheme()
    const his = useHistory()
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
      plugin.emit('files:content', path, data => {
        loading['!#LOADING'] = false
        switch (data) {
          case null: return setError('文件格式不被支持!')
          case 0: return setError('文件不存在!')
          case 1:
            setIsNewFile(true)
            setText('')
            setNotSave(true)
            break
          case 2: return his.replace('./')
          case 3: return setError('文件太大了!')
          default:
            setText(data)
            lnText.current = data.replace(/\r/g, '')
            setNotSave(true)
        }
      })
    }, [path])
    return <Card sx={{ position: 'relative' }}>
      <CardHeader
        title={<span style={{ fontWeight: 'normal' }}>编辑器{path && ': ' + path}{path && isNewFile && <span className='bold'> (新文件)</span>}</span>}
        sx={{ position: 'relative' }}
        action={!error && path && text != null
          ? <Box sx={{ position: 'absolute', right: theme.spacing(1), top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
            <Tooltip title='撤销'><span><IconButton size='small' disabled={notUndo} onClick={() => doc?.undo()}><Undo /></IconButton></span></Tooltip>
            <Tooltip title='重做'><span><IconButton size='small' disabled={notRedo} onClick={() => doc?.redo()}><Redo /></IconButton></span></Tooltip>
            <Tooltip title='保存'>{saving
              ? <CircularProgress size={24} sx={{ margin: '5px' }} />
              : <span><IconButton
              size='small'
              disabled={notSave}
              onClick={() => {
                if (!doc) return
                setSaving(true)
                const data = doc.getValue(text?.includes('\r\n') ? '\r\n' : '\n')
                plugin.emit('files:update', [path, data], res => {
                  setSaving(false)
                  if (!res) toast('保存失败!', 'error')
                  lnText.current = data.replace(/\r/g, '')
                  setText(data)
                  setNotSave(true)
                  if (isNewFile) {
                    setIsNewFile(false)
                    toast('保存成功!', 'success')
                    refresh()
                  }
                })
              }}
            ><Save /></IconButton></span>}</Tooltip>
          </Box>
          : undefined}
      />
      <Divider />
      {(error || !path) && <CardContent><Empty title={error || '请先在左侧选择要编辑的文件'} /></CardContent>}
      <div style={{ position: text == null ? 'absolute' : undefined }}>
        <UnControlled
          ref={editorRef}
          value={text == null ? EMPTY : text}
          options={{
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
  }

const anchorOrigin: any = {
  vertical: 'top',
  horizontal: 'right'
}
const Files: React.FC = () => {
  const plugin = usePlugin()
  const theme = useTheme()
  const his = useHistory()
  const loc = useLocation()
  const tree = useRef<HTMLHRElement | null>(null)
  const editor = useRef<UnControlled | null>(null)
  const prevExpanded = useRef<string[]>([])
  const dirs = useRef<Record<string, null>>({ })
  // eslint-disable-next-line func-call-spacing
  const loading = useRef<Record<string, () => Promise<void>> & { '!#LOADING'?: boolean }>({ })
  const [id, setId] = useState(0)
  const [curPath, setCurPath] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null)

  const dirPath = typeof dirs.current[curPath] === 'object' ? curPath : curPath.substring(0, curPath.lastIndexOf('/'))

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
      <Grid container spacing={3}>
        <Grid item lg={4} md={6} xl={3} xs={12}>
          <Card sx={{ minHeight: 400 }}>
            <CardHeader
              title='文件列表'
              sx={{ position: 'relative' }}
              action={<Box sx={{ position: 'absolute', right: theme.spacing(1), top: '50%', transform: 'translateY(-50%)' }}
            >
              <Tooltip title='删除'><span>
                <IconButton
                  disabled={!curPath}
                  size='small'
                  onClick={() => dialog({
                    okButton: { color: 'error' },
                    content: <>确认要删除 <span className='bold'>{curPath}</span> 吗?&nbsp;
                      <span className='bold' style={{ color: theme.palette.error.main }}>(不可撤销!)</span></>
                  }).then(it => it && plugin.emit('files:update', [curPath], res => {
                    if (!res) return toast('删除失败!', 'error')
                    refresh()
                    toast('删除成功!', 'success')
                    if (loc.pathname.replace(/^\/NekoMaid\/files\/?/, '') === curPath) his.push('/NekoMaid/files')
                  }))}
                ><DeleteForever /></IconButton>
              </span></Tooltip>
              <Tooltip title='新建文件'>
                <IconButton size='small' onClick={() => dialog({
                  title: '新建文件',
                  content: '请输入您要创建的文件名:',
                  input: {
                    error: true,
                    helperText: '文件名不合法!',
                    validator: validFilename,
                    InputProps: { startAdornment: <InputAdornment position='start'>{dirPath}/</InputAdornment> }
                  }
                }).then(it => it != null && his.push(`/NekoMaid/files/${dirPath ? dirPath + '/' : ''}${it}`))}>
              <Description /></IconButton></Tooltip>
              <Tooltip title='新建目录'>
                <IconButton size='small' onClick={() => dialog({
                  title: '创建文件夹',
                  content: '请输入您要创建的文件夹名:',
                  input: {
                    error: true,
                    helperText: '文件名不合法!',
                    validator: validFilename,
                    InputProps: { startAdornment: <InputAdornment position='start'>{dirPath}/</InputAdornment> }
                  }
                }).then(it => it != null && plugin.emit('files:createDirectory', dirPath + '/' + it, res => {
                  if (!res) return toast('创建失败!', 'error')
                  toast('创建成功!', 'success')
                  refresh()
                }))}><CreateNewFolder /></IconButton></Tooltip>
              <Tooltip title='更多...'>
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
                if (typeof dirs.current[it] === 'object' || loading.current['!#LOADING']) return
                if (it.startsWith('/')) it = it.slice(1)
                his.push('/NekoMaid/files/' + it)
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
      }}><ListItemIcon><Refresh /></ListItemIcon>刷新</MenuItem>
      <MenuItem disabled={!curPath} onClick={() => {
        setAnchorEl(null)
        dialog({
          title: '重命名',
          content: '请输入您想要的新文件名:',
          input: {
            error: true,
            helperText: '文件名不合法!',
            validator: validFilename,
            InputProps: { startAdornment: <InputAdornment position='start'>{dirPath}/</InputAdornment> }
          }
        }).then(it => it != null && plugin.emit('files:rename', [curPath, dirPath + '/' + it], res => {
          if (!res) return toast('操作失败!', 'error')
          toast('操作成功!', 'success')
          refresh()
        }))
      }}><ListItemIcon><Refresh /></ListItemIcon>重命名</MenuItem>
      <MenuItem disabled><ListItemIcon><Upload /></ListItemIcon>上载文件</MenuItem>
      <MenuItem disabled><ListItemIcon><Download /></ListItemIcon>下传文件</MenuItem>
    </Menu>
  </Box>
}

export default Files
