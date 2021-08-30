import React, { useState, useEffect, useMemo } from 'react'
import lang, { minecraft } from '../../languages'
import ReactECharts from 'echarts-for-react'
import prettyBytes from 'pretty-bytes'
import Empty from '../components/Empty'
import decamelize from 'decamelize'
import { useTheme } from '@material-ui/core/styles'
import { getClassName } from '../utils'
import { useGlobalData, usePlugin } from '../Context'
import { CircularLoading } from '../components/Loading'
import { DataGrid, GridColDef, GridRowData, GridSortItem } from '@mui/x-data-grid'
import { PlayArrow, Stop, Equalizer, ExpandMore, ChevronRight, ViewList } from '@material-ui/icons'
import { TreeView, TreeItem } from '@material-ui/lab'
import { Box, Tabs, Tab, Toolbar, Paper, Fab, Badge, Container, Grid, Card, CardHeader, IconButton,
  Divider, CardContent, Switch, FormControlLabel, Typography, Link } from '@material-ui/core'
import { cardActionStyles } from '../theme'
import dialog from '../dialog'

const MB = 1024 * 1024
const GB = MB * 1024

export const ProfilerIcon: React.FC = () => {
  const plugin = usePlugin()
  const globalData = useGlobalData()
  const [status, setStatus] = useState(!!globalData.profilerStarted)
  useEffect(() => {
    const off = plugin.on('profiler:status', (res: boolean) => {
      setStatus(globalData.profilerStarted = res)
    })
    return () => { off() }
  })
  return <Badge color='secondary' variant='dot' invisible={!status}><Equalizer /></Badge>
}

interface Status {
  time: number
  threads: number
  reads: number
  writes: number
  recv: number
  sent: number
  processorLoad: number[]
  tps: number
  mspt: number
  cpu: number
  memory: number
  totalMemory: number
  temperature: number
  chunkLoads: number
  chunkUnloads: number
  worlds?: Array<{ name: string, entities: number, chunks: number, tiles: number }>
}

interface TimingsData {
  data: [number, number, number, [number, number, number][] | undefined][]
  handlers: Record<number, [number, string]>
  groups: string[]
}

const bytesMap = (arr: { value: number, seriesName: string }[]) =>
  arr.map(({ value, seriesName }) => seriesName + ': ' + prettyBytes(value * MB)).join('<br>')

