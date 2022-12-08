import React, { useEffect, useState, useRef } from 'react'
import Plugin, { PlayerData, playerListActions } from '../Plugin'
import dayjs from 'dayjs'
import Empty from '../components/Empty'
import dialog from '../dialog'
import { success } from '../toast'
import { getSkin } from '../utils'
import { CircularLoading } from '../components/Loading'
import { usePlugin, useGlobalData } from '../Context'
import { FXAASkinViewer, createOrbitControls, WalkingAnimation, RotatingAnimation } from 'skinview3d'
import { useTheme } from '@mui/material/styles'
import { useParams, useNavigate } from 'react-router-dom'
import { minecraft, lang } from '../../languages'

import Grid from '@mui/material/Grid'
import Toolbar from '@mui/material/Toolbar'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import TableContainer from '@mui/material/TableContainer'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import CardContent from '@mui/material/CardContent'
import TablePagination from '@mui/material/TablePagination'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import List from '@mui/material/List'
import ListSubheader from '@mui/material/ListSubheader'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import Collapse from '@mui/material/Collapse'
import ListItemButton from '@mui/material/ListItemButton'
import CardActions from '@mui/material/CardActions'
import Link from '@mui/material/Link'
import Menu from '@mui/material/Menu'
import Avatar from '@mui/material/Avatar'

import Block from '@mui/icons-material/Block'
import Star from '@mui/icons-material/Star'
import StarBorder from '@mui/icons-material/StarBorder'
import AssignmentInd from '@mui/icons-material/AssignmentInd'
import Equalizer from '@mui/icons-material/Equalizer'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import Security from '@mui/icons-material/Security'
import AccessTime from '@mui/icons-material/AccessTime'
import Today from '@mui/icons-material/Today'
import Event from '@mui/icons-material/Event'
import Login from '@mui/icons-material/Login'
import Sick from '@mui/icons-material/Sick'
import FaceRetouchingOff from '@mui/icons-material/FaceRetouchingOff'
import Pets from '@mui/icons-material/Pets'
import Fireplace from '@mui/icons-material/Fireplace'
import ErrorOutline from '@mui/icons-material/ErrorOutline'
import Search from '@mui/icons-material/Search'
import MoreHoriz from '@mui/icons-material/MoreHoriz'

interface IPlayerInfo {
  id: string
  ban: string | null
  whitelisted: boolean
  playTime: number
  lastOnline: number
  hasPlayedBefore: boolean
  firstPlay: number
  isOP: boolean
  death: number
  quit: number
  playerKill: number
  entityKill: number
  tnt: number
}

const banPlayer = (name: string, plugin: Plugin, refresh: () => void, isBan: boolean) => {
  const span = <span className='bold'>{name}</span>
  ;(isBan ? dialog(lang.playerList.confirmBan(span), lang.reason) : dialog(lang.playerList.confirmPardon(span))).then(it => {
    if (it == null || it === false) return
    plugin.emit('playerList:' + (isBan ? 'ban' : 'pardon'), name, it)
    refresh()
    success()
  })
}

const whitelist = (name: string, plugin: Plugin, refresh: () => void, isAdd: boolean) => {
  dialog(lang.playerList[isAdd ? 'confirmAddWhitelist' : 'confirmRemoveWhitelist'](<span className='bold'>{name}</span>)).then(it => {
    if (!it) return
    plugin.emit(`playerList:${isAdd ? 'add' : 'remove'}Whitelist`, name)
    refresh()
    success()
  })
}

