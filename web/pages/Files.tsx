import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/material.css'
import 'codemirror/mode/xml/xml'
import 'codemirror/mode/yaml/yaml'
import 'codemirror/mode/shell/shell'
import 'codemirror/mode/powershell/powershell'
import 'codemirror/mode/properties/properties'
import 'codemirror/mode/javascript/javascript'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { styled, alpha, useTheme } from '@material-ui/core/styles'
import { TreeView, TreeItem } from '@material-ui/lab'
import { iconClasses } from '@material-ui/core/Icon'
import { treeItemClasses, TreeItemProps } from '@material-ui/lab/TreeItem'
import { Box, Toolbar, Container, Grid, Card, CardHeader, Divider, Icon, CardContent } from '@material-ui/core'
import { ArrowDropDown, ArrowRight } from '@material-ui/icons'
import { useHistory, useLocation } from 'react-router-dom'
import { UnControlled } from 'react-codemirror2'
import { usePlugin } from '../Context'
import * as icons from '../../icons.json'
import Empty from '../components/Empty'
import Plugin from '../Plugin'
import toast from '../toast'

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

const Editor: React.FC<{ plugin: Plugin, editorRef: React.Ref<UnControlled>, loading: { '!#LOADING'?: boolean }, dirs: Record<string, null> }> =
  ({ plugin, editorRef, loading, dirs }) => {
    const theme = useTheme()
    const his = useHistory()
    const path = useLocation().pathname.replace(/^\/NekoMaid\/files\/?/, '')
    const [text, setText] = useState<string | null>(null)
    const [error, setError] = useState('')
    useEffect(() => {
      setText(null)
      setError('')
      if (!path || dirs[path] || path.endsWith('/')) return
      plugin.emit('files:content', path, data => {
        switch (data) {
          case null:
            toast('文件格式不支持!', 'error')
            setError('文件格式不支持!')
            break
          case 0:
            toast('文件不存在!', 'error')
            setError('文件不存在!')
            break
          case 1: return his.replace('./')
          case 2:
            toast('文件太大了!', 'error')
            setError('文件太大了!')
            break
          default: setText(data)
        }
      })
    }, [path])
    return <Card sx={{ position: 'relative' }}>
      <CardHeader title={path ? '编辑器: ' + path : '编辑器'} />
      <Divider />
      {(error || !path) && <CardContent><Empty title={error || '请先在左侧选择要编辑的文件'} /></CardContent>}
      <div style={{ position: text == null ? 'absolute' : undefined }}>
        <UnControlled
          ref={editorRef}
          value={text || ''}
          options={{
            mode: text == null ? '' : getMode(path),
            theme: theme.palette.mode === 'dark' ? 'material' : 'one-light',
            lineNumbers: true,
            lint: true
          }}
        />
      </div>
    </Card>
  }

const Files: React.FC = () => {
  const plugin = usePlugin()
  const theme = useTheme()
  const his = useHistory()
  const tree = useRef<HTMLHRElement | null>(null)
  const editor = useRef<UnControlled | null>(null)
  const ref = useRef<string[]>([])
  const dirs = useMemo<Record<string, null>>(() => ({ }), [])
  // eslint-disable-next-line func-call-spacing
  const loading = useMemo<Record<string, () => Promise<void>> & { '!#LOADING'?: boolean }>(() => ({ }), [])
  const [expanded, setExpanded] = useState<string[]>([])

  const spacing = theme.spacing(3)

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
            <CardHeader title='文件列表' />
            <Divider />
            <TreeView
              ref={tree}
              defaultCollapseIcon={<ArrowDropDown />}
              defaultExpandIcon={<ArrowRight />}
              sx={{ flexGrow: 1, width: '100%', overflowY: 'auto' }}
              expanded={expanded}
              onNodeToggle={(_: any, it: string[]) => {
                if (it.length < ref.current.length || !loading[it[0]]) {
                  setExpanded(it)
                  ref.current = it
                  return
                }
                loading[it[0]]().then(() => {
                  ref.current.unshift(it[0])
                  setExpanded([...ref.current])
                  delete loading[it[0]]
                })
                delete loading[it[0]]
              }}
              onNodeSelect={(_: any, it: string) => {
                if (typeof dirs[it] === 'object' || loading['!#LOADING']) return
                if (it.startsWith('/')) it = it.slice(1)
                his.push('/NekoMaid/files/' + it)
              }}
            >
              <Item plugin={plugin} path='' loading={loading} dirs={dirs} />
            </TreeView>
          </Card>
        </Grid>
        <Grid item lg={8} md={12} xl={9} xs={12} sx={{ maxWidth: `calc(100vw - ${theme.spacing(1)})`, paddingBottom: 3 }}>
          <Editor plugin={plugin} editorRef={editor} loading={loading} dirs={dirs} />
        </Grid>
      </Grid>
    </Container>
  </Box>
}

export default Files
