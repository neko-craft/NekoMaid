import React, { useState } from 'react'
import dayjs from 'dayjs'
import { success } from '../toast'
import { configs } from '../Plugin'
import { Delete, HelpOutline } from '@material-ui/icons'
import { Box, Toolbar, Container, Grid, Card, CardHeader, Divider, List, ListItem, IconButton,
  ListItemAvatar, Avatar, ListItemText, Tooltip } from '@material-ui/core'

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
