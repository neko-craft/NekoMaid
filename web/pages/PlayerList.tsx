import React, { useMemo, useEffect, useState, useRef } from 'react'
import dayjs from 'dayjs'
import Empty from '../components/Empty'
import Avatar from '../components/Avatar'
import dialog from '../dialog'
import Plugin from '../Plugin'
import { success } from '../toast'
import { usePlugin, useGlobalData } from '../Context'
import { Block, Star, StarBorder, AssignmentInd, Equalizer, ExpandLess, ExpandMore, Security, AccessTime, Today, Event,
  Login, Sick, FaceRetouchingOff, Pets, Fireplace, ErrorOutline, Search, MoreHoriz } from '@material-ui/icons'
import { Grid, Toolbar, Card, CardHeader, Divider, Box, Container, TableContainer, Table, TableBody, CardContent,
  TablePagination, TableHead, TableRow, TableCell, IconButton, Tooltip, ToggleButtonGroup, ToggleButton, List,
  ListSubheader, ListItem, ListItemText, ListItemIcon, Collapse, ListItemButton, CardActions, Link, Menu } from '@material-ui/core'
import { FXAASkinViewer, createOrbitControls, WalkingAnimation, RotatingAnimation } from 'skinview3d'
import { useTheme } from '@material-ui/core/styles'
import { useParams, useHistory } from 'react-router-dom'

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

export type ActionComponent = React.ComponentType<{ onClose: () => void, player: string | null }>
export const actions: ActionComponent[] = []

const banPlayer = (name: string, plugin: Plugin, refresh: () => void) => void dialog(<>确认要封禁 <span className='bold'>{name}</span> 吗?</>, '封禁原因')
  .then(it => {
    if (it == null) return
    plugin.emit('playerList:ban', name, it)
    refresh()
    success()
  })

const pardonPlayer = (name: string, plugin: Plugin, refresh: () => void) => void dialog(<>确认要解除 <span className='bold'>{name}</span> 的封禁吗?</>)
  .then(it => {
    if (!it) return
    plugin.emit('playerList:pardon', name)
    refresh()
    success()
  })

const whitelist = (name: string, plugin: Plugin, refresh: () => void, isAdd: boolean) => {
  const span = <span className='bold'>{name}</span>
  dialog(isAdd ? <>确认要将玩家 {span} 添加到白名单中吗?</> : <>确认要将玩家 {span} 从白名单中移出吗?</>).then(it => {
    if (!it) return
    plugin.emit(`playerList:${isAdd ? 'add' : 'remove'}Whitelist`, name)
    refresh()
    success()
  })
}

// eslint-disable-next-line react/jsx-key
const icons = [<AccessTime />, <Today />, <Event />, <Login />, <Sick />, <FaceRetouchingOff />, <Pets />, <Fireplace />]
const PlayerInfo: React.FC<{ name?: string }> = ({ name }) => {
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
        subheader={<ListSubheader component='div' sx={{ backgroundColor: 'inherit' }}>详细信息</ListSubheader>}
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
          <ListItemText primary='该玩家还从未进入过服务器!' />
        </ListItem>}
        {info.ban != null && <ListItem>
          <ListItemIcon><Block color='error' /></ListItemIcon>
          <ListItemText primary={'已被封禁' + (info.ban ? ': ' + info.ban : '')} />
        </ListItem>}
        {info.whitelisted && <ListItem>
          <ListItemIcon><Star color='warning' /></ListItemIcon>
          <ListItemText primary='白名单成员' />
        </ListItem>}
        {info.isOP && <ListItem>
          <ListItemIcon><Security color='primary' /></ListItemIcon>
          <ListItemText primary='管理员' />
          </ListItem>}
        {info.hasPlayedBefore && <>
            <ListItemButton onClick={() => setOpen(!open)}>
            <ListItemIcon><Equalizer /></ListItemIcon>
            <ListItemText primary='统计数据' />
            {open ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <List component='div' dense disablePadding>
              {[
                '在线时间: ' + dayjs.duration(info.playTime / 20, 'seconds').humanize(),
                '首次登录: ' + dayjs(info.firstPlay).fromNow(),
                '最后登录: ' + dayjs(info.lastOnline).fromNow(),
                '登录次数: ' + info.quit,
                '死亡次数: ' + info.death,
                '玩家击杀次数: ' + info.playerKill,
                '实体击杀次数: ' + info.entityKill,
                'TNT放置次数: ' + info.tnt
              ].map((it, i) => <ListItem key={i} sx={{ pl: 4 }}>
                <ListItemIcon>{icons[i]}</ListItemIcon>
                <ListItemText primary={it} />
              </ListItem>)}
            </List>
          </Collapse>
        </>}
      </List>
      <CardActions disableSpacing sx={{ justifyContent: 'flex-end' }}>
        <Tooltip title={info.whitelisted ? '点击可将该玩家移出白名单' : '点击可将该玩家添加到白名单'}>
          <IconButton onClick={() => whitelist(name, plugin, refresh, !info.whitelisted)}>
            {info.whitelisted ? <Star color='warning' /> : <StarBorder />}
          </IconButton>
        </Tooltip>
        <Tooltip title={info.ban == null ? '点击可封禁该玩家' : '点击可解除该玩家的封禁'}>
          <IconButton onClick={() => info.ban == null ? banPlayer(name, plugin, refresh) : pardonPlayer(name, plugin, refresh)}>
            <Block color={info.ban == null ? undefined : 'error'} />
          </IconButton>
        </Tooltip>
      </CardActions>
    </>
    : <></>
}

