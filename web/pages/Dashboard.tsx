import 'echarts/extension/bmap/bmap'

import React, { useEffect, useState, useMemo } from 'react'
import { red, green, orange, deepPurple, blue, yellow } from '@mui/material/colors'
import { ArrowDownward, Check, Handyman, People, SentimentVerySatisfied, SentimentDissatisfied, Refresh, ExpandMore,
  SentimentSatisfied, AccessTime, ArrowUpward, MoreHoriz, Remove, ExitToApp, Update } from '@mui/icons-material'
import { useHistory } from 'react-router-dom'
import { useTheme } from '@mui/material/styles'
import { usePlugin, useGlobalData } from '../Context'
import { CardContent, Container, Grid, Box, Card, Typography, Toolbar, CardHeader, Divider,
  Skeleton, Link, LinearProgress, List, ListItem, IconButton, ListItemText, ListItemAvatar,
  Pagination, Tooltip, Avatar, Accordion, AccordionSummary } from '@mui/material'
import { LoadingList } from '../components/Loading'
import { getSkin } from '../utils'
import { darkMapStyles as styleJson } from '../theme'
import toast, { action } from '../toast'
import prettyBytes from 'pretty-bytes'
import ReactECharts from 'echarts-for-react'
import Empty from '../components/Empty'
import Uptime from '../components/Uptime'
import dialog from '../dialog'
import lang from '../../languages'
import isEqual from 'lodash/isEqual'

interface Status { time: number, players: number, tps: number, entities: number, chunks: number }
interface Player { name: string, ip?: string, loc?: [number, number] }
interface CurrentStatus {
  players: Array<string | Player>
  mspt: number
  tps: number
  time: number
  memory: number
  totalMemory: number
  behinds: number
}