const Summary: React.FC = React.memo(() => {
  const plugin = usePlugin()
  const theme = useTheme()
  const globalData = useGlobalData()
  const [status, setStatus] = useState<Status[]>([])
  useEffect(() => {
    const off = plugin.on('profiler:current', (it: any) => setStatus(old => {
      if (old.length > 25) old.shift()
      const time = new Date()
      it.time = time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0') +
        ':' + time.getSeconds().toString().padStart(2, '0')
      return [...old, it]
    }))
    return () => { off() }
  }, [])

  const xAxis: any[] = []
  const tps: any[] = []
  const mspt: any[] = []
  const chunkLoads: any[] = []
  const chunkUnloads: any[] = []
  const cpu: any[] = []
  const temperature: any[] = []
  const memory: any[] = []
  const threads: any[] = []
  const reads: any[] = []
  const writes: any[] = []
  const sent: any[] = []
  const recv: any[] = []
  const entities: any[][] = []
  const tiles: any[][] = []
  const chunks: any[][] = []
  status.forEach(it => {
    xAxis.push(it.time)
    tps.push(it.tps.toFixed(2))
    mspt.push(it.mspt.toFixed(2))
    chunkLoads.push(it.chunkLoads)
    chunkUnloads.push(it.chunkUnloads)
    cpu.push((it.cpu * 100).toFixed(2))
    temperature.push(it.temperature.toFixed(2))
    memory.push(it.memory / GB)
    threads.push(it.threads)
    reads.push(it.reads / MB)
    writes.push(it.writes / MB)
    sent.push(it.sent / MB)
    recv.push(it.recv / MB)
    it.worlds?.forEach((w, i) => {
      (entities[i] || (entities[i] = [])).push(w.entities)
      ;(tiles[i] || (tiles[i] = [])).push(w.tiles)
      ;(chunks[i] || (chunks[i] = [])).push(w.chunks)
    })
  })
  const worlds = status[status.length - 1]?.worlds?.map(it => it.name) || []
  const totalMemory = status[status.length - 1]?.totalMemory

  const createCard = (
    title: string,
    data: any[][],
    formatter?: any,
    areaStyle?: any,
    max?: any,
    legend?: string[]
  ) => <Grid item sm={6} xs={12} lg={4}>
    <Card>
      <CardHeader title={title} />
      <Divider />
      <ReactECharts style={{ height: 200 }} theme={theme.palette.mode === 'dark' ? 'dark' : undefined} option={{
        backgroundColor: 'rgba(0, 0, 0, 0)',
        legend: legend ? { data: legend } : undefined,
        grid: {
          top: '8%',
          bottom: '14%',
          right: '5%'
        },
        xAxis: {
          data: xAxis,
          boundaryGap: false,
          type: 'category'
        },
        tooltip: {
          formatter,
          trigger: 'axis'
        },
        yAxis: { max, type: 'value' },
        series: data.map((data, i) => ({
          name: legend?.[i] || title,
          data,
          areaStyle,
          type: 'line',
          smooth: true
        }))
      }} />
    </Card>
  </Grid>
  return <Container maxWidth={false} sx={{ py: 3 }}>
    <CircularLoading loading={!status.length} />
    <Grid container spacing={3}>
      {createCard('TPS', [tps])}
      {createCard(lang.dashboard.mspt, [mspt], '{c} ms')}
      {createCard(lang.worlds.entities, entities, undefined, undefined, undefined, worlds)}
      {createCard(lang.worlds.tiles, tiles, undefined, undefined, undefined, worlds)}
      {createCard(lang.worlds.chunks, chunks, undefined, undefined, undefined, worlds)}
      {createCard(lang.profiler.loadAndUnloadChunks, [chunkLoads, chunkUnloads], undefined,
        undefined, undefined, [lang.profiler.chunkLoads, lang.profiler.chunkUnoads])}
      {globalData.isPaper && <>
        {createCard(lang.profiler.threads, [threads])}
        {createCard(lang.profiler.cpu, [cpu], '{c} %', { }, 100)}
        {createCard(lang.dashboard.memory, [memory], ([{ value }]: [{ value: number }]) => prettyBytes(value * GB),
          { }, totalMemory ? Math.round(totalMemory / GB) : undefined)}
        {createCard(lang.profiler.readsAndWrites, [reads, writes], bytesMap, undefined, undefined, [lang.profiler.reads, lang.profiler.writes])}
        {createCard(lang.profiler.network, [recv, sent], bytesMap, undefined, undefined, [lang.profiler.recv, lang.profiler.sent])}
        {createCard(lang.profiler.temperature, [temperature], '{c} ℃', { })}
        <Grid item sm={6} xs={12} lg={4}>
          <Card>
            <CardHeader title={lang.profiler.cores} />
            <Divider />
            <CardContent>
              <Grid container spacing={1} justifyContent='center'>
                {status[status.length - 1]?.processorLoad?.map((v, i) => <Grid item key={i}><Paper sx={{
                  width: 52,
                  height: 52,
                  lineHeight: '52px',
                  textAlign: 'center',
                  color: theme.palette.primary.contrastText,
                  display: 'inline-block',
                  position: 'relative',
                  overflow: 'hidden',
                  textShadow: theme.palette.mode === 'light'
                    ? '#000 1px 0 0, #000 0 1px 0, #000 -1px 0 0, #000 0 -1px 0'
                    : '#fff 1px 0 0, #fff 0 1px 0, #fff -1px 0 0, #fff 0 -1px 0',
                  '& span': { position: 'relative', zIndex: 2 },
                  '&:after': {
                    content: '" "',
                    position: 'absolute',
                    transition: '.6s',
                    backgroundColor: theme.palette.primary.main,
                    height: (v * 100) + '%',
                    width: '100%',
                    bottom: 0,
                    left: 0,
                    right: 0
                  }
                }}><span>{(v * 100).toFixed(0)}%</span></Paper></Grid>)}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </>}
    </Grid>
  </Container>
})

const ENTITY_TYPE = /- (.+?) -/

