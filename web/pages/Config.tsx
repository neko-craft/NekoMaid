import React, { useState } from 'react'
import dayjs from 'dayjs'
import * as colors from '@material-ui/core/colors'
import { success } from '../toast'
import { configs } from '../Plugin'
import { Delete, HelpOutline, Check, Brightness4, Brightness7, SettingsBrightness } from '@material-ui/icons'
import { Box, Toolbar, Container, Grid, Card, CardHeader, Divider, List, ListItem, IconButton, ToggleButton,
  ListItemAvatar, Avatar, ListItemText, Tooltip, CardContent, ToggleButtonGroup, Paper } from '@material-ui/core'

import type { ServerRecord } from '../types'

configs.push({
  title: '连接记录',
  component: () => {
    const [cur, update] = useState(0)
    const list: ServerRecord[] = JSON.parse(localStorage.getItem('NekoMaid:servers') || '[]')
    return <List>
      {list.sort((a, b) => b.time - a.time).map(it => {
        const i = it.address.indexOf('?')
        return <ListItem
          key={it.address}
          secondaryAction={<IconButton edge='end' size='small' onClick={() => {
            localStorage.setItem('NekoMaid:servers', JSON.stringify(list.filter(s => s.address !== it.address)))
            success()
            update(cur + 1)
          }}><Delete /></IconButton>}
        >
          <ListItemAvatar><Avatar src={it.icon} variant='square'><HelpOutline /></Avatar></ListItemAvatar>
          <ListItemText primary={<Tooltip title={it.address.slice(i + 1)}>
            <span>{it.address.slice(0, i)}</span></Tooltip>} secondary={dayjs(it.time).fromNow()} />
        </ListItem>
      })}
    </List>
  }
},
{
  title: '主题设置',
  component: () => {
    const color = localStorage.getItem('NekoMaid:color') || 'blue'
    return <CardContent sx={{ textAlign: 'center' }}>
      <Box>
        <ToggleButtonGroup exclusive value={localStorage.getItem('NekoMaid:colorMode') || ''} onChange={(_, it) => {
          localStorage.setItem('NekoMaid:colorMode', it)
          location.reload()
        }}>
          <ToggleButton value='light'><Brightness7 /> 亮色</ToggleButton>
          <ToggleButton value=''><SettingsBrightness /> 随系统</ToggleButton>
          <ToggleButton value='dark'><Brightness4 /> 暗色</ToggleButton>
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
            <CardHeader title={it.title} />
            <Divider />
            <it.component />
          </Card>
        </Grid>)}
      </Grid>
    </Container>
  </Box>
}

export default Config
