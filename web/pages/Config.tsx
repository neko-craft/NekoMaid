import React, { useState } from 'react'
import dayjs from 'dayjs'
import dialog from '../dialog'
import { lang } from '../../languages'
import * as colors from '@mui/material/colors'
import { failed, success } from '../toast'
import { configs } from '../Plugin'
import { useGlobalData, usePlugin } from '../Context'
import { CircularLoading } from '../components/Loading'

import Delete from '@mui/icons-material/Delete'
import HelpOutline from '@mui/icons-material/HelpOutline'
import Check from '@mui/icons-material/Check'
import Brightness4 from '@mui/icons-material/Brightness4'
import Brightness7 from '@mui/icons-material/Brightness7'
import SettingsBrightness from '@mui/icons-material/SettingsBrightness'
import Edit from '@mui/icons-material/Edit'
import Equalizer from '@mui/icons-material/Equalizer'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'

import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import IconButton from '@mui/material/IconButton'
import ToggleButton from '@mui/material/ToggleButton'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import Avatar from '@mui/material/Avatar'
import ListItemText from '@mui/material/ListItemText'
import Tooltip from '@mui/material/Tooltip'
import CardContent from '@mui/material/CardContent'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Paper from '@mui/material/Paper'
import ListItemButton from '@mui/material/ListItemButton'
import Switch from '@mui/material/Switch'
import ListItemIcon from '@mui/material/ListItemIcon'
import Collapse from '@mui/material/Collapse'
import Link from '@mui/material/Link'

import type { ServerRecord } from '../App'

