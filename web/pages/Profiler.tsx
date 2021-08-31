import React, { useState, useEffect, useMemo } from 'react'
import lang, { minecraft } from '../../languages'
import ReactECharts from 'echarts-for-react'
import prettyBytes from 'pretty-bytes'
import Empty from '../components/Empty'
import decamelize from 'decamelize'
import { useTheme } from '@material-ui/core/styles'
import { getClassName, getCurrentTime, formatMS } from '../utils'
import { useGlobalData, usePlugin } from '../Context'
import { CircularLoading } from '../components/Loading'
import { DataGrid, GridColDef, GridRowData, GridRowId, GridSortItem } from '@mui/x-data-grid'
import { PlayArrow, Stop, Equalizer, ExpandMore, ChevronRight, ViewList, Refresh } from '@material-ui/icons'
import { TreeView, TreeItem } from '@material-ui/lab'
import { Box, Tabs, Tab, Toolbar, Paper, Fab, Badge, Container, Grid, Card, CardHeader,
  IconButton, Divider, CardContent, Switch, FormControlLabel, Typography, Link, Zoom,
  List, ListItem, ListItemText, Checkbox } from '@material-ui/core'
import { cardActionStyles } from '../theme'
import dialog from '../dialog'

const MB = 1024 * 1024
const GB = MB * 1024
const NS = 1000 * 1000 * 30

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
  gc: Record<string, [number, number]>
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
  const [status, setStatus] = useState<Status[]>([])
  useEffect(() => {
    const off = plugin.on('profiler:current', (it: any) => setStatus(old => {
      if (old.length > 25) old.shift()
      it.time = getCurrentTime()
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
  const gcTime: any[][] = []
  const gcCount: any[][] = []
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
    let i = 0
    for (const key in it.gc) {
      const [time, count] = it.gc[key]
      ;(gcTime[i] || (gcTime[i] = [])).push(time)
      ;(gcCount[i] || (gcCount[i] = [])).push(count)
      i++
    }
    it.worlds?.forEach((w, i) => {
      (entities[i] || (entities[i] = [])).push(w.entities)
      ;(tiles[i] || (tiles[i] = [])).push(w.tiles)
      ;(chunks[i] || (chunks[i] = [])).push(w.chunks)
    })
  })
  const gcNames = Object.keys(status[status.length - 1]?.gc || { })
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

  const processorLoad = status[status.length - 1]?.processorLoad

  return <Container maxWidth={false} sx={{ py: 3, position: 'relative' }}>
    <CircularLoading loading={!status.length} />
    <Grid container spacing={3}>
      {createCard('TPS', [tps])}
      {mspt[0] !== '-1.00' && createCard(lang.dashboard.mspt, [mspt], '{c} ' + lang.ms)}
      {createCard(lang.worlds.entities, entities, undefined, undefined, undefined, worlds)}
      {createCard(lang.worlds.tiles, tiles, undefined, undefined, undefined, worlds)}
      {createCard(lang.worlds.chunks, chunks, undefined, undefined, undefined, worlds)}
      {createCard(lang.profiler.loadAndUnloadChunks, [chunkLoads, chunkUnloads], undefined,
        undefined, undefined, [lang.profiler.chunkLoads, lang.profiler.chunkUnoads])}
      {createCard(lang.profiler.gcTime, gcTime, (arr: { value: number, seriesName: string }[]) =>
        arr.map(({ value, seriesName }) => `${seriesName}: ${formatMS(value)}`).join('<br>'), undefined, undefined, gcNames)}
      {createCard(lang.profiler.gcCount, gcCount, undefined, undefined, undefined, gcNames)}
      {createCard(lang.profiler.threads, [threads])}
      {cpu[0] !== '-100.00' && createCard(lang.profiler.cpu, [cpu], '{c} %', { }, 100)}
      {createCard(lang.dashboard.memory, [memory], ([{ value }]: [{ value: number }]) => prettyBytes(value * GB),
        { }, totalMemory ? Math.round(totalMemory / GB) : undefined)}
      {createCard(lang.profiler.readsAndWrites, [reads, writes], bytesMap, undefined, undefined, [lang.profiler.reads, lang.profiler.writes])}
      {createCard(lang.profiler.network, [recv, sent], bytesMap, undefined, undefined, [lang.profiler.recv, lang.profiler.sent])}
      {temperature[0] !== '0.00' && createCard(lang.profiler.temperature, [temperature], '{c} ℃', { })}
      {processorLoad?.length > 0 && <Grid item sm={6} xs={12} lg={4}>
        <Card>
          <CardHeader title={lang.profiler.cores} />
          <Divider />
          <CardContent>
            <Grid container spacing={1} justifyContent='center'>
              {processorLoad.map((v, i) => <Grid item key={i}><Paper sx={{
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
      </Grid>}
    </Grid>
  </Container>
})

const ENTITY_TYPE = /- (.+?) -/

const countFormatter = ({ data }: { data: { count: number } }) => lang.profiler.count + ': ' + data.count

const Pie: React.FC<{ title: string, data: any[], formatter?: any }> = React.memo(({ title, data, formatter }) => <Grid item sm={6} xs={12}>
  <Card>
    <CardHeader title={title} />
    <Divider />
    <ReactECharts style={{ height: 300 }} theme={useTheme().palette.mode === 'dark' ? 'dark' : undefined} option={{
      backgroundColor: 'rgba(0, 0, 0, 0)',
      itemStyle: {
        borderRadius: 5,
        borderColor: 'rgba(0, 0, 0, 0)',
        borderWidth: 4
      },
      tooltip: {
        trigger: 'item',
        formatter
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
</Grid>)

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
            <div style={{ width: 100 * percent + 'px' }} className='bar' />
          </Box>
        </Box>}
      >{Array.isArray(children) && children.sort((a, b) => b[2] - a[2]).map(it => createNode(it[0], percent * (it[2] / time)))}</TreeItem>
    }
    // eslint-disable-next-line react/jsx-key
    return [<TreeView defaultCollapseIcon={<ExpandMore />} defaultExpandIcon={<ChevronRight />} defaultExpanded={['1']}>
      {createNode(1, 1)}
    </TreeView>, Object.values(entitiesTickMap), Object.values(tilesTickMap)]
  }, [data])

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
            ? <Box sx={{
              position: 'relative',
              minHeight: data ? undefined : 300,
              '& .bar': { backgroundColor: theme.palette.primary.main, height: 10, marginLeft: 'auto', borderRadius: 2 }
            }}>
              <CircularLoading loading={!data} />
              {tree}
            </Box>
            : <CardContent><Empty title={lang.profiler.timingsNotStarted} /></CardContent>}
        </Card>
      </Grid>
      {data && <Pie title={lang.profiler.entitiesTick} data={entitiesTick!} formatter={countFormatter} />}
      {data && <Pie title={lang.profiler.tilesTick} data={tilesTick!} formatter={countFormatter} />}
    </Grid>
  </Container>
})

const nanoSecondFormatter = ({ name, value }: { name: string, value: number }) => name + ': ' + formatMS(value / 1000)

const getLabel = (key: string, time: number, count: number) => {
  const ofTick = time / NS
  return <><Typography color='primary' component='span'>{key}</Typography>:&nbsp;
    {lang.profiler.lagTime} <span className='bold'>{formatMS(time / 1000)}</span>, {lang.profiler.timingsCount}:&nbsp;
    <span className='bold'>{count}</span>, &nbsp;{lang.profiler.avgTime}: <span className='bold'>{formatMS(time / 1000 / count)}</span>,
    &nbsp;<Typography sx={{ fontWeight: 'bold', color: ofTick >= 100 ? 'error.main' : ofTick >= 50 ? 'warning.main' : undefined }} component='span'>
      {ofTick.toFixed(2)}%</Typography> {lang.profiler.ofTick}</>
}

const Plugins: React.FC = React.memo(() => {
  const plugin = usePlugin()
  const [data, setData] = useState<[JSX.Element[], any[][]] | undefined>()
  useEffect(() => {
    const off = plugin.emit('profiler:fetchPlugins').on('profiler:plugins', (data: Record<string, [Record<string | number, [number, number]>]>) => {
      const pluginsTimes: any[][] = [[], []]
      const tree: [number, JSX.Element][] = []
      for (const name in data) {
        let totalTypesTime = 0
        let totalTypesCount = 0
        const subTrees: JSX.Element[] = []
        ;['events', 'tasks'].forEach((type, i) => {
          const curKey = name + '/' + type
          const subTree: [number, JSX.Element][] = []
          const cur = data[name][i]
          let totalTime = 0
          let totalCount = 0
          for (const key in cur) {
            const [count, time] = cur[key]
            totalCount += count
            totalTypesCount += count
            totalTime += time
            totalTypesTime += time
            // eslint-disable-next-line react/jsx-key
            subTree.push([time, <TreeItem nodeId={`${curKey}/${key}`} label={getLabel(key, time, count)} />])
          }
          if (totalTime) pluginsTimes[i].push({ name, value: totalTime })
          if (subTree.length) {
            subTrees.push(<TreeItem nodeId={curKey} key={curKey} label={getLabel((lang.profiler as any)[type], totalTime, totalCount)}>
              {subTree.sort((a, b) => b[0] - a[0]).map(it => it[1])}
            </TreeItem>)
          }
        })
        if (totalTypesTime) {
          tree.push([totalTypesTime, <TreeItem
            nodeId={name}
            label={getLabel(name, totalTypesTime, totalTypesCount)}
            key={name}
          >{subTrees}</TreeItem>])
        }
      }
      setData([
        tree.sort((a, b) => b[0] - a[0]).map(it => it[1]),
        pluginsTimes.map(it => it.sort((a, b) => b.value - a.value))
      ])
    })
    return () => { off() }
  }, [])
  return <Container maxWidth={false} sx={{ py: 3, position: 'relative', height: data ? undefined : '80vh' }}>
    <CircularLoading loading={!data} background={false} />
    {data && <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader title={lang.profiler.pluginsTitle} sx={{ position: 'relative' }} />
          <Divider />
          {data[0].length
            ? <TreeView defaultCollapseIcon={<ExpandMore />} defaultExpandIcon={<ChevronRight />}>{data[0]}</TreeView>
            : <CardContent><Empty /></CardContent>}
        </Card>
      </Grid>
      <Pie title={lang.profiler.pluginsEventTime} data={data[1][0]} formatter={nanoSecondFormatter} />
      <Pie title={lang.profiler.pluginsEventTime} data={data[1][1]} formatter={nanoSecondFormatter} />
    </Grid>}
  </Container>
})

const entitiesColumns: GridColDef[] = [
  { field: 'world', headerName: lang.worlds.name, minWidth: 200 },
  { field: 'x', headerName: 'X', width: 100 },
  { field: 'z', headerName: 'Z', width: 100 },
  { field: 'count', headerName: lang.profiler.count, width: 100 }
]

interface EntityData {
  id: number
  world: string
  x: number
  z: number
  data: Record<string, number>
}

const Entities: React.FC = React.memo(() => {
  const plugin = usePlugin()
  const [selectedEntityChunk, setSelectedEntityChunk] = React.useState<GridRowId | undefined>()
  const [selectedTileChunk, setSelectedTileChunk] = React.useState<GridRowId | undefined>()
  const [data, setData] = useState<[any[], any[], EntityData[], EntityData[]] | undefined>()
  useEffect(() => {
    plugin.emit('profiler:entities', (data: [Record<string, number>, Record<string, number>, EntityData[], EntityData[]]) => {
      data[2].forEach((it, i) => (it.id = i))
      data[3].forEach((it, i) => (it.id = i))
      setData([
        Object.entries(data[0]).map(([id, value]) => ({ value, name: minecraft['entity.minecraft.' + id.toLowerCase()] || id }))
          .sort((a, b) => b.value - a.value),
        Object.entries(data[1]).map(([id, value]) => ({ value, name: minecraft['block.minecraft.' + id.toLowerCase()] || id }))
          .sort((a, b) => b.value - a.value),
        data[2], data[3]
      ])
    })
  }, [])

  const selectedEntityChunkData = useMemo(() => {
    const id = selectedEntityChunk as (number | undefined)
    if (id == null || !data) return null
    return Object.entries(data[2][id].data).map(([id, value]) => ({ value, name: minecraft['entity.minecraft.' + id.toLowerCase()] || id }))
      .sort((a, b) => b.value - a.value)
  }, [selectedEntityChunk, data])

  const selectedTileChunkData = useMemo(() => {
    const id = selectedTileChunk as (number | undefined)
    if (id == null || !data) return null
    return Object.entries(data[3][id].data).map(([id, value]) => ({ value, name: minecraft['block.minecraft.' + id.toLowerCase()] || id }))
      .sort((a, b) => b.value - a.value)
  }, [selectedTileChunk, data])

  const createGrid = (data: any, title: any, selection: GridRowId | undefined, onChange: (it: GridRowId | undefined) => void) =>
    <Grid item sm={6} xs={12}>
      <Card>
        <CardHeader title={title} />
        <Divider />
        <div style={{ height: '70vh', position: 'relative' }}>
          <DataGrid
            checkboxSelection
            disableColumnMenu
            disableSelectionOnClick
            disableDensitySelector
            rows={data}
            columns={entitiesColumns}
            onSelectionModelChange={it => onChange(it.find(a => a !== selection))}
            selectionModel={selection == null ? [] : [selection]}
          />
        </div>
      </Card>
    </Grid>

  return <Container
    maxWidth={false}
    sx={{ py: 3, '& .MuiDataGrid-root': { border: 'none' }, position: 'relative', height: data ? undefined : '80vh' }}
  >
    <CircularLoading loading={!data} background={false} />
    {data && <Grid container spacing={3}>
      {createGrid(data[2], lang.profiler.crowdEntities, selectedEntityChunk, setSelectedEntityChunk)}
      {createGrid(data[3], lang.profiler.crowdTiles, selectedTileChunk, setSelectedTileChunk)}
      {selectedEntityChunkData && <Pie title={lang.worlds.entities} data={selectedEntityChunkData} />}
      {selectedTileChunkData && <Pie title={lang.worlds.tiles} data={selectedTileChunkData} />}
      <Pie title={lang.profiler.globalEntities} data={data[0]} />
      <Pie title={lang.profiler.globalTiles} data={data[1]} />
    </Grid>}
  </Container>
})

interface GCInfo {
  name: string
  action: string
  cause: string
  id: number
  start: string
  duration: number
  before: Record<string, number>
  after: Record<string, number>
}

const GarbageCollection: React.FC = React.memo(() => {
  const plugin = usePlugin()
  const theme = useTheme()
  const [data, setData] = useState<GCInfo[]>([])
  const [id, setId] = useState(0)
  useEffect(() => {
    const off = plugin.on('profiler:gc', (it: GCInfo) => {
      setData(old => {
        let len = old.length
        if (len > 15) old.shift()
        else len++
        it.start = getCurrentTime()
        return [it, ...old]
      })
    })
    return () => { off() }
  }, [])

  return <Container maxWidth={false} sx={{ py: 3 }}>
    <Grid container spacing={3}>
      <Grid item xs={12} lg={4}>
        <Card>
          <CardHeader title={lang.profiler.carbageCollection} />
          <Divider />
          {data.length
            ? <List dense>
              {data.map((it, i) => <ListItem key={it.id} secondaryAction={<Checkbox
                edge='start'
                checked={i === id}
                tabIndex={-1}
                onClick={() => setId(i)}
              />}>
                <ListItemText
                  primary={<>[{it.start}] <span className='bold'>{it.name}</span></>}
                  secondary={<>
                    <Typography component='span' variant='body2' color='text.primary'>{lang.profiler.costTime}: </Typography>{formatMS(it.duration)}
                    <br /><Typography component='span' variant='body2' color='text.primary'>{lang.cause}: </Typography>{it.cause}<br />
                    <Typography component='span' variant='body2' color='text.primary'>{lang.profiler.action}: </Typography>{it.action}
                  </>}
                />
              </ListItem>)}
            </List>
            : <CardContent><Empty /></CardContent>}
        </Card>
      </Grid>
      {data[id] && <Grid item xs={12} lg={8}>
        <Card>
          <CardHeader title={lang.profiler.memoryUsage} sx={{ position: 'relative' }} />
          <Divider />
          <ReactECharts style={{ height: '80vh' }} theme={theme.palette.mode === 'dark' ? 'dark' : undefined} option={{
            backgroundColor: 'rgba(0, 0, 0, 0)',
            legend: { data: lang.profiler.memoryUsageTypes },
            itemStyle: {
              borderRadius: 5,
              borderColor: 'rgba(0, 0, 0, 0)',
              borderWidth: 4
            },
            tooltip: {
              trigger: 'axis',
              formatter: bytesMap
            },
            xAxis: {
              type: 'value',
              boundaryGap: [0, 0.01]
            },
            yAxis: {
              type: 'category',
              data: Object.keys(data[id].after)
            },
            grid: {
              left: '3%',
              right: '4%',
              bottom: '3%',
              containLabel: true
            },
            series: [
              {
                name: lang.profiler.memoryUsageTypes[0],
                type: 'bar',
                data: Object.values(data[id].after).map(origin => ({ origin, value: (origin / MB).toFixed(2) }))
              },
              {
                name: lang.profiler.memoryUsageTypes[1],
                type: 'bar',
                data: Object.values(data[id].before).map(origin => ({ origin, value: (origin / MB).toFixed(2) }))
              }
            ]
          }} />
        </Card>
      </Grid>}
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
        const text = (lang.profiler.threadState as any)[value as string] || value
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

const components = [Summary, Timings, Plugins, GarbageCollection, Entities, Heap, Threads]

const Profiler: React.FC = () => {
  const plugin = usePlugin()
  const theme = useTheme()
  const globalData = useGlobalData()
  const [tab, setTab] = useState(0)
  const [key, setTKey] = useState(0)
  const [status, setStatus] = useState(!!globalData.profilerStarted)
  useEffect(() => {
    const off = plugin.on('profiler:status', setStatus)
    return () => { off() }
  }, [])

  const transitionDuration = {
    enter: theme.transitions.duration.enteringScreen,
    exit: theme.transitions.duration.leavingScreen
  }
  const Elm = components[tab]

  const createFab = (onClick: any, children: any, show: boolean) => <Zoom
    in={show}
    timeout={transitionDuration}
    style={{ transitionDelay: (show ? transitionDuration.exit : 0) + 'ms' }}
    unmountOnExit
  >
    <Fab
      color='primary'
      sx={{ position: 'fixed', bottom: { xs: 16, sm: 40 }, right: { xs: 16, sm: 40 }, zIndex: 3 }}
      onClick={onClick}
    >{children}</Fab>
  </Zoom>

  return <Box sx={{ minHeight: status || !tab ? '100%' : undefined }}>
    <Toolbar />
    <Paper square variant='outlined' sx={{ margin: '0 -1px', position: 'fixed', width: 'calc(100% + 1px)', zIndex: 3 }}>
      <Tabs value={tab} onChange={(_, it) => setTab(it)} variant='scrollable' scrollButtons='auto'>
        <Tab label={lang.profiler.summary} />
        <Tab label='Timings' disabled={!globalData.isPaper} />
        <Tab label={lang.profiler.plugins} />
        <Tab label={lang.profiler.carbageCollection} />
        <Tab label={lang.profiler.entities} />
        <Tab label={lang.profiler.heap} />
        <Tab label={lang.profiler.threads} />
      </Tabs>
    </Paper>
    <Tabs />
    {tab < 4 && !status ? <Box sx={{ textAlign: 'center', marginTop: '40vh' }}>{lang.profiler.notStarted}</Box> : Elm && <Elm key={key} />}
    {createFab(() => plugin.emit('profiler:status', !status), status ? <Stop /> : <PlayArrow />, tab < 4)}
    {createFab(() => setTKey(key + 1), <Refresh />, tab >= 4)}
  </Box>
}

export default Profiler