const PlayerActions: React.FC = () => {
  const theme = useTheme()
  const ref = useRef<HTMLCanvasElement | null>(null)
  const { name } = useParams<{ name: string }>()
  useEffect(() => {
    if (!ref.current || !name) return
    const viewer = new FXAASkinViewer({
      canvas: ref.current!,
      height: 350,
      width: ref.current.clientWidth,
      skin: 'https://mc-heads.net/skin/' + name
    })

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
  }, [ref.current, name])
  const color = theme.palette.mode === 'dark' ? 255 : 0

  return <Card>
    <CardHeader title={name ? name + ' 的详细信息' : '请选择一名玩家'} />
    <Divider />
    <Box sx={{ position: 'relative', '& canvas': { width: '100%!important' } }}>
      {name
        ? <canvas
          ref={ref}
          height='400'
          style={{
            cursor: 'grab',
            filter: `drop-shadow(rgba(${color}, ${color}, ${color}, 0.2) 2px 4px 4px)`,
            display: name ? undefined : 'none'
          }}
        />
        : <CardContent><Empty title={null} /></CardContent>}
    </Box>
    <PlayerInfo name={name} />
  </Card>
}

interface PlayerData { name: string, ban: String | null, whitelisted: boolean, playTime: number, lastOnline: number }

const Players: React.FC = () => {
  const his = useHistory()
  const plugin = usePlugin()
  const [page, setPage] = useState(0)
  const [state, setState] = useState<number | null>(null)
  const [activedPlayer, setActivedPlayer] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null)
  const [data, setData] = useState<{ count: number, players: PlayerData[] }>(() => ({ count: 0, players: [] }))
  const { hasWhitelist } = useGlobalData()
  const refresh = () => {
    plugin.emit('playerList:fetchPage', (it: any) => {
      if (it.players == null) it.players = []
      setData(it)
    }, page, state === 1 || state === 2 ? state : 0, null)
  }
  useMemo(refresh, [page, state])
  const close = () => {
    setAnchorEl(null)
    setActivedPlayer(null)
  }

  return <Card>
    <CardHeader
      title='玩家列表'
      action={
        <ToggleButtonGroup
        size='small'
        color={(state === 1 ? 'warning' : state === 2 ? 'error' : undefined) as any}
        value={state}
        exclusive
        onChange={(_, it) => {
          if (it === 3) return
          setState(it)
          if (state === 3) refresh()
        }}
        aria-label="text alignment"
      >
        <ToggleButton value={1}><Star /></ToggleButton>
        <ToggleButton value={2}><Block /></ToggleButton>
        <ToggleButton value={3} onClick={() => state !== 3 && dialog('请输入你要查找的游戏名:', '游戏名').then(filter => {
          if (filter == null) return
          his.push('/NekoMaid/playerList/' + filter)
          setState(3)
          plugin.emit('playerList:fetchPage', (it: any) => {
            if (it.players == null) it.players = []
            setPage(0)
            setData(it)
          }, page, 0, filter)
        })}><Search /></ToggleButton>
      </ToggleButtonGroup>
      }
    />
    <Divider />
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding='checkbox' />
            <TableCell>游戏名</TableCell>
            <TableCell align='right'>在线时间</TableCell>
            <TableCell align='right'>最后登录</TableCell>
            <TableCell align='right'>操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.players.map(it => <TableRow key={it.name}>
            <TableCell sx={{ cursor: 'pointer', padding: theme => theme.spacing(1, 1, 1, 2) }} onClick={() => his.push('/NekoMaid/playerList/' + it.name)}>
              <Avatar src={`https://mc-heads.net/avatar/${it.name}/40`} imgProps={{ crossOrigin: 'anonymous' }} variant='rounded' />
            </TableCell>
            <TableCell>{it.name}</TableCell>
            <TableCell align='right'>{dayjs.duration(it.playTime / 20, 'seconds').humanize()}</TableCell>
            <TableCell align='right'>{dayjs(it.lastOnline).fromNow()}</TableCell>
            <TableCell align='right'>
              {(state === 1 || hasWhitelist) && <Tooltip title={it.whitelisted ? '点击可将该玩家移出白名单' : '点击可将该玩家添加到白名单'}>
                <IconButton onClick={() => whitelist(it.name, plugin, refresh, !it.whitelisted)}>
                  {it.whitelisted ? <Star color='warning' /> : <StarBorder />}
                </IconButton>
              </Tooltip>}
              <Tooltip title={it.ban == null ? '点击可封禁该玩家' : '已被封禁: ' + it.ban}>
                <IconButton onClick={() => it.ban == null ? banPlayer(it.name, plugin, refresh) : pardonPlayer(it.name, plugin, refresh)}>
                  <Block color={it.ban == null ? undefined : 'error'} />
                </IconButton>
              </Tooltip>
              {actions.length
                ? <IconButton onClick={e => {
                  setActivedPlayer(anchorEl ? null : it.name)
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
      onPageChange={(_, it) => setPage(it)}
    />
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={() => setAnchorEl(null)}
    >{actions.map((It, i) => <It key={i} onClose={close} player={activedPlayer} />)}</Menu>
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