const Timings: React.FC = React.memo(() => {
  const plugin = usePlugin()
  const theme = useTheme()
  const [status, setStatus] = useState(false)
  const [data, setData] = useState<TimingsData | null>(null)
  useEffect(() => {
    const off = plugin.emit('profiler:timingsStatus', setStatus).on('profiler:timings', setData)
    return () => { off() }
  }, [])

  const [tree, entitiesTick, tilesTick] = useMemo(() => {
    if (!data) return []
    const entitiesTickMap: Record<string, { value: number, name: string, count: number }> = {}
    const tilesTickMap: Record<string, { value: number, name: string, count: number }> = {}
    const map: Record<number, [number, number, number, [number, number, number][] | undefined] | undefined> = { }
    data.data.forEach(it => (map[it[0]] = it))
    const createNode = (id: number, percent: number) => {
      const cur = map[id]
      if (!cur) return
      map[id] = undefined
      const [, count, time] = cur
      const handler = data.handlers[id] || [0, lang.unknown]
      const handlerName = data.groups[handler[0]] || lang.unknown
      const name = handler[1]
      const children = cur[cur.length - 1]

      if (name.startsWith('tickEntity') && name.endsWith('ick')) {
        const res = ENTITY_TYPE.exec(name)
        if (res) {
          const node = entitiesTickMap[res[1]]
          if (node) {
            node.count += count
            node.value += time
          } else entitiesTickMap[res[1]] = { count, value: time, name: minecraft['entity.minecraft.' + res[1]] || res[1] }
        }
      }

      if (name.startsWith('tickTileEntity - ')) {
        const arr = name.split('.')
        const came = arr[arr.length - 1].replace(/^TileEntity(Mob)?/, '')
        const tile = decamelize(came)
        const node = tilesTickMap[tile]
        if (node) {
          node.count += count
          node.value += time
        } else tilesTickMap[tile] = { count, value: time, name: minecraft['block.minecraft.' + tile] || came }
      }

      return <TreeItem
        key={id}
        nodeId={id.toString()}
        label={<Box sx={{
          '& .info, .count': { color: 'transparent' },
          '&:hover .count': { color: 'inherit' },
          '&:hover .info': {
            color: theme.palette.primary.contrastText,
            textShadow: theme.palette.mode === 'light'
              ? '#000 1px 0 0, #000 0 1px 0, #000 -1px 0 0, #000 0 -1px 0'
              : '#fff 1px 0 0, #fff 0 1px 0, #fff -1px 0 0, #fff 0 -1px 0'
          }
        }}>
          <Box sx={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center'
          }}>
            {handlerName !== 'Minecraft' && <><Typography color='primary' component='span'>{lang.plugin}:{handlerName}</Typography>::</>}
            {name}&nbsp;
            <Typography variant='caption' className='count'>({lang.profiler.timingsCount}: {count})</Typography>
          </Box>
          <Box className='info' sx={{
            position: 'absolute',
            height: 10,
            right: 0,
            top: '50%',
            marginTop: '-5px',
            minWidth: 40,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Typography variant='caption' sx={{ position: 'absolute' }}>({Math.round(100 * percent)}%)</Typography>
            <div style={{ width: 100 * percent + 'px', backgroundColor: theme.palette.primary.main, height: 10, marginLeft: 'auto' }} />
          </Box>
        </Box>}
      >{Array.isArray(children) && children.sort((a, b) => b[2] - a[2]).map(it => createNode(it[0], percent * (it[2] / time)))}</TreeItem>
    }
    // eslint-disable-next-line react/jsx-key
    return [<TreeView defaultCollapseIcon={<ExpandMore />} defaultExpandIcon={<ChevronRight />} defaultExpanded={['1']}>
      {createNode(1, 1)}
    </TreeView>, Object.values(entitiesTickMap), Object.values(tilesTickMap)]
  }, [data])

  const createPie = (title: string, data: any) => <Grid item sm={6} xs={12}>
    <Card>
      <CardHeader title={title} />
      <Divider />
      <ReactECharts style={{ height: 300 }} theme={theme.palette.mode === 'dark' ? 'dark' : undefined} option={{
        backgroundColor: 'rgba(0, 0, 0, 0)',
        itemStyle: {
          borderRadius: 5,
          borderColor: 'rgba(0, 0, 0, 0)',
          borderWidth: 4
        },
        tooltip: {
          trigger: 'item',
          formatter: ({ data }: { data: { count: number } }) => lang.profiler.count + ': ' + data.count
        },
        series: [{
          type: 'pie',
          radius: '50%',
          data,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }]
      }} />
    </Card>
  </Grid>

  return <Container maxWidth={false} sx={{ py: 3 }}>
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader title='Timings' sx={{ position: 'relative' }} action={<FormControlLabel
            control={<Switch checked={status} onChange={e => plugin.emit('profiler:timingsStatus', setStatus, e.target.checked)} />}
            label={minecraft['addServer.resourcePack.enabled']}
            sx={cardActionStyles}
          />} />
          <Divider />
          {status
            ? <Box sx={{ position: 'relative', minHeight: data ? undefined : 300 }}>
              <CircularLoading loading={!data} />
              {tree}
            </Box>
            : <Empty title={lang.profiler.timingsNotStarted} />}
        </Card>
      </Grid>
      {data && createPie(lang.profiler.entitiesTick, entitiesTick)}
      {data && createPie(lang.profiler.tilesTick, tilesTick)}
    </Grid>
  </Container>
})

const heapColumns: GridColDef[] = [
  { field: 'id', headerName: lang.profiler.className, minWidth: 200, flex: 1 },
  { field: 'count', headerName: lang.profiler.count, width: 100 },
  { field: 'size', headerName: lang.size, width: 100, valueFormatter: ({ row: { display } }) => display }
]

const Heap: React.FC = React.memo(() => {
  const plugin = usePlugin()
  const [sortModel, setSortModel] = React.useState<GridSortItem[]>([{ field: 'size', sort: 'desc' }])
  const [heap, setHeap] = useState<GridRowData[]>([])
  useEffect(() => {
    plugin.emit('profiler:heap', (heap: any) => {
      const arr: GridRowData[] = []
      for (const id in heap) arr.push({ id: getClassName(id), count: heap[id][0], size: heap[id][1], display: prettyBytes(heap[id][1]) })
      setHeap(arr)
    })
  }, [])
  return <Container maxWidth={false} sx={{ py: 3, '& .MuiDataGrid-root': { border: 'none' } }}>
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader title={lang.profiler.heap} />
          <Divider />
          <div style={{ height: '70vh', position: 'relative' }}>
            <CircularLoading loading={!heap.length} />
            <DataGrid
              disableColumnMenu
              disableSelectionOnClick
              rows={heap}
              columns={heapColumns}
              sortingOrder={['desc', 'asc']}
              sortModel={sortModel}
              onSortModelChange={setSortModel}
            />
          </div>
        </Card>
      </Grid>
    </Grid>
  </Container>
})

const Threads: React.FC = React.memo(() => {
  const plugin = usePlugin()
  const [id, setId] = useState(-1)
  const [threads, setThreads] = useState<GridRowData[]>([])
  useEffect(() => {
    plugin.emit('profiler:threads', (threads: any, id: number) => {
      setThreads(threads)
      setId(id)
    })
  }, [])

  const threadsColumns: GridColDef[] = [
    { field: 'id', headerName: 'PID', minWidth: 80 },
    {
      field: 'name',
      headerName: lang.profiler.threadName,
      minWidth: 200,
      flex: 1,
      renderCell: ({ value, row: { id: cid } }) => cid === id ? <Typography color='primary'>{lang.profiler.serverThread}</Typography> : value
    },
    {
      field: 'state',
      headerName: lang.profiler.state,
      width: 150,
      renderCell: ({ value, row: { lock } }) => {
        const text = (lang.profiler.threadState as any)[value as string]
        return lock ? <Link onClick={() => dialog({ content: lock, title: lang.profiler.lock, cancelButton: false })} underline='hover'>{text}</Link> : text
      }
    },
    {
      field: 'stack',
      headerName: lang.profiler.stack,
      width: 100,
      renderCell: ({ value: content }) => content && <IconButton
        size='small'
        onClick={() => dialog({ content, cancelButton: false, title: lang.profiler.stack })}
      ><ViewList /></IconButton>
    }
  ]

  return <Container maxWidth={false} sx={{ py: 3, '& .MuiDataGrid-root': { border: 'none' } }}>
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader title={lang.profiler.threads} />
          <Divider />
          <div style={{ height: '70vh', position: 'relative' }}>
            <CircularLoading loading={!threads.length} />
            <DataGrid
              disableColumnMenu
              disableSelectionOnClick
              rows={threads}
              columns={threadsColumns}
            />
          </div>
        </Card>
      </Grid>
    </Grid>
  </Container>
})

const Profiler: React.FC = () => {
  const plugin = usePlugin()
  const globalData = useGlobalData()
  const [tab, setTab] = useState(0)
  const [status, setStatus] = useState(!!globalData.profilerStarted)
  useEffect(() => {
    const off = plugin.on('profiler:status', setStatus)
    return () => { off() }
  }, [])
  let Elm: React.FC | null = null
  if (status) {
    switch (tab) {
      case 0: Elm = Summary; break
      case 1: Elm = Timings; break
      case 4: Elm = Heap; break
      case 5: Elm = Threads; break
    }
  }
  return <Box sx={{ minHeight: status ? '100%' : undefined }}>
    {status
      ? <>
        <Toolbar />
        <Paper square variant='outlined' sx={{ margin: '0 -1px', position: 'fixed', width: 'calc(100% + 1px)', zIndex: 3 }}>
          <Tabs value={tab} onChange={(_, it) => setTab(it)} variant='scrollable' scrollButtons='auto'>
            <Tab label={lang.profiler.summary} />
            <Tab label='Timings' disabled={!globalData.isPaper} />
            <Tab label={lang.profiler.entities} />
            <Tab label={lang.profiler.chunks} />
            <Tab label={lang.profiler.heap} />
            <Tab label={lang.profiler.threads} />
            <Tab label={lang.profiler.suggestions} />
          </Tabs>
        </Paper>
        {status && <Tabs />}
        {Elm && <Elm />}
      </>
      : <Box sx={{ textAlign: 'center', marginTop: '50vh' }}>{lang.profiler.notStarted}</Box>}
    <Fab color='primary' sx={{ position: 'fixed', bottom: { xs: 16, sm: 40 }, right: { xs: 16, sm: 40 }, zIndex: 3 }} onClick={() => {
      plugin.emit('profiler:status', !status)
    }}>
      {status ? <Stop /> : <PlayArrow />}
    </Fab>
  </Box>
}

export default Profiler
