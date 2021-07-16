import React, { useEffect, useState } from 'react'
import { useTheme } from '@material-ui/core/styles'
import { useGlobalData, usePlugin } from '../Context'
import { Lock, LockOpen, DeleteForever } from '@material-ui/icons'
import { Box, Toolbar, Container, Card, CardHeader, Divider, TableContainer, Table, TableHead, Grid,
  TableRow, TableCell, TableBody, Checkbox, Tooltip, Link, IconButton } from '@material-ui/core'
import { action } from '../toast'
import ReactECharts from 'echarts-for-react'
import dialog from '../dialog'

// import { SigmaContainer, useSigma } from 'react-sigma-v2'

interface Plugin {
  name: string
  file: string
  author: string
  description: string
  website?: string
  version: string
  enabled: boolean
  loaded: boolean
  depends: string[]
  softDepends: string[]
}

const canPluginBeDisabled = (it: string) => {
  switch (it) {
    case 'Uniporter':
    case 'NekoMaid':
    case 'PlugMan': return true
    default: return false
  }
}

const Plugins: React.FC = () => {
  const plugin = usePlugin()
  const theme = useTheme()
  const { canLoadPlugin } = useGlobalData()
  const [plugins, setPlugins] = useState<Plugin[]>([])
  useEffect(() => {
    const offList = plugin.on('plugins:list', (plugins: Plugin[]) => {
      const arr: Plugin[] = []
      setPlugins(plugins.filter(it => {
        const res = canPluginBeDisabled(it.name)
        if (res) arr.push(it)
        return !res
      }).concat(arr))
    })
    plugin.emit('plugins:fetch')
    return () => {
      offList()
    }
  }, [])

  const map: Record<string, number> = { }
  let id = 0
  const data = plugins.map(it => {
    map[it.name] = id
    return { id: id++, name: it.name, category: 1 - (it.enabled as any) }
  })
  const links: Array<{ source: number, target: number }> = []
  plugins.forEach(it => {
    const source = map[it.name]
    it.depends.forEach(dep => {
      if (!(dep in map)) {
        map[dep] = id
        data.push({ id: id++, name: dep, category: 3 })
      }
      links.push({ source, target: map[dep] })
    })
    it.softDepends.forEach(dep => {
      if (!(dep in map)) {
        map[dep] = id
        data.push({ id: id++, name: dep, category: 2 })
      }
      links.push({ source, target: map[dep] })
    })
  })
  return <Box sx={{ minHeight: '100%', py: 3 }}>
    <Toolbar />
    <Container maxWidth={false}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader title='插件列表' />
            <Divider />
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ paddingRight: 0 }}>启用</TableCell>
                    <TableCell>插件名</TableCell>
                    <TableCell>版本</TableCell>
                    <TableCell>作者</TableCell>
                    <TableCell>简介</TableCell>
                    <TableCell align='right'>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {plugins.map(it => {
                    const canBeDisabled = canPluginBeDisabled(it.name)
                    const disabledForever = it.file.endsWith('.disabled')
                    return <TableRow key={it.name}>
                      <TableCell padding='checkbox'>
                        <Checkbox
                          color='primary'
                          checked={it.enabled}
                          disabled={disabledForever || canBeDisabled}
                          onChange={() => plugin.emit('plugins:enable', it.file, it.name, action)
                        } />
                      </TableCell>
                      <TableCell><Tooltip title={it.file}><span>{it.name}</span></Tooltip></TableCell>
                      <TableCell>{it.website
                        ? <Link underline='hover' rel='noopener' target='_blank' href={it.website}>{it.version}</Link>
                        : it.version
                      }</TableCell>
                      <TableCell>{it.author}</TableCell>
                      <TableCell>{it.description}</TableCell>
                      <TableCell align='right' sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title={disabledForever ? '启用插件' : '永久禁用'}><span>
                          <IconButton
                            disabled={it.enabled || (it.loaded && !canLoadPlugin)}
                            onClick={() => plugin.emit('plugins:disableForever', it.file, action)}
                          >{disabledForever ? <LockOpen /> : <Lock />}</IconButton>
                        </span></Tooltip>
                        {disabledForever && <Tooltip title='删除插件'><span>
                            <IconButton
                              color='error'
                              disabled={canBeDisabled}
                              onClick={() => dialog({
                                okButton: { color: 'error' },
                                content: <>确认要删除插件 <span className='bold'>{it.file.replace(/\.disabled$/, '')}</span> 吗?&nbsp;
                                  <span className='bold' style={{ color: theme.palette.error.main }}>(不可撤销!)</span></>
                              }).then(res => res && plugin.emit('plugins:delete', it.file, action))}
                            ><DeleteForever /></IconButton>
                          </span></Tooltip>}
                      </TableCell>
                    </TableRow>
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardHeader title='依赖关系' />
            <Divider />
            <ReactECharts style={{ marginTop: theme.spacing(1), height: 450 }} theme={theme.palette.mode === 'dark' ? 'dark' : undefined} option={{
              backgroundColor: 'rgba(0, 0, 0, 0)',
              legend: { data: ['已安装', '未启用', '可选插件', '缺少的前置'] },
              series: [
                {
                  edgeSymbol: ['none', 'arrow'],
                  symbolSize: 13,
                  type: 'graph',
                  layout: 'force',
                  data,
                  links,
                  categories: [{ name: '已安装', base: '已安装' }, { name: '未启用', base: '未启用' }, { name: '可选插件', base: '可选插件' },
                    { name: '缺少的前置', base: '缺少的前置' }],
                  roam: true,
                  label: {
                    show: true,
                    position: 'right',
                    formatter: '{b}'
                  },
                  labelLayout: {
                    hideOverlap: true
                  }
                }
              ]
            }} />
          </Card>
        </Grid>
      </Grid>
    </Container>
  </Box>
}

export default Plugins
