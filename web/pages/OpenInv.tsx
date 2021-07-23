import React, { useState, useEffect } from 'react'
import { success } from '../toast'
import { Backpack, HelpOutline, Refresh } from '@material-ui/icons'
import { Box, Toolbar, Container, Grid, Card, CardHeader, Divider, Paper, IconButton,
  ListItemIcon, MenuItem, CardContent, Tooltip } from '@material-ui/core'
import { usePlugin } from '../Context'
import { ActionComponent } from './PlayerList'
import { useHistory, useParams } from 'react-router-dom'
import { minecraft } from '../../languages/zh_CN'
import * as icons from '../../minecraftIcons.json'
import Empty from '../components/Empty'

export const playerAction: ActionComponent = ({ onClose, player }) => {
  const his = useHistory()
  return <MenuItem onClick={() => {
    onClose()
    his.push('/NekoMaid/openInv/' + player)
  }}>
    <ListItemIcon><Backpack /></ListItemIcon>背包/末影箱
  </MenuItem>
}

const cardActionStyles: any = {
  position: 'absolute',
  right: (theme: any) => theme.spacing(1),
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  alignItems: 'center'
}

interface Item { type: string, name?: string, icon?: string, amount: number, lore?: string[], isBlock: boolean, hasEnchants: boolean }
const Scheduler: React.FC = () => {
  const plugin = usePlugin()
  const [inv, setInv] = useState<Array<Item | null>>([])
  const [ender, setEnder] = useState<Array<Item | null>>([])
  const { name: player } = useParams<{ name: string }>()
  useEffect(() => {
    if (player) plugin.emit('openInv:fetchInv', setInv, player).emit('openInv:fetchEnderChest', setEnder, player)
  }, [player])

  const mapToInv = (inv: Array<Item | null>) => player
    ? inv.map((it, i) => {
      const type = it ? it.icon || it.type.toLowerCase() : ''
      const hasEnchants = it?.hasEnchants && type in icons
      const elm = <Paper sx={{
        width: '40px',
        height: '40px',
        display: 'inline-block',
        marginRight: 1,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)',
        '& span': {
          position: 'absolute',
          right: 2,
          bottom: -5,
          textShadow: theme => theme.palette.mode === 'light'
            ? '#fff 1px 0 0, #fff 0 1px 0, #fff -1px 0 0, #fff 0 -1px 0'
            : '#000 1px 0 0, #000 0 1px 0, #000 -1px 0 0, #000 0 -1px 0'
        }
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          left: 0,
          bottom: 0,
          backgroundSize: 'cover',
          imageRendering: 'pixelated',
          filter: hasEnchants ? 'brightness(1.5)' : undefined,
          backgroundImage: it && type in icons ? `url(/icons/minecraft/${type}.png)` : undefined
        }}>
          {hasEnchants && <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            opacity: 0.5,
            WebkitMaskSize: 'cover',
            filter: 'blur(1px) brightness(1.7)',
            maskImage: `url(/icons/minecraft/${type}.png)`,
            WebkitMaskImage: `url(/icons/minecraft/${type}.png)`,
            animation: 'enchants-animation 6s infinite linear',
            backgroundPositionY: 128,
            backgroundImage: 'url(/icons/minecraft/enchanted_item_glint.png)'
          }} />}
        </div>
        {it && !(type in icons) && <HelpOutline sx={{ position: 'absolute', left: 8, top: 8 }} />}
        {it && it.amount > 1 ? <span>{it.amount}</span> : null}
      </Paper>
      return <React.Fragment key={i}>
        {it
          ? <Tooltip title={<>
            <h4 style={{ margin: 0 }}>{it.name || (minecraft as any)[`${it.isBlock ? 'block' : 'item'}.minecraft.${it.type.toLowerCase()}`]}</h4>
            {it.lore?.map((l, i) => <p key={i}>{l}</p>)}
          </>}>{elm}</Tooltip>
          : elm}
        {(i + 1) % 9 === 0 ? <br /> : null}
      </React.Fragment>
    })
    : <Empty title='请先选择一名玩家!' />

  return <Box sx={{ minHeight: '100%', py: 3 }}>
    <Toolbar />
    <Container maxWidth={false}>
      <Grid container spacing={3}>
        <Grid item lg={6} md={12} xl={6} xs={12}>
          <Card>
            <CardHeader
              title={(player || '玩家') + '的背包'}
              sx={{ position: 'relative' }}
              action={<IconButton
                size='small'
                disabled={!player}
                sx={cardActionStyles}
                onClick={() => {
                  success()
                  plugin.emit('openInv:fetchInv', setInv, player)
                }}
              ><Refresh /></IconButton>}
            />
            <Divider />
            <CardContent sx={{ whiteSpace: 'nowrap', overflowX: 'auto' }}>{mapToInv(inv)}</CardContent>
          </Card>
        </Grid>
        <Grid item lg={6} md={12} xl={6} xs={12}>
          <Card>
            <CardHeader
              title={(player || '玩家') + '的末影箱'}
              sx={{ position: 'relative' }}
              action={<IconButton
                size='small'
                disabled={!player}
                sx={cardActionStyles}
                onClick={() => {
                  success()
                  plugin.emit('openInv:fetchEnderChest', setEnder, player)
                }}
              ><Refresh /></IconButton>}
            />
            <Divider />
            <CardContent sx={{ whiteSpace: 'nowrap', overflowX: 'auto' }}>{mapToInv(ender)}</CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  </Box>
}

export default Scheduler
