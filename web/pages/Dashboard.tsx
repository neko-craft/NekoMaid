import React, { useEffect, useState, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { red, green, orange, deepPurple, blue, yellow } from '@material-ui/core/colors'
import { ArrowDownward, Check, Handyman, People, SentimentVerySatisfied, SentimentDissatisfied,
  SentimentSatisfied, AccessTime, ArrowUpward } from '@material-ui/icons'
import { useTheme } from '@material-ui/core/styles'
import { usePlugin } from '../Context'
import { CardContent, Container, Grid, Box, Card, Typography, Avatar, Toolbar, CardHeader, Divider, Skeleton, LinearProgress } from '@material-ui/core'
import Uptime from '../components/Uptime'

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

const data = {
  labels: ['1', '2', '3', '4', '5', '6'],
  datasets: [
    {
      label: '# of Votes',
      data: [12, 19, 3, 5, 2, 3],
      fill: false,
      backgroundColor: 'rgb(255, 99, 132)',
      borderColor: 'rgba(255, 99, 132, 0.2)',
      yAxisID: 'yAxes'
    },
    {
      label: '# of No Votes',
      data: [1, 2, 1, 1, 2, 2],
      fill: false,
      backgroundColor: 'rgb(54, 162, 235)',
      borderColor: 'rgba(54, 162, 235, 0.2)',
      yAxisID: 'yAxis'
    }
  ]
}

const Charts: React.FC = () => {
  const theme = useTheme()
  const options = {
    cornerRadius: 20,
    layout: { padding: 0 },
    legend: { display: false },
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      xAxes: [
        {
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
        }
      ],
      yAxes: [
        {
          ticks: {
            fontColor: theme.palette.text.secondary,
            beginAtZero: true,
            min: 0
          },
          gridLines: {
            borderDash: [2],
            borderDashOffset: [2],
            color: theme.palette.divider,
            drawBorder: false,
            zeroLineBorderDash: [2],
            zeroLineBorderDashOffset: [2],
            zeroLineColor: theme.palette.divider
          }
        }
      ]
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

  return <Card>
    <CardHeader title='概览' />
    <Divider />
    <CardContent>
      <Box sx={{ height: 400, position: 'relative' }}>
        <Line data={data} options={options} />
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
              <Check sx={{ color: green[900] }} />
              <Typography color='textSecondary' variant='caption'>&nbsp;当前已为最新版</Typography>
            </Box>
          </TopCard>
        </Grid>
        <Grid item lg={3} sm={6} xl={3} xs={12}>
          <TopCard title='在线人数' content={current ? playerCount : <Skeleton animation='wave' width={150} />} icon={<People />} color={deepPurple[600]}>
            <Box sx={{ pt: 2, display: 'flex', alignItems: 'flex-end' }}>
              {percent < 0 ? <ArrowDownward sx={{ color: red[900] }} /> : <ArrowUpward sx={{ color: green[900] }} />}
              <Typography sx={{ color: (percent < 0 ? red : green)[900], mr: 1 }} variant='body2'>{Math.abs(percent)}%</Typography>
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
            <Box sx={{ pt: 2, display: 'flex', alignItems: 'flex-end' }}>
              <Typography sx={{ color: tpsColor[900], mr: 1 }} variant='body2'>{!current || current.mspt === -1 ? '?' : current.mspt.toFixed(2) + 'ms'}</Typography>
              <Typography color='textSecondary' variant='caption'>每Tick耗时</Typography>
            </Box>
          </TopCard>
        </Grid>
        <Grid item lg={3} sm={6} xl={3} xs={12}>
          <TopCard title='运行时间' content={current ? <Uptime time={current.time} /> : <Skeleton animation='wave' width={150} />} icon={<AccessTime />} color={blue[600]}>
            <Box sx={{ pt: 2, display: 'flex', alignItems: 'center' }}>
              <Typography color='textSecondary' variant='caption' sx={{ marginRight: 1 }}>内存占用</Typography>
              <LinearProgress variant='determinate' value={current?.memory || 0} sx={{ flex: '1' }} />
            </Box>
          </TopCard>
        </Grid>
        <Grid item lg={8} md={12} xl={9} xs={12}>{useMemo(() => <Charts />, [])}</Grid>
      </Grid>
    </Container>
  </Box>
}

export default Dashboard