// eslint-disable-next-line react/jsx-key
const icons = [<AccessTime />, <Today />, <Event />, <Login />, <Sick />, <FaceRetouchingOff />, <Pets />, <Fireplace />]
const PlayerInfo: React.FC<{ name?: string }> = React.memo(({ name }) => {
  const plugin = usePlugin()
  const globalData = useGlobalData()
  const [open, setOpen] = useState(false)
  const [info, setInfo] = useState<IPlayerInfo | undefined>()
  const refresh = () => plugin.emit('playerList:query', setInfo, name)
  useEffect(() => {
    setInfo(undefined)
    if (name) refresh()
  }, [name])

  return name && info
    ? <>
      <Divider />
      <List
        sx={{ width: '100%' }}
        component='nav'
        subheader={<ListSubheader component='div' sx={{ backgroundColor: 'inherit' }}>{lang.playerList.details}</ListSubheader>}
      >
        <ListItem>
          <ListItemIcon><AssignmentInd /></ListItemIcon>
          <ListItemText primary={globalData.onlineMode
            ? <Link underline='hover' rel='noopener' target='_blank' href={'https://namemc.com/profile/' + info.id}>{info.id}</Link>
            : info.id
          } />
        </ListItem>
        {!info.hasPlayedBefore && <ListItem>
          <ListItemIcon><ErrorOutline color='error' /></ListItemIcon>
          <ListItemText primary={lang.playerList.hasNotPlayed} />
        </ListItem>}
        {info.ban != null && <ListItem>
          <ListItemIcon><Block color='error' /></ListItemIcon>
          <ListItemText primary={lang.playerList.banned + (info.ban ? ': ' + info.ban : '')} />
        </ListItem>}
        {info.whitelisted && <ListItem>
          <ListItemIcon><Star color='warning' /></ListItemIcon>
          <ListItemText primary={lang.playerList.whitelisted} />
        </ListItem>}
        {info.isOP && <ListItem>
          <ListItemIcon><Security color='primary' /></ListItemIcon>
          <ListItemText primary={lang.playerList.op} />
          </ListItem>}
        {info.hasPlayedBefore && <>
            <ListItemButton onClick={() => setOpen(!open)}>
            <ListItemIcon><Equalizer /></ListItemIcon>
            <ListItemText primary={minecraft['gui.stats']} />
            {open ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <List component='div' dense disablePadding>
              {[
                minecraft['stat.minecraft.play_time'] + ': ' + dayjs.duration(info.playTime / 20, 'seconds').humanize(),
                lang.playerList.firstPlay + ': ' + dayjs(info.firstPlay).fromNow(),
                lang.playerList.lastPlay + ': ' + dayjs(info.lastOnline).fromNow(),
                minecraft['stat.minecraft.leave_game'] + ': ' + info.quit,
                minecraft['stat.minecraft.deaths'] + ': ' + info.death,
                minecraft['stat.minecraft.player_kills'] + ': ' + info.playerKill,
                minecraft['stat.minecraft.mob_kills'] + ': ' + info.entityKill,
                lang.playerList.tnt + ': ' + info.tnt
              ].map((it, i) => <ListItem key={i} sx={{ pl: 4 }}>
                <ListItemIcon>{icons[i]}</ListItemIcon>
                <ListItemText primary={it} />
              </ListItem>)}
            </List>
          </Collapse>
        </>}
      </List>
      <CardActions disableSpacing sx={{ justifyContent: 'flex-end' }}>
        <Tooltip title={lang.playerList[info.whitelisted ? 'clickToRemoveWhitelist' : 'clickToAddWhitelist']}>
          <IconButton onClick={() => whitelist(name, plugin, refresh, !info.whitelisted)}>
            {info.whitelisted ? <Star color='warning' /> : <StarBorder />}
          </IconButton>
        </Tooltip>
        <Tooltip title={lang.playerList[info.ban == null ? 'clickToBan' : 'clickToPardon']}>
          <IconButton onClick={() => banPlayer(name, plugin, refresh, info.ban == null)}>
            <Block color={info.ban == null ? undefined : 'error'} />
          </IconButton>
        </Tooltip>
      </CardActions>
    </>
    : <></>
})

const PlayerActions: React.FC = () => {
  const theme = useTheme()
  const ref = useRef<HTMLCanvasElement | null>(null)
  const globalData = useGlobalData()
  const { name } = useParams<{ name: string }>()
  useEffect(() => {
    if (!ref.current || !name) return
    const viewer = new FXAASkinViewer({
      canvas: ref.current!,
      height: 350,
      width: ref.current.clientWidth,
      skin: getSkin(globalData, name)
    })
    viewer.renderer.setClearColor(theme.palette.mode === 'dark' ? 0x2c2c2c : 0xffffff)

    const resize = () => ref.current && (viewer.width = ref.current.clientWidth)
    window.addEventListener('resize', resize)
    const control = createOrbitControls(viewer)
    control.enableRotate = true
    control.enablePan = control.enableZoom = false

    viewer.animations.add(WalkingAnimation)
    viewer.animations.add(RotatingAnimation)
    return () => {
      window.removeEventListener('resize', resize)
      viewer.dispose()
    }
  }, [ref.current, name, theme.palette.mode, globalData])

  return <Card>
    <CardHeader title={name ? lang.playerList.whosDetails(name) : lang.inventory.notSelected} />
    <Divider />
    <Box sx={{ position: 'relative', '& canvas': { width: '100%!important' } }}>
      {name
        ? <canvas
          ref={ref}
          height='400'
          style={{ cursor: 'grab', display: name ? undefined : 'none' }}
        />
        : <CardContent><Empty title={null} /></CardContent>}
    </Box>
    <PlayerInfo name={name} />
  </Card>
}

const Players: React.FC = () => {
  const navigate = useNavigate()
  const plugin = usePlugin()
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<number>(0)
  const [filter, setFilter] = useState<string | null>(null)
  const [activePlayer, setActivePlayer] = useState<PlayerData | null>(null)
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null)
  const [data, setData] = useState<{ count: number, players: PlayerData[] }>(() => ({ count: 0, players: [] }))
  const globalData = useGlobalData()
  const { hasWhitelist } = globalData
  const refresh = () => {
    setLoading(true)
    plugin.emit('playerList:fetchPage', (it: any) => {
      if (it.players == null) it.players = []
      setData(it)
      setLoading(false)
    }, page, state, filter)
  }
  useEffect(refresh, [page, state])
  const close = () => {
    setAnchorEl(null)
    setActivePlayer(null)
  }

  return <Card>
    <CardHeader
      title={lang.playerList.title}
      action={
        <ToggleButtonGroup
          size='small'
          color={(state === 1 ? 'warning' : state === 2 ? 'error' : undefined) as any}
          value={state}
          exclusive
          onChange={(_, it) => {
            if (it === 3) return
            setState(it || 0)
            setFilter(null)
            setPage(0)
          }}
        >
          <ToggleButton disabled={loading} value={1}><Star /></ToggleButton>
          <ToggleButton disabled={loading} value={2}><Block /></ToggleButton>
          <ToggleButton disabled={loading} value={3} onClick={() => state !== 3 && dialog(lang.playerList.nameToSearch, lang.username)
            .then(filter => {
              if (filter == null) return
              navigate('/NekoMaid/playerList/' + filter)
              setState(3)
              setLoading(true)
              setPage(0)
              setFilter(filter.toLowerCase())
            })}><Search /></ToggleButton>
        </ToggleButtonGroup>
      }
    />
    <Divider />
    <Box sx={{ position: 'relative' }}>
      <CircularLoading loading={loading} />
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding='checkbox' />
              <TableCell>{lang.username}</TableCell>
              <TableCell align='right'>{minecraft['stat.minecraft.play_time']}</TableCell>
              <TableCell align='right'>{lang.playerList.lastPlay}</TableCell>
              <TableCell align='right'>{lang.operations}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.players.map(it => <TableRow key={it.name}>
              <TableCell sx={{ cursor: 'pointer', padding: theme => theme.spacing(1, 1, 1, 2) }} onClick={() => navigate('/NekoMaid/playerList/' + it.name)}>
                <Avatar src={getSkin(globalData, it.name, true)} imgProps={{ style: { width: 40, height: 40 } }} variant='rounded' />
              </TableCell>
              <TableCell>{it.name}</TableCell>
              <TableCell align='right'>{dayjs.duration(it.playTime / 20, 'seconds').humanize()}</TableCell>
              <TableCell align='right'>{dayjs(it.lastOnline).fromNow()}</TableCell>
              <TableCell align='right'>
                {(state === 1 || hasWhitelist) && <Tooltip title={lang.playerList[it.whitelisted ? 'clickToRemoveWhitelist' : 'clickToAddWhitelist']}>
                  <IconButton onClick={() => whitelist(it.name, plugin, refresh, !it.whitelisted)}>
                    {it.whitelisted ? <Star color='warning' /> : <StarBorder />}
                  </IconButton>
                </Tooltip>}
                <Tooltip title={it.ban == null ? lang.playerList.clickToBan : lang.playerList.banned + ': ' + it.ban}>
                  <IconButton onClick={() => banPlayer(it.name, plugin, refresh, it.ban == null)}>
                    <Block color={it.ban == null ? undefined : 'error'} />
                  </IconButton>
                </Tooltip>
                {playerListActions.length
                  ? <IconButton onClick={e => {
                    setActivePlayer(anchorEl ? null : it)
                    setAnchorEl(anchorEl ? null : e.currentTarget)
                  }}><MoreHoriz /></IconButton>
                  : null}
              </TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[]}
        component='div'
        count={data.count}
        rowsPerPage={10}
        page={page}
        onPageChange={(_, it) => !loading && setPage(it)}
      />
    </Box>
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={() => setAnchorEl(null)}
    >{playerListActions.map((It, i) => <It key={i} onClose={close} player={activePlayer} />)}</Menu>
  </Card>
}

const PlayerList: React.FC = () => {
  return <Box sx={{ minHeight: '100%', py: 3 }}>
    <Toolbar />
    <Container maxWidth={false}>
      <Grid container spacing={3}>
        <Grid item lg={8} md={12} xl={9} xs={12}><Players /></Grid>
        <Grid item lg={4} md={6} xl={3} xs={12}><PlayerActions /></Grid>
      </Grid>
    </Container>
  </Box>
}

export default PlayerList
