import React, { useState, useEffect } from 'react'
import { action, success } from '../toast'
import { Delete, Add, Save } from '@material-ui/icons'
import { Box, Toolbar, Container, Grid, Card, CardHeader, Divider, List, ListItemButton, Checkbox, ListItemIcon,
  ListItem, IconButton, ListItemText, Tooltip, CardContent, TextField, Paper } from '@material-ui/core'
import { usePlugin } from '../Context'
import Empty from '../components/Empty'
import Cron from 'material-ui-cron'
import dialog from '../dialog'

interface Task { name: string, cron: string, values: string[], enabled: boolean }
const iconStyles: any = { position: 'absolute', right: (theme: any) => theme.spacing(1), top: '50%', transform: 'translateY(-50%)' }
const Scheduler: React.FC = () => {
  const plugin = usePlugin()
  const [id, setId] = useState(-1)
  let [tasks, setTasks] = useState<Task[]>([])
  const [name, setName] = useState('')
  const [cron, setCron] = useState('')
  const [values, setValues] = useState('')
  const [cronError, setCronError] = useState('')
  const save = () => plugin.emit('scheduler:update', (res: boolean) => {
    action(res)
    plugin.emit('scheduler:fetch', setTasks)
  }, JSON.stringify(tasks))
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
                  const task = {
                    name: '新任务',
                    cron: '*/1 * * * *',
                    enabled: true,
                    values: ['/say Hello, %server_tps% (PlaceholderAPI)', 'This is a chat message']
                  }
                  setTasks([...tasks, task])
                  setId(tasks.length)
                  setCronError('')
                  setCron(task.cron)
                  setName(task.name)
                  setValues(task.values.join('\n'))
                }}
                sx={iconStyles}
              ><Add /></IconButton>}
            />
            <Divider />
            {tasks.length
              ? <List
                sx={{ width: '100%' }}
                component='nav'
              >
                {tasks.map((it, i) => <ListItem
                  key={i}
                  disablePadding
                  secondaryAction={<IconButton
                    edge='end'
                    onClick={() => dialog('确认要删除这个任务吗?')
                      .then(it => {
                        if (it == null) return
                        setTasks((tasks = tasks.filter((_, id) => i !== id)))
                        save()
                      })}
                  ><Delete /></IconButton>}
                  sx={{ position: 'relative' }}
                >
                  <ListItemIcon sx={{ paddingLeft: 2, position: 'absolute' }}>
                    <Checkbox
                      edge='start'
                      checked={it.enabled}
                      tabIndex={-1}
                    />
                  </ListItemIcon>
                  <ListItemButton onClick={() => {
                    setId(i)
                    setCronError('')
                    setCron(tasks[i].cron)
                    setName(tasks[i].name)
                    setValues(tasks[i].values.join('\n'))
                  }}><ListItemText inset primary={it.name} /></ListItemButton >
                </ListItem>)}
              </List>
              : <CardContent><Empty /></CardContent>}
          </Card>
        </Grid>
        <Grid item lg={8} md={12} xl={8} xs={12}>
          <Card>
            <CardHeader
              title='任务编辑'
              sx={{ position: 'relative' }}
              action={<IconButton
                size='small'
                onClick={() => {
                  tasks[id].values = values.split('\n')
                  tasks[id].cron = cron
                  tasks[id].name = name
                  save()
                }}
                sx={iconStyles}
                disabled={!tasks[id] || !!cronError}
              ><Save /></IconButton>} />
            <Divider />
            <CardContent>
              {tasks[id]
                ? <>
                  <TextField required fullWidth variant='standard' label='任务名' value={name} onChange={e => setName(e.target.value)} />
                  <TextField
                    label='命令、文本信息'
                    fullWidth
                    multiline
                    rows={4}
                    value={values}
                    sx={{ marginTop: 3 }}
                    onChange={e => setValues(e.target.value)}
                  />
                </>
                : <Empty title='请先在左侧选择一个任务!' />}
            </CardContent>
            {tasks[id] && <>
              <Divider textAlign='left'>定时器</Divider>
              <CardContent>
                <Box sx={{
                  '& .MuiTextField-root': { backgroundColor: 'inherit!important' },
                  '& .MuiOutlinedInput-input': { color: 'inherit!important' },
                  '& .MuiTypography-h6': { color: theme => theme.palette.primary.main + '!important' }
                }}>
                  <Cron cron={cron} setCron={setCron} setCronError={setCronError} isAdmin />
                </Box>
              </CardContent>
            </>}
          </Card>
        </Grid>
      </Grid>
    </Container>
  </Box>
}

export default Scheduler
