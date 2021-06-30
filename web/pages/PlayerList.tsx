import React, { useMemo, useEffect, useState, useRef } from 'react'
import dayjs from 'dayjs'
import toast from '../toast'
import Empty from '../components/Empty'
import { usePlugin } from '../Context'
import { Block, Star, StarBorder } from '@material-ui/icons'
import { Grid, Toolbar, Card, CardHeader, Divider, Box, Container, CardContent, TableContainer, Table, TableBody, Dialog, DialogTitle,
  DialogContent, TablePagination, TableHead, TableRow, TableCell, Avatar, IconButton, Tooltip, ToggleButtonGroup, ToggleButton,
  DialogContentText, TextField, DialogActions, Button } from '@material-ui/core'
import { FXAASkinViewer, createOrbitControls, WalkingAnimation, RotatingAnimation } from 'skinview3d'
import { useTheme } from '@material-ui/core/styles'
import { useParams, useHistory } from 'react-router-dom'

const PlayerActions: React.FC = () => {
  const theme = useTheme()
  const viewerRef = useRef<FXAASkinViewer | undefined>()
  const ref = useRef<HTMLCanvasElement | null>(null)
  const { name } = useParams<{ name: string }>()
  useEffect(() => {
    if (!ref.current || !name) return
    const viewer = viewerRef.current = new FXAASkinViewer({
      canvas: ref.current!,
      height: 400,
      width: ref.current.clientWidth,
      skin: 'https://mc-heads.net/skin/' + name
    })

    const resize = () => ref.current && (viewer.width = ref.current.clientWidth)
    window.addEventListener('resize', resize)
    const control = createOrbitControls(viewer)
    control.enableRotate = true
    control.enablePan = true

    viewer.animations.add(WalkingAnimation)
    viewer.animations.add(RotatingAnimation)
    return () => {
      viewerRef.current = undefined
      window.removeEventListener('resize', resize)
      viewer.dispose()
    }
  }, [ref.current])
  useEffect(() => {
    if (!viewerRef.current) return
    if (name) {
      viewerRef.current.loadSkin('https://mc-heads.net/skin/' + name)
      if (viewerRef.current.renderPaused) viewerRef.current.renderPaused = false
    } else viewerRef.current.renderPaused = true
  }, [name])
  const color = theme.palette.mode === 'dark' ? 255 : 0

  return <Card>
    <CardHeader title={name ? name + ' 的详细信息' : '请选择一名玩家'} />
    <Divider />
    <CardContent>
      <Box sx={{ position: 'relative', '& canvas': { width: '100%!important' } }}>
        <canvas
          ref={ref}
          height='400'
          style={{
            cursor: 'grab',
            filter: `drop-shadow(rgba(${color}, ${color}, ${color}, 0.2) 2px 4px 4px)`,
            display: name ? undefined : 'none'
          }}
        />
        {!name && <Empty title={null} />}
      </Box>
    </CardContent>
  </Card>
}

interface PlayerData { name: string, ban: String | null, whitelisted: boolean, playTime: number, lastOnline: number }

const List: React.FC = () => {
  const his = useHistory()
  const plugin = usePlugin()
  const [page, setPage] = useState(0)
  const [reason, setReason] = useState('')
  const [banPlayer, setBanPlayer] = useState<string | null>(null)
  const [state, setState] = useState<number | null>(null)
  const [data, setData] = useState<{ count: number, hasWhitelist: boolean, players: PlayerData[] }>(() => ({ count: 0, hasWhitelist: false, players: [] }))
  const refresh = () => {
    plugin.emit('playerList:fetchPage', { page, state }, (it: any) => {
      if (it.players == null) it.players = []
      setData(it)
    })
  }
  useMemo(refresh, [page, state])

  return <Card>
    <CardHeader
      title='玩家列表'
      action={
        <ToggleButtonGroup
        size='small'
        color={(state === 1 ? 'warning' : state === 2 ? 'error' : undefined) as any}
        value={state}
        exclusive
        onChange={(_, it) => setState(it)}
        aria-label="text alignment"
      >
        <ToggleButton value={1}><Star /></ToggleButton>
        <ToggleButton value={2}><Block /></ToggleButton>
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
              {(state === 1 || data.hasWhitelist) && <Tooltip title={it.whitelisted ? '点击可将该玩家移出白名单' : '点击可将该玩家添加到白名单'}>
                <IconButton onClick={() => {
                  plugin.emit(`playerList:${it.whitelisted ? 'remove' : 'add'}Whitelist`, it.name)
                  refresh()
                  toast('操作成功!', 'success')
                }}>{it.whitelisted ? <Star color='warning' /> : <StarBorder />}</IconButton>
              </Tooltip>}
              <Tooltip title={it.ban == null ? '点击可封禁该玩家' : '已被封禁: ' + it.ban}>
                <IconButton onClick={() => {
                  if (!it.ban) return setBanPlayer(it.name)
                  plugin.emit('playerList:pardon', it.name)
                  refresh()
                  toast('操作成功!', 'success')
                }}><Block color={it.ban == null ? undefined : 'error'} /></IconButton>
              </Tooltip>
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
    <Dialog open={!!banPlayer} onClose={() => setBanPlayer(null)}>
      <DialogTitle id="form-dialog-title">Subscribe</DialogTitle>
      <DialogContent>
        <DialogContentText>确认要封禁 <span style={{ fontWeight: 'bold' }}>{banPlayer}</span> 吗?</DialogContentText>
        <TextField
          autoFocus
          fullWidth
          margin='dense'
          label='封禁理由'
          variant='standard'
          value={reason}
          onChange={it => setReason(it.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setBanPlayer(null)}>取消</Button>
        <Button onClick={() => {
          plugin.emit('playerList:ban', [banPlayer, reason])
          setBanPlayer(null)
          refresh()
          toast('操作成功!', 'success')
        }}>封禁</Button>
      </DialogActions>
    </Dialog>
  </Card>
}

const PlayerList: React.FC = () => {
  return <Box sx={{ minHeight: '100%', py: 3 }}>
    <Toolbar />
    <Container maxWidth={false}>
      <Grid container spacing={3}>
        <Grid item lg={8} md={12} xl={9} xs={12}><List /></Grid>
        <Grid item lg={4} md={6} xl={3} xs={12}><PlayerActions /></Grid>
      </Grid>
    </Container>
  </Box>
}

export default PlayerList
