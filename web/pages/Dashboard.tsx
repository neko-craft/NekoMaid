import React, { useEffect, useState, useMemo } from 'react'
import { red, green, orange, deepPurple, blue, yellow } from '@material-ui/core/colors'
import { ArrowDownward, Check, Handyman, People, SentimentVerySatisfied, SentimentDissatisfied, Refresh,
  SentimentSatisfied, AccessTime, ArrowUpward, MoreHoriz, Remove, ExitToApp, Update } from '@material-ui/icons'
import { useHistory } from 'react-router-dom'
import { useTheme } from '@material-ui/core/styles'
import { usePlugin, useGlobalData } from '../Context'
import { CardContent, Container, Grid, Box, Card, Typography, Toolbar, CardHeader, Divider,
  Skeleton, Link, LinearProgress, List, ListItem, IconButton, ListItemText, ListItemAvatar,
  Pagination, Tooltip, Avatar } from '@material-ui/core'
import { LoadingList } from '../components/Loading'
import toast, { action } from '../toast'
import prettyBytes from 'pretty-bytes'
import ReactECharts from 'echarts-for-react'
import Empty from '../components/Empty'
import Uptime from '../components/Uptime'
import dialog from '../dialog'

interface Status { time: number, players: number, tps: number, entities: number, chunks: number }
interface CurrentStatus { players: string[], mspt: number, tps: number, time: number, memory: number, totalMemory: number, behinds: number }

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

const Players: React.FC<{ players: string[] | undefined }> = ({ players }) => {
  const his = useHistory()
  const plugin = usePlugin()
  const [page, setPage] = useState(1)
  const [id, update] = useState(0)
  return <Card>
    <CardHeader title='在线玩家' />
    <Divider />
    <CardContent>
      {players?.length === 0
        ? <Empty />
        : <>
        <List sx={{ paddingTop: 0 }}>
          {players
            ? players.slice((page - 1) * 8, page * 8).map(name => <ListItem
              key={name}
              secondaryAction={<>
                <IconButton
                  edge='end'
                  size='small'
                  onClick={() => dialog(<>确认要将 <span className='bold'>{name}</span> 踢出游戏吗?</>, '理由')
                    .then(it => it != null && plugin.emit('dashboard:kick', (res: boolean) => {
                      action(res)
                      if (!players) return
                      players.splice(players.indexOf(it!), 1)
                      update(id + 1)
                    }, name, it || null))
                  }
                ><ExitToApp /></IconButton>
                <IconButton edge='end' onClick={() => his.push('/NekoMaid/playerList/' + name)} size='small'><MoreHoriz /></IconButton>
              </>}
            >
              <ListItemAvatar>
                <Avatar
                  src={`https://mc-heads.net/avatar/${name}/40`}
                  imgProps={{ crossOrigin: 'anonymous', onClick () { his.push('/NekoMaid/playerList/' + name) } }}
                  sx={{ cursor: 'pointer' }}
                  variant='rounded'
                />
              </ListItemAvatar>
              <ListItemText primary={name} />
            </ListItem>)
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
}

const config = [['玩家数', 'bar', 0], ['TPS', 'line', 1], ['区块数', 'line', 2], ['实体数', 'line', 2]]
const Charts: React.FC<{ data: Status[] }> = props => {
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
    <CardHeader title='概览' />
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
              name: '玩家数',
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
              name: '区块/实体',
              position: 'right',
              minInterval: 1
            }
          ],
          series: data
        }} />
      </Box>
    </CardContent>
  </Card>
}

const Dashboard: React.FC = () => {
  const plugin = usePlugin()
  const { version } = useGlobalData()
  const [status, setStatus] = useState<Status[]>([])
  const [current, setCurrent] = useState<CurrentStatus | undefined>()

  useEffect(() => {
    const offSetStatus = plugin.once('dashboard:info', setStatus)
    const offCurrent = plugin.on('dashboard:current', (data: CurrentStatus) => setCurrent(old => {
      if (old && (old.players.length === data.players.length && old.players.every((it, i) => it === data.players[i]))) data.players = old.players
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
          <TopCard title='服务端版本' content={current ? version : <Skeleton animation='wave' width={150} />} icon={<Handyman />} color={orange[600]}>
            <Box sx={{ pt: 2, display: 'flex', alignItems: 'flex-end' }}>
              {!current || current.behinds < 0
                ? <Refresh htmlColor={blue[900]} />
                : current?.behinds === 0
                  ? <Check htmlColor={green[900]} />
                  : <Update htmlColor={yellow[900]} />}
              <Typography color='textSecondary' variant='caption'>&nbsp;{!current || current.behinds === -3
                ? '检查更新中...'
                : current.behinds < 0
                  ? <Link underline='hover' color='inherit' sx={{ cursor: 'pointer' }} onClick={() => {
                    toast('获取中...')
                    plugin.emit('dashboard:checkUpdate')
                  }}>获取失败, 点击重新获取</Link>
                  : current.behinds === 0 ? '当前已为最新版' : `当前已落后 ${current.behinds} 个版本!`}</Typography>
            </Box>
          </TopCard>
        </Grid>
        <Grid item lg={3} sm={6} xl={3} xs={12}>
          <TopCard title='在线人数' content={current ? playerCount : <Skeleton animation='wave' width={150} />} icon={<People />} color={deepPurple[600]}>
            <Box sx={{ pt: 2, display: 'flex', alignItems: 'flex-end' }}>
              {percent === 0 ? <Remove color='primary' /> : percent < 0 ? <ArrowDownward color='error' /> : <ArrowUpward color='success' />}
              <Typography sx={{ color: (percent === 0 ? blue : percent < 0 ? red : green)[900], mr: 1 }} variant='body2'>{Math.abs(percent).toFixed(0)}%</Typography>
              <Typography color='textSecondary' variant='caption'>相比于上一小时</Typography>
            </Box>
          </TopCard>
        </Grid>
        <Grid item lg={3} sm={6} xl={3} xs={12}>
          <TopCard
            title='TPS'
            content={current ? (current.tps === -1 ? '?' : current.tps.toFixed(2)) : <Skeleton animation='wave' width={150} />}
            icon={!current || current.tps >= 18 || current.tps === -1 ? <SentimentVerySatisfied /> : current.tps >= 15 ? <SentimentSatisfied /> : <SentimentDissatisfied />}
            color={tpsColor[600]}
          >
            <Box sx={{ pt: 2.1, display: 'flex', alignItems: 'flex-end' }}>
              <Typography sx={{ color: tpsColor[900], mr: 1 }} variant='body2'>{!current || current.mspt === -1 ? '?' : current.mspt.toFixed(2) + 'ms'}</Typography>
              <Typography color='textSecondary' variant='caption'>每Tick耗时</Typography>
            </Box>
          </TopCard>
        </Grid>
        <Grid item lg={3} sm={6} xl={3} xs={12}>
          <TopCard title='运行时间' content={current ? <Uptime time={current.time} /> : <Skeleton animation='wave' width={150} />} icon={<AccessTime />} color={blue[600]}>
            <Box sx={{ pt: 2.7, display: 'flex', alignItems: 'center' }}>
              <Typography color='textSecondary' variant='caption' sx={{ marginRight: 1 }}>内存占用</Typography>
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
        <Grid item lg={4} md={6} xl={3} xs={12}><Players players={current?.players} /></Grid>
      </Grid>
    </Container>
  </Box>
}

export default Dashboard
