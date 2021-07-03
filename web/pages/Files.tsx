import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/material.css'
import 'codemirror/mode/xml/xml'
import 'codemirror/mode/yaml/yaml'
import 'codemirror/mode/javascript/javascript'
import React, { useEffect, useState, useRef, useMemo } from 'react'
import { styled, alpha, useTheme } from '@material-ui/core/styles'
import { TreeView, TreeItem } from '@material-ui/lab'
import { iconClasses } from '@material-ui/core/Icon'
import { treeItemClasses, TreeItemProps } from '@material-ui/lab/TreeItem'
import { Box, Toolbar, Container, Grid, Card, CardHeader, Divider, Icon } from '@material-ui/core'
import { ArrowDropDown, ArrowRight } from '@material-ui/icons'
import { UnControlled } from 'react-codemirror2'
import { usePlugin } from '../Context'
import { useParams } from 'react-router'
import * as icons from '../../icons.json'
import Plugin from '../Plugin'

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

const Item: React.FC<{ plugin: Plugin, path: string, loading: Record<string, () => Promise<void>> }> = ({ plugin, path, loading }) => {
  const [files, setFiles] = useState<[string[], string[]] | undefined>()
  const load = () => new Promise<void>(resolve => plugin.emit('files:fetch', path, (data: any) => {
    setFiles(data)
    resolve()
  }))
  useEffect(() => { if (path) loading[path] = load; else load() }, [])
  const children = files
    ? files[0].map(it => <Item plugin={plugin} key={it} path={path ? path + '/' + it : it} loading={loading} />)
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

const Editor: React.FC = () => {
  const theme = useTheme()
  return <UnControlled
    value={`function getCompletions(token, context) {
      var found = [], start = token.string;
      function maybeAdd(str) {
        if (str.indexOf(start) == 0) found.push(str);
      }
      function gatherCompletions(obj) {
        if (typeof obj == "string") forEach(stringProps, maybeAdd);
        else if (obj instanceof Array) forEach(arrayProps, maybeAdd);
        else if (obj instanceof Function) forEach(funcProps, maybeAdd);
        for (var name in obj) maybeAdd(name);
      }
    
      if (context) {
        // If this is a property, see if it belongs to some object we can
        // find in the current environment.
        var obj = context.pop(), base;
        if (obj.className == "js-variable")
          base = window[obj.string];
        else if (obj.className == "js-string")
          base = "";
        else if (obj.className == "js-atom")
          base = 1;
        while (base != null && context.length)
          base = base[context.pop().string];
        if (base != null) gatherCompletions(base);
      }
      else {
        // If not, just look in the window object and any local scope
        // (reading into JS mode internals to get at the local variables)
        for (var v = token.state.localVars; v; v = v.next) maybeAdd(v.name);
        gatherCompletions(window);
        forEach(keywords, maybeAdd);
      }
      return found;
    }
    `}
    options={{
      mode: 'javascript',
      theme: theme.palette.mode === 'dark' ? 'material' : 'one-light',
      lineNumbers: true
    }}
  />
}

const Files: React.FC = () => {
  const plugin = usePlugin()
  const ref = useRef<string[]>([])
  // eslint-disable-next-line func-call-spacing
  const loading = useMemo<Record<string, () => Promise<void>>>(() => ({ }), [])
  const [expanded, setExpanded] = useState<string[]>([])
  return <Box sx={{ height: '100vh', paddingTop: 3, paddingBottom: 3, overflow: 'hidden' }}>
    <Toolbar />
    <Container maxWidth={false}>
      <Grid container spacing={3}>
        <Grid item lg={4} md={6} xl={3} xs={12}>
          <Card sx={{ minHeight: 400 }}>
            <CardHeader title='文件' />
            <Divider />
              <TreeView
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
              >
                <Item plugin={plugin} path='' loading={loading} />
              </TreeView>
          </Card>
        </Grid>
        <Grid item lg={8} md={12} xl={9} xs={12}>
          <Card sx={{ minHeight: 400 }}>
            <CardHeader title='文件' />
            <Divider />
            <Editor />
          </Card>
        </Grid>
      </Grid>
    </Container>
  </Box>
}

export default Files
