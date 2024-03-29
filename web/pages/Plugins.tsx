import React, { useEffect, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import { useGlobalData, usePlugin } from '../Context'
import { action } from '../toast'
import ReactECharts from 'echarts-for-react'
import dialog from '../dialog'
import { lang } from '../../languages'

import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import TableContainer from '@mui/material/TableContainer'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import Grid from '@mui/material/Grid'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import Checkbox from '@mui/material/Checkbox'
import Tooltip from '@mui/material/Tooltip'
import Link from '@mui/material/Link'
import IconButton from '@mui/material/IconButton'

import Lock from '@mui/icons-material/Lock'
import LockOpen from '@mui/icons-material/LockOpen'
import DeleteForever from '@mui/icons-material/DeleteForever'

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
    case 'NBTAPI':
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
            <CardHeader title={lang.plugins.title} />
            <Divider />
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ paddingRight: 0 }}>{lang.plugins.enable}</TableCell>
                    <TableCell>{lang.plugins.name}</TableCell>
                    <TableCell>{lang.plugins.version}</TableCell>
                    <TableCell>{lang.plugins.author}</TableCell>
                    <TableCell>{lang.plugins.description}</TableCell>
                    <TableCell align='right'>{lang.operations}</TableCell>
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
                        <Tooltip title={lang.plugins[disabledForever ? 'enablePlugin' : 'disableForever']}><span>
                          <IconButton
                            disabled={it.enabled || (it.loaded && !canLoadPlugin)}
                            onClick={() => plugin.emit('plugins:disableForever', it.file, action)}
                          >{disabledForever ? <LockOpen /> : <Lock />}</IconButton>
                        </span></Tooltip>
                        {disabledForever && <Tooltip title={lang.plugins.delete}><span>
                            <IconButton
                              color='error'
                              disabled={canBeDisabled}
                              onClick={() => dialog({
                                okButton: { color: 'error' },
                                content: <>{lang.plugins.confirmDelete(<span className='bold'>{it.file.replace(/\.disabled$/, '')}</span>)}&nbsp;
                                  <span className='bold' style={{ color: theme.palette.error.main }}>({lang.unrecoverable})</span></>
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
            <CardHeader title={lang.plugins.dependency} />
            <Divider />
            <ReactECharts style={{ marginTop: theme.spacing(1), height: 450 }} theme={theme.palette.mode === 'dark' ? 'dark' : undefined} option={{
              backgroundColor: 'rgba(0, 0, 0, 0)',
              legend: { data: lang.plugins.categories },
              series: [
                {
                  edgeSymbol: ['none', 'arrow'],
                  symbolSize: 13,
                  type: 'graph',
                  layout: 'force',
                  data,
                  links,
                  categories: lang.plugins.categories.map(name => ({ name, base: name })),
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
