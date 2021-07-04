import React, { useEffect, useState, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { red, green, orange, deepPurple, blue, yellow } from '@material-ui/core/colors'
import { ArrowDownward, Check, Handyman, People, SentimentVerySatisfied, SentimentDissatisfied,
  SentimentSatisfied, AccessTime, ArrowUpward, MoreHoriz, Remove, ExitToApp } from '@material-ui/icons'
import { useTheme, alpha } from '@material-ui/core/styles'
import { useHistory } from 'react-router-dom'
import { usePlugin } from '../Context'
import { CardContent, Container, Grid, Box, Card, Typography, Toolbar, CardHeader, Divider, Skeleton,
  LinearProgress, List, ListItem, IconButton, ListItemText, ListItemAvatar, Pagination } from '@material-ui/core'
import { LoadingList } from '../components/Loading'
import Empty from '../components/Empty'
import Uptime from '../components/Uptime'
import Avatar from '../components/Avatar'
import toast from '../toast'
import dialog from '../dialog'

interface Status { time: number, players: number, tps: number, entities: number, chunks: number }
interface CurrentStatus { version: string, players: string[], mspt: number, tps: number, time: number, memory: number }

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
                    .then(it => it != null && plugin.emit('dashboard:kick', [name, it || null], res => {
                      if (res) toast('操作成功!', 'success')
                      else toast('操作失败!', 'error')
                      if (!players) return
                      players.splice(players.indexOf(it!), 1)
                      update(id + 1)
                    }))
                  }
                ><ExitToApp /></IconButton>
                <IconButton edge='end' onClick={() => his.push('/NekoMaid/playerList/' + name)} size='small'><MoreHoriz /></IconButton>
              </>}
            >
              <ListItemAvatar><Avatar src={`https://mc-heads.net/avatar/${name}/40`} imgProps={{ crossOrigin: 'anonymous' }} variant='rounded' /></ListItemAvatar>
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

const makeData = (title: string, color: string, yAxisID: string) => ({
  yAxisID,
  label: '# ' + title,
  data: [] as number[],
  fill: false,
  backgroundColor: color,
  borderColor: alpha(color, 0.2)
})

const Charts: React.FC<{ data: Status[] }> = props => {
  const theme = useTheme()
  const gridLines = {
    borderDash: [2],
    borderDashOffset: [2],
    color: theme.palette.divider,
    drawBorder: false,
    zeroLineBorderDash: [2],
    zeroLineBorderDashOffset: [2],
    zeroLineColor: theme.palette.divider
  }
  const options = {
    cornerRadius: 20,
    layout: { padding: 0 },
    legend: { display: false },
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      xAxes: {
        barThickness: 12,
        maxBarThickness: 10,
        barPercentage: 0.5,
        categoryPercentage: 0.5,
        ticks: {
          fontColor: theme.palette.text.secondary
        },
        gridLines: {
          display: false,
          drawBorder: false
        }
      },
      players: {
        gridLines,
        position: 'left',
        min: 0,
        ticks: {
          stepSize: 1,
          fontColor: theme.palette.text.secondary
        }
      },
      tps: {
        gridLines,
        position: 'left',
        display: true,
        beginAtZero: true,
        suggestedMax: 20,
        ticks: {
          fontColor: theme.palette.text.secondary
        }
      },
      entities: {
        gridLines,
        stepSize: 1,
        position: 'right',
        ticks: {
          stepSize: 1,
          fontColor: theme.palette.text.secondary
        }
      },
      chunks: {
        gridLines,
        stepSize: 1,
        position: 'right',
        min: 0,
        ticks: {
          stepSize: 1,
          fontColor: theme.palette.text.secondary
        }
      }
    },
    tooltips: {
      backgroundColor: theme.palette.background.paper,
      bodyFontColor: theme.palette.text.secondary,
      borderColor: theme.palette.divider,
      borderWidth: 1,
      enabled: true,
      footerFontColor: theme.palette.text.secondary,
      intersect: false,
      mode: 'index',
      titleFontColor: theme.palette.text.primary
    }
  }

  const data = {
    labels: [] as string[],
    datasets: [makeData('玩家数', blue[600], 'players'), makeData('TPS', orange[600], 'tps'), makeData('区块数', deepPurple[600], 'chunks'), makeData('实体数', green[600], 'entities')]
  }
  props.data.forEach(it => {
    const time = new Date(it.time)
    data.labels.push(`${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`)
    data.datasets[0].data.push(it.players)
    data.datasets[1].data.push(it.tps)
    data.datasets[2].data.push(it.chunks)
    data.datasets[3].data.push(it.entities)
  })

  return <Card>
    <CardHeader title='概览' />
    <Divider />
    <CardContent>
      <Box sx={{ height: 400, position: 'relative' }}>
        <Line data={data} options={options} type='line' />
      </Box>
    </CardContent>
  </Card>
}

const Dashboard: React.FC = () => {
  const plugin = usePlugin()
  const [status, setStatus] = useState<Status[]>([])
  const [current, setCurrent] = useState<CurrentStatus | undefined>()

  useEffect(() => {
    const updateCurren = (data: CurrentStatus) => setCurrent(old => {
      if (old && (old.players.length === data.players.length && old.players.every((it, i) => it === data.players[i]))) data.players = old.players
      return data
    })
    plugin.once('dashboard:info', setStatus).on('dashboard:current', updateCurren).switchPage('dashboard')
    return () => { plugin.off('dashboard:info', setStatus).off('dashboard:current', updateCurren) }
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
          <TopCard title='服务端版本' content={current ? current.version : <Skeleton animation='wave' width={150} />} icon={<Handyman />} color={orange[600]}>
            <Box sx={{ pt: 2, display: 'flex', alignItems: 'flex-end' }}>
              <Check htmlColor={green[900]} />
              <Typography color='textSecondary' variant='caption'>&nbsp;当前已为最新版</Typography>
            </Box>
          </TopCard>
        </Grid>
        <Grid item lg={3} sm={6} xl={3} xs={12}>
          <TopCard title='在线人数' content={current ? playerCount : <Skeleton animation='wave' width={150} />} icon={<People />} color={deepPurple[600]}>
            <Box sx={{ pt: 2, display: 'flex', alignItems: 'flex-end' }}>
              {percent === 0 ? <Remove color='primary' /> : percent < 0 ? <ArrowDownward color='error' /> : <ArrowUpward color='success' />}
              <Typography sx={{ color: (percent === 0 ? blue : percent < 0 ? red : green)[900], mr: 1 }} variant='body2'>{Math.abs(percent)}%</Typography>
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
              <LinearProgress variant='determinate' value={current?.memory || 0} sx={{ flex: '1' }} />
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
