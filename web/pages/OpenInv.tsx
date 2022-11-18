import React, { useState, useEffect } from 'react'
import { action, failed, success } from '../toast'
import Backpack from '@mui/icons-material/Backpack'
import Refresh from '@mui/icons-material/Refresh'
import { useGlobalData, usePlugin } from '../Context'
import { ActionComponent } from './PlayerList'
import { useNavigate, useParams } from 'react-router-dom'
import { cardActionStyles } from '../theme'
import ItemViewer, { Item, InvType } from '../components/ItemViewer'
import Empty from '../components/Empty'
import lang, { minecraft } from '../../languages'

import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import MenuItem from '@mui/material/MenuItem'
import CardContent from '@mui/material/CardContent'

export const playerAction: ActionComponent = ({ onClose, player }) => {
  const navigate = useNavigate()
  const globalData = useGlobalData()
  return <MenuItem disabled={!player || (!globalData.hasOpenInv && !player.online)} onClick={() => {
    onClose()
    if (player) navigate('/NekoMaid/openInv/' + player.name)
  }}>
    <ListItemIcon><Backpack /></ListItemIcon>{lang.openInv.title}
  </MenuItem>
}

const OpenInv: React.FC = () => {
  const plugin = usePlugin()
  const [inv, setInv] = useState<Array<Item | null>>([])
  const [ender, setEnder] = useState<Array<Item | null>>([])
  const { name: player } = useParams<{ name: string }>()
  useEffect(() => {
    if (player) plugin.emit('openInv:fetchInv', setInv, player).emit('openInv:fetchEnderChest', setEnder, player)
  }, [player])

  const mapToInv = (inv: Array<Item | null>, type: InvType) => {
    const update = (res: boolean) => {
      if (!res) failed()
      if (type === InvType.PLAYER) plugin.emit('openInv:fetchInv', setInv, player)
      else plugin.emit('openInv:fetchEnderChest', setEnder, player)
    }
    const updateWithAction = (res: boolean) => {
      action(res)
      if (type === InvType.PLAYER) plugin.emit('openInv:fetchInv', setInv, player)
      else plugin.emit('openInv:fetchEnderChest', setEnder, player)
    }
    return player
      ? inv.map((it, i) => <React.Fragment key={i}><ItemViewer
        item={it}
        data={{ type, solt: i, player }}
        onDrag={() => plugin.emit('openInv:set', update, type, player, i, null, -1)}
        onDrop={(item, obj) => plugin.emit('openInv:set', update, type,
          player, i, JSON.stringify(item), obj?.type === type && obj?.player === player ? obj.solt : -1)}
        onEdit={item => item !== false && plugin.emit('openInv:set', updateWithAction, type, player, i, item && JSON.stringify(item), -1)}
      />{!((i + 1) % 9) && <br />}</React.Fragment>)
      : <Empty title={lang.openInv.notSelected} />
  }

  return <Box sx={{ minHeight: '100%', py: 3 }}>
    <Toolbar />
    <Container maxWidth={false}>
      <Grid container spacing={3}>
        <Grid item lg={6} md={12} xl={6} xs={12}>
          <Card>
            <CardHeader
              title={lang.openInv.whosBackpack(player || minecraft['entity.minecraft.player'])}
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
            <CardContent sx={{ whiteSpace: 'nowrap', overflowX: 'auto' }}>{mapToInv(inv, InvType.PLAYER)}</CardContent>
          </Card>
        </Grid>
        <Grid item lg={6} md={12} xl={6} xs={12}>
          <Card>
            <CardHeader
              title={lang.openInv.whosEnderChest(player || minecraft['entity.minecraft.player'])}
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
            <CardContent sx={{ whiteSpace: 'nowrap', overflowX: 'auto' }}>{mapToInv(ender, InvType.ENDER_CHEST)}</CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  </Box>
}

export default OpenInv