configs.push({
  title: () => lang.config.serverConfig,
  component () {
    const plugin = usePlugin()
    const globalData = useGlobalData()
    const [flag, update] = useState(0)
    const [info, setInfo] = useState<Record<string, string>>({ })
    const [open, setOpen] = useState(false)
    const [canGetData, setCanGetData] = useState(true)
    const [loading, setLoading] = useState(false)
    const setValue = (field: string, value: any, isGlobal = true) => {
      plugin.emit('server:set', field, value)
      success()
      if (isGlobal) {
        (globalData as any)[field] = value
        update(flag + 1)
        location.reload()
      }
    }
    const createEditButtom = (field: string, isGlobal?: boolean, isInt = true) => <IconButton
      onClick={() => dialog(
        {
          content: lang.inputValue,
          input: isInt
            ? {
                error: true,
                type: 'number',
                helperText: lang.invalidValue,
                validator: (it: string) => /^\d+$/.test(it) && +it >= 0
              }
            : { }
        }).then(res => res != null && setValue(field, isInt ? parseInt(res as any) : (res || null), isGlobal))}
    ><Edit /></IconButton>

    const infoElm: JSX.Element[] = []
    for (const key in info) {
      const name = (lang.config as any)[key]
      infoElm.push(<ListItem key={key} sx={{ pl: 4 }}>
        <ListItemText
          primary={key === 'isAikarFlags' ? <Link href='https://mcflags.emc.gs' target='_blank' rel='noopener'>{name}</Link> : name}
          secondary={info[key].toString()}
        />
      </ListItem>)
    }

    return <List>
      <CircularLoading loading={loading} />
      <ListItem secondaryAction={globalData.canSetMaxPlayers
        ? createEditButtom('maxPlayers')
        : undefined}>
        <ListItemText primary={lang.config.maxPlayers + ': ' + globalData.maxPlayers} />
      </ListItem>
      <ListItem secondaryAction={createEditButtom('spawnRadius')}>
        <ListItemText primary={lang.config.spawnRadius + ': ' + globalData.spawnRadius} />
      </ListItem>
      <ListItem secondaryAction={createEditButtom('motd', false, false)}>
        <ListItemText primary={lang.config.motd} />
      </ListItem>
      <ListItem secondaryAction={<Switch checked={globalData.hasWhitelist} onChange={e => setValue('hasWhitelist', e.target.checked)} />}>
        <ListItemText primary={lang.config.whitelist} />
      </ListItem>
      {canGetData && <>
        <ListItemButton onClick={() => {
          if (infoElm.length) setOpen(!open)
          else {
            setLoading(true)
            plugin.emit('server:fetchInfo', (data: any) => {
              setLoading(false)
              if (!data) {
                failed(lang.unsupported)
                setCanGetData(false)
                return
              }
              setInfo(data)
              setOpen(true)
            })
          }
        }}>
        <ListItemIcon><Equalizer /></ListItemIcon>
          <ListItemText primary={lang.info} />
          {open ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={open} timeout='auto' unmountOnExit>
          <List component='div' dense disablePadding>{infoElm}</List>
        </Collapse>
      </>}
    </List>
  }
},
{
  title: () => lang.history,
  component () {
    const [cur, update] = useState(0)
    const list: ServerRecord[] = JSON.parse(localStorage.getItem('NekoMaid:servers') || '[]')
    return <List>
      {list.sort((a, b) => b.time - a.time).map(it => {
        const i = it.address.indexOf('?')
        return <ListItem
          disablePadding
          key={it.address}
          secondaryAction={<IconButton edge='end' size='small' onClick={() => {
            localStorage.setItem('NekoMaid:servers', JSON.stringify(list.filter(s => s.address !== it.address)))
            success()
            update(cur + 1)
          }}><Delete /></IconButton>}
        >
          <ListItemButton onClick={() => {
            location.hash = ''
            location.search = it.address
          }} dense>
            <ListItemAvatar><Avatar src={it.icon} variant='rounded'><HelpOutline /></Avatar></ListItemAvatar>
            <ListItemText primary={<Tooltip title={it.address.slice(i + 1)}>
              <span>{it.address.slice(0, i)}</span></Tooltip>} secondary={dayjs(it.time).fromNow()} />
          </ListItemButton>
        </ListItem>
      })}
    </List>
  }
},
{
  title: () => lang.config.theme,
  component () {
    const color = localStorage.getItem('NekoMaid:color') || 'blue'
    return <CardContent sx={{ textAlign: 'center' }}>
      <Box>
        <ToggleButtonGroup exclusive value={localStorage.getItem('NekoMaid:colorMode') || ''} onChange={(_, it) => {
          localStorage.setItem('NekoMaid:colorMode', it)
          location.reload()
        }}>
          <ToggleButton value='light'><Brightness7 /> {lang.config.light}</ToggleButton>
          <ToggleButton value=''><SettingsBrightness /> {lang.config.system}</ToggleButton>
          <ToggleButton value='dark'><Brightness4 /> {lang.config.dark}</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Paper sx={{ marginTop: 2, width: '176px', overflow: 'hidden', display: 'inline-block' }}>
        {Object.keys(colors).slice(1, 17).map((key, i) => {
          const checked = color === key
          const elm = <Box
            key={key}
            onClick={() => {
              localStorage.setItem('NekoMaid:color', key)
              location.reload()
            }}
            sx={{
              backgroundColor: (colors as any)[key][600],
              width: '44px',
              height: '44px',
              display: 'inline-block',
              cursor: 'pointer'
            }}
          ><Check htmlColor='white' sx={{ top: '10px', position: 'relative', opacity: checked ? 1 : 0 }} /></Box>
          return (i + 1) % 4 === 0 ? <React.Fragment key={key}>{elm}<br /></React.Fragment> : elm
        })}
      </Paper>
    </CardContent>
  }
})

const Config: React.FC = () => {
  return <Box sx={{ minHeight: '100%', py: 3 }}>
    <Toolbar />
    <Container maxWidth={false}>
      <Grid container spacing={3}>
        {configs.map((it, i) => <Grid key={i} item lg={4} md={12} xl={6} xs={12}>
          <Card>
            <CardHeader title={it.title()} />
            <Divider />
            <it.component />
          </Card>
        </Grid>)}
      </Grid>
    </Container>
  </Box>
}

export default Config