const TopCard: React.FC<{ title: string, content: React.ReactNode, icon: React.ReactNode, color: string }> = ({ title, content, icon, children, color }) =>
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Grid container spacing={3} sx={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <Grid item sx={{ overflow: 'hidden' }}>
          <Typography color='textSecondary' gutterBottom variant='h6'>{title}</Typography>
          <Typography color='textPrimary' variant='h4' noWrap sx={{ textOverflow: 'ellipsis' }}>{content}</Typography>
        </Grid>
        <Grid item sx={{ paddingLeft: '0 !important' }}>
          <Avatar sx={{ backgroundColor: color, height: 50, width: 50 }}>{icon}</Avatar>
        </Grid>
      </Grid>
      {children}
    </CardContent>
  </Card>

const Players: React.FC<{ players?: CurrentStatus['players'] }> = React.memo(({ players }) => {
  const his = useHistory()
  const plugin = usePlugin()
  const globalData = useGlobalData()
  const [page, setPage] = useState(1)
  const [id, update] = useState(0)
  return <Card>
    <CardHeader title={lang.dashboard.onlinePlayers} />
    <Divider />
    <CardContent>
      {players?.length === 0
        ? <Empty />
        : <>
        <List sx={{ paddingTop: 0 }}>
          {players
            ? players.slice((page - 1) * 8, page * 8).map(p => {
              const name = typeof p === 'string' ? p : p.name
              return <Tooltip key={name} title={'IP: ' + ((p as any).ip || lang.unknown)}>
                <ListItem
                  secondaryAction={<>
                    <IconButton
                      edge='end'
                      size='small'
                      onClick={() => dialog(lang.dashboard.confirmKick(<span className='bold'>{name}</span>), lang.reason)
                        .then(it => it != null && plugin.emit('dashboard:kick', (res: boolean) => {
                          action(res)
                          if (!players) return
                          players.splice(players.indexOf(it!), 1)
                          update(id + 1)
                        }, name, it || null))
                      }
                    ><ExitToApp /></IconButton>
                    <IconButton edge='end' onClick={() => his.push('/NekoMaid/playerList/' + name)} size='small'><MoreHoriz /></IconButton>
                  </>
                  }
                >
                  <ListItemAvatar>
                    <Avatar
                      src={getSkin(globalData, name, true)}
                      imgProps={{ crossOrigin: 'anonymous', onClick () { his.push('/NekoMaid/playerList/' + name) }, style: { width: 40, height: 40 } }}
                      sx={{ cursor: 'pointer' }}
                      variant='rounded'
                    />
                  </ListItemAvatar>
                  <ListItemText primary={name} />
                </ListItem>
              </Tooltip>
            })
            : <LoadingList />
          }
        </List>
        {players && <Pagination
          page={page}
          onChange={(_, it) => setPage(it)}
          count={Math.max(Math.ceil(players.length / 8), 1)}
          sx={{ display: 'flex', justifyContent: 'flex-end' }}
        />}
      </>}
    </CardContent>
  </Card>
})

const config = [[lang.worlds.players, 'bar', 0], ['TPS', 'line', 1], [lang.worlds.chunks, 'line', 2], [lang.worlds.entities, 'line', 2]]
const Charts: React.FC<{ data: Status[] }> = React.memo(props => {
  const theme = useTheme()
  const labels: string[] = []
  const data: any = config.map(it => ({ name: it[0], data: [] as number[], type: it[1], smooth: true, yAxisIndex: it[2] }))
  props.data.forEach(it => {
    const time = new Date(it.time)
    labels.push(`${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`)
    data[0].data.push(it.players)
    data[1].data.push(it.tps.toFixed(2))
    data[2].data.push(it.chunks)
    data[3].data.push(it.entities)
  })

  return <Card>
    <CardHeader title={lang.dashboard.title} />
    <Divider />
    <CardContent>
      <Box sx={{ position: 'relative' }}>
        <ReactECharts theme={theme.palette.mode === 'dark' ? 'dark' : undefined} option={{
          backgroundColor: 'rgba(0, 0, 0, 0)',
          tooltip: { trigger: 'axis' },
          legend: { data: config.map(it => it[0]) },
          xAxis: {
            type: 'category',
            data: labels
          },
          grid: {
            top: '11%',
            left: '3%',
            right: '0%',
            bottom: '0%',
            containLabel: true
          },
          yAxis: [
            {
              type: 'value',
              name: config[0][0],
              position: 'left',
              offset: 35,
              minInterval: 1
            },
            {
              type: 'value',
              name: 'TPS',
              position: 'left',
              min: 0,
              max: 20
            },
            {
              type: 'value',
              name: config[2][0] + '/' + config[3][0],
              position: 'right',
              minInterval: 1
            }
          ],
          series: data
        }} />
      </Box>
    </CardContent>
  </Card>
})

let mapAdded = false
let mapLoaded = false
const WorldMap: React.FC<{ players: Player[] }> = React.memo(({ players }) => {
  const theme = useTheme()
  const his = useHistory()
  const globalData = useGlobalData()
  const [, update] = useState(0)
  if (!mapAdded) {
    const node = document.createElement('script')
    node.type = 'text/javascript'
    node.src = 'http://api.map.baidu.com/getscript?v=3.0&ak=' + (globalData.bMapKey || '8G2uX6PFlYK3XCdcWYxH5sPVEA9K88QT')
    node.onload = () => {
      mapLoaded = true
      update(id => id + 1)
    }
    document.body.appendChild(node)
    mapAdded = true
  }

  return mapLoaded
    ? <ReactECharts
      style={{ height: 750, maxHeight: '100vh' }}
      onEvents={{
        click ({ data: { name } }: { data: { name: string } }) {
          if (players.some(it => it.name === name)) his.push('/NekoMaid/playerList/' + name)
        }
      }}
      option={{
        backgroundColor: 'rgba(0, 0, 0, 0)',
        tooltip: { trigger: 'item' },
        bmap: {
          center: [104.114129, 37.550339],
          zoom: 3,
          roam: true,
          mapStyle: theme.palette.mode === 'dark' ? { styleJson } : undefined
        },
        series: [{
          type: 'effectScatter',
          coordinateSystem: 'bmap',
          data: players.filter(it => it.loc).map(it => ({ name: it.name, value: [it.loc![0], it.loc![1]], ip: it.ip })),
          label: {
            formatter: '{b}',
            position: 'right',
            show: true
          },
          tooltip: {
            trigger: 'item',
            formatter: ({ data }: any) => 'IP: ' + data.ip
          },
          encode: { value: 2 },
          showEffectOn: 'emphasis',
          rippleEffect: { brushType: 'stroke' },
          symbolSize: 10,
          itemStyle: {
            color: theme.palette.primary.main,
            shadowBlur: 4
          },
          hoverAnimation: true
        }]
      }}
    />
    : <></>
})

const Dashboard: React.FC = () => {
  const plugin = usePlugin()
  const { version, hasGeoIP } = useGlobalData()
  const [status, setStatus] = useState<Status[]>([])
  const [current, setCurrent] = useState<CurrentStatus | undefined>()

  useEffect(() => {
    const offSetStatus = plugin.once('dashboard:info', setStatus)
    const offCurrent = plugin.on('dashboard:current', (data: CurrentStatus) => setCurrent(old => {
      if (old && isEqual(old.players, data.players)) data.players = old.players
      return data
    }))
    plugin.switchPage('dashboard')
    return () => {
      offSetStatus()
      offCurrent()
    }
  }, [])

  const playerCount = current?.players?.length || 0
  const prev = status[status.length - 1]?.players || 0
  const percent = (prev ? playerCount / prev - 1 : playerCount) * 100
  const tpsColor = !current || current.tps >= 18 ? green : current.tps >= 15 ? yellow : red
  return <Box sx={{ minHeight: '100%', py: 3 }}>
    <Toolbar />
    <Container maxWidth={false}>
      <Grid container spacing={3}>
        <Grid item lg={3} sm={6} xl={3} xs={12}>
          <TopCard
            title={lang.dashboard.version}
            content={current ? version : <Skeleton animation='wave' width={150} />}
            icon={<Handyman />}
            color={orange[600]}
          >
            <Box sx={{ pt: 2, display: 'flex', alignItems: 'flex-end' }}>
              {!current || current.behinds < 0
                ? <Refresh htmlColor={blue[900]} />
                : current?.behinds === 0
                  ? <Check htmlColor={green[900]} />
                  : <Update htmlColor={yellow[900]} />}
              <Typography color='textSecondary' variant='caption'>&nbsp;{!current || current.behinds === -3
                ? lang.dashboard.updateChecking
                : current.behinds < 0
                  ? <Link underline='hover' color='inherit' sx={{ cursor: 'pointer' }} onClick={() => {
                    toast(lang.dashboard.updateChecking)
                    plugin.emit('dashboard:checkUpdate')
                  }}>{lang.dashboard.updateFailed}</Link>
                  : current.behinds === 0 ? lang.dashboard.updated : lang.dashboard.behinds(current.behinds)}</Typography>
            </Box>
          </TopCard>
        </Grid>
        <Grid item lg={3} sm={6} xl={3} xs={12}>
          <TopCard
            title={lang.dashboard.onlinePlayers}
            content={current ? playerCount : <Skeleton animation='wave' width={150} />}
            icon={<People />}
            color={deepPurple[600]}
          >
            <Box sx={{ pt: 2, display: 'flex', alignItems: 'flex-end' }}>
              {percent === 0 ? <Remove color='primary' /> : percent < 0 ? <ArrowDownward color='error' /> : <ArrowUpward color='success' />}
              <Typography
                sx={{ color: (percent === 0 ? blue : percent < 0 ? red : green)[900], mr: 1 }}
                variant='body2'
              >{Math.abs(percent).toFixed(0)}%</Typography>
              <Typography color='textSecondary' variant='caption'>{lang.dashboard.lastHour}</Typography>
            </Box>
          </TopCard>
        </Grid>
        <Grid item lg={3} sm={6} xl={3} xs={12}>
          <TopCard
            title='TPS'
            content={current ? (current.tps === -1 ? '?' : current.tps.toFixed(2)) : <Skeleton animation='wave' width={150} />}
            icon={!current || current.tps >= 18 || current.tps === -1
              ? <SentimentVerySatisfied />
              : current.tps >= 15 ? <SentimentSatisfied /> : <SentimentDissatisfied />}
            color={tpsColor[600]}
          >
            <Box sx={{ pt: 2.1, display: 'flex', alignItems: 'flex-end' }}>
              <Typography
                sx={{ color: tpsColor[900], mr: 1 }}
                variant='body2'
              >{!current || current.mspt === -1 ? '?' : current.mspt.toFixed(2) + 'ms'}</Typography>
              <Typography color='textSecondary' variant='caption'>{lang.dashboard.mspt}</Typography>
            </Box>
          </TopCard>
        </Grid>
        <Grid item lg={3} sm={6} xl={3} xs={12}>
          <TopCard
            title={lang.dashboard.uptime}
            content={current ? <Uptime time={current.time} /> : <Skeleton animation='wave' width={150} />}
            icon={<AccessTime />}
            color={blue[600]}
          >
            <Box sx={{ pt: 2.7, display: 'flex', alignItems: 'center' }}>
              <Typography color='textSecondary' variant='caption' sx={{ marginRight: 1 }}>{lang.dashboard.memory}</Typography>
              <Tooltip title={current?.totalMemory ? prettyBytes(current.memory) + ' / ' + prettyBytes(current.totalMemory) : ''}>
                <LinearProgress
                  variant='determinate'
                  value={current?.totalMemory ? current.memory / current.totalMemory * 100 : 0}
                  sx={{ flex: '1' }}
                />
              </Tooltip>
            </Box>
          </TopCard>
        </Grid>
        <Grid item lg={8} md={12} xl={9} xs={12}>{useMemo(() => <Charts data={status} />, [status])}</Grid>
        <Grid item lg={4} md={12} xl={3} xs={12}><Players players={current?.players} /></Grid>
        {hasGeoIP && current?.players && typeof current.players[0] !== 'string' && <Grid item xs={12}>
          <Accordion TransitionProps={{ unmountOnExit: true }} disableGutters>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>{lang.dashboard.playersDistribution}</Typography>
            </AccordionSummary>
            <Divider />
            <WorldMap players={current.players as Player[]} />
          </Accordion>
        </Grid>}
      </Grid>
    </Container>
  </Box>
}

export default Dashboard
