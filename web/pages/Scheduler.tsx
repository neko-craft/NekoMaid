import React, { useState, useEffect } from 'react'
import { action } from '../toast'
import { Delete, Add, Save } from '@material-ui/icons'
import { Box, Toolbar, Container, Grid, Card, CardHeader, Divider, List, ListItemButton, Checkbox, ListItemIcon,
  ListItem, IconButton, ListItemText, Tooltip, CardContent, ToggleButtonGroup, Paper } from '@material-ui/core'
import { usePlugin } from '../Context'
import Empty from '../components/Empty'

const iconStyles: any = { position: 'absolute', right: (theme: any) => theme.spacing(1), top: '50%', transform: 'translateY(-50%)' }
interface Task { name: string, cron: string, values: string[], enabled: boolean }
const Scheduler: React.FC = () => {
  const plugin = usePlugin()
  const [id, setId] = useState(0)
  const [tasks, setTasks] = useState<Task[]>([])
  useEffect(() => {
    plugin.emit('scheduler:fetch', setTasks)
  }, [])
  return <Box sx={{ minHeight: '100%', py: 3 }}>
    <Toolbar />
    <Container maxWidth={false}>
      <Grid container spacing={3}>
        <Grid item lg={4} md={12} xl={4} xs={12}>
          <Card>
            <CardHeader
              title='任务列表'
              sx={{ position: 'relative' }}
              action={<IconButton
                size='small'
                onClick={() => {
                  setTasks([...tasks, { name: '新任务', cron: '* * * * *', enabled: false, values: [] }])
                  setId(tasks.length)
                }}
                sx={iconStyles}
              ><Add /></IconButton>}
            />
            <Divider />
            <List
              sx={{ width: '100%' }}
              component='nav'
            >
              {tasks.map((it, i) => <ListItem
                key={i}
                disablePadding
                secondaryAction={<IconButton edge='end'><Delete /></IconButton>} sx={{ position: 'relative' }}
              >
                <ListItemIcon sx={{ paddingLeft: 2, position: 'absolute' }}>
                  <Checkbox
                    edge='start'
                    checked={it.enabled}
                    tabIndex={-1}
                  />
                </ListItemIcon>
                <ListItemButton onClick={() => setId(i)}><ListItemText inset primary={it.name} /></ListItemButton >
              </ListItem>)}
            </List>
          </Card>
        </Grid>
        <Grid item lg={8} md={12} xl={8} xs={12}>
          <Card>
            <CardHeader
              title='任务编辑'
              action={<IconButton
                size='small'
                onClick={() => plugin.emit('scheduler:update', action, JSON.stringify(tasks))}
                sx={iconStyles}
              ><Save /></IconButton>} />
            <Divider />
            <CardContent>
              {tasks[id] ? <></> : <Empty title='请先在左侧选择一个任务!' />}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  </Box>
}

export default Scheduler
