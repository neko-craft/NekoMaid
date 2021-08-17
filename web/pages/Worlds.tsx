import React, { useEffect, useState } from 'react'
import Empty from '../components/Empty'
import dialog from '../dialog'
import { success } from '../toast'
import { Countdown } from '../components/Uptime'
import { usePlugin, useGlobalData } from '../Context'
import { WbSunny, ExpandLess, ExpandMore, Save, Edit } from '@material-ui/icons'
import { WeatherRainy, WeatherLightningRainy } from 'mdi-material-ui'
import { cardActionStyles } from '../theme'
import { minecraft } from '../../languages'
import { Grid, Toolbar, Card, CardHeader, Divider, Box, Container, TableContainer, Table, TableBody,
  TableHead, TableRow, TableCell, Tooltip, IconButton, Checkbox, CardContent, List, ListItem,
  ListItemButton, ListItemText, Collapse, Switch, ToggleButtonGroup, ToggleButton } from '@material-ui/core'

interface World {
  rules: Array<[string, string]>
  name: string
  id: string
  difficulty: string
  alias: string
  entities: number
  chunks: number
  tiles: number
  players: number
  weather: 0 | 1 | 2
  viewDistance: number
  time: number
  seed: number
  allowMonsters: boolean
  allowAnimals: boolean
  pvp: boolean
  allowFlight: boolean
  autoHeal: boolean
  hunger: boolean
}

const difficulties = ['peaceful', 'easy', 'normal', 'hard']

const Worlds: React.FC = () => {
  const plugin = usePlugin()
  const globalData = useGlobalData()
  const [worlds, setWorlds] = useState<World[]>([])
  const [selected, setSelected] = useState('')
  const [open, setOpen] = useState(false)
  const update = () => plugin.emit('worlds:fetch', (data: World[]) => {
    setWorlds(data)
    if (data.length) setSelected(data[0].id)
  })
  useEffect(() => {
    const offUpdate = plugin.on('worlds:update', update)
    update()
    return () => { offUpdate() }
  }, [])
  const sw = worlds.find(it => it.id === selected)
  return <Box sx={{ minHeight: '100%', py: 3 }}>
    <Toolbar />
    <Container maxWidth={false}>
      <Grid container spacing={3}>
        <Grid item lg={8} md={12} xl={9} xs={12}>
        <Card>
          <CardHeader title='世界列表' />
          <Divider />
          <Box sx={{ position: 'relative' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding='checkbox' />
                    <TableCell>世界名</TableCell>
                    {globalData.hasMultiverse && <TableCell>别名</TableCell>}
                    <TableCell>玩家数</TableCell>
                    <TableCell>区块数</TableCell>
                    <TableCell>实体数</TableCell>
                    <TableCell>Tile数</TableCell>
                    <TableCell>时间</TableCell>
                    <TableCell>天气</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {worlds.map(it => <TableRow key={it.id}>
                    <TableCell padding='checkbox'><Checkbox checked={selected === it.id} onClick={() => setSelected(it.id)} /></TableCell>
                    <TableCell><Tooltip title={it.id}><span>{it.name}</span></Tooltip></TableCell>
                    {globalData.hasMultiverse && <TableCell>{it.alias}
                      <IconButton size='small' onClick={() => dialog('请输入新的别名', '别名').then(res => {
                        if (res == null) return
                        plugin.emit('worlds:set', it.id, 'alias', res)
                        success()
                      })}><Edit fontSize='small' /></IconButton>
                      </TableCell>}
                    <TableCell>{it.players}</TableCell>
                    <TableCell>{it.chunks}</TableCell>
                    <TableCell>{it.entities}</TableCell>
                    <TableCell>{it.tiles}</TableCell>
                    <TableCell><Countdown time={it.time} max={24000} interval={50} /></TableCell>
                    <TableCell><IconButton size='small' onClick={() => {
                      plugin.emit('worlds:weather', it.id)
                      success()
                    }}>
                      {React.createElement(it.weather === 1 ? WeatherRainy : it.weather === 2 ? WeatherLightningRainy : WbSunny)}
                    </IconButton></TableCell>
                  </TableRow>)}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Card>
        </Grid>
        <Grid item lg={4} md={6} xl={3} xs={12}>
          <Card>
            <CardHeader
              title='更多操作'
              sx={{ position: 'relative' }}
              action={<Tooltip title='立即保存世界' placement='left'>
                <IconButton
                  size='small'
                  onClick={() => {
                    if (!sw) return
                    plugin.emit('worlds:save', sw.id)
                    success()
                  }}
                  sx={cardActionStyles}
                ><Save /></IconButton>
              </Tooltip>}
            />
            <Divider />
            <Box sx={{ position: 'relative' }}>
              {sw
                ? <List sx={{ width: '100%' }} component='nav'>
                  <ListItem secondaryAction={<ToggleButtonGroup
                    exclusive
                    color='primary'
                    size='small'
                    value={sw.difficulty}
                    onChange={(_, value) => {
                      plugin.emit('worlds:difficulty', sw.id, value)
                      success()
                    }}
                  >
                    {difficulties.map(it => <ToggleButton value={it.toUpperCase()} key={it}>{minecraft['options.difficulty.' + it]}</ToggleButton>)}
                  </ToggleButtonGroup>}><ListItemText primary={minecraft['options.difficulty']} /></ListItem>
                  <ListItem secondaryAction={<Switch checked={sw.pvp} onChange={e => {
                    plugin.emit('worlds:pvp', sw.id, e.target.checked)
                    success()
                  }} />}><ListItemText primary='PVP' /></ListItem>
                  <ListItem secondaryAction={<Switch checked={sw.allowAnimals} disabled={!globalData.hasMultiverse} onChange={e => {
                    plugin.emit('worlds:set', sw.id, 'spawning.animals.spawn', e.target.checked.toString())
                    success()
                  }} />}><ListItemText primary='动物生成' /></ListItem>
                  <ListItem secondaryAction={<Switch checked={sw.allowMonsters} disabled={!globalData.hasMultiverse} onChange={e => {
                    plugin.emit('worlds:set', sw.id, 'spawning.monsters.spawn', e.target.checked.toString())
                    success()
                  }} />}><ListItemText primary='怪物生成' /></ListItem>
                  {globalData.hasMultiverse && <>
                    <ListItem secondaryAction={<Switch checked={sw.allowFlight} onChange={e => {
                      plugin.emit('worlds:set', sw.id, 'allowFlight', e.target.checked.toString())
                      success()
                    }} />}><ListItemText primary='飞行' /></ListItem>
                    <ListItem secondaryAction={<Switch checked={sw.autoHeal} onChange={e => {
                      plugin.emit('worlds:set', sw.id, 'autoHeal', e.target.checked.toString())
                      success()
                    }} />}><ListItemText primary='回血' /></ListItem>
                    <ListItem secondaryAction={<Switch checked={sw.hunger} onChange={e => {
                      plugin.emit('worlds:set', sw.id, 'hunger', e.target.checked.toString())
                      success()
                    }} />}><ListItemText primary='饥饿' /></ListItem>
                  </>}
                  <ListItem secondaryAction={globalData.canSetViewDistance
                    ? <IconButton
                      onClick={() => dialog({
                        content: '请输入要修改的视距',
                        input: {
                          error: true,
                          type: 'number',
                          helperText: '视距不合法!',
                          validator: (it: string) => /^\d+$/.test(it) && +it > 1 && +it < 33
                        }
                      }).then(res => {
                        if (!res) return
                        plugin.emit('worlds:viewDistance', sw.id, parseInt(res as any))
                        success()
                      })}
                    ><Edit /></IconButton>
                    : undefined}>
                    <ListItemText primary={'视距: ' + sw.viewDistance} />
                  </ListItem>
                  <ListItem><ListItemText primary={minecraft['selectWorld.enterSeed']} secondary={sw.seed} /></ListItem>
                  <ListItemButton onClick={() => setOpen(!open)}>
                    <ListItemText primary={minecraft['selectWorld.gameRules']} />
                    {open ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                  <Collapse in={open} timeout="auto" unmountOnExit>
                    <List component='div' dense disablePadding>
                      {sw.rules.map(([key, value]) => {
                        const isTrue = value === 'true'
                        const isBoolean = isTrue || value === 'false'
                        return <ListItem
                          key={key}
                          sx={{ pl: 4 }}
                          secondaryAction={isBoolean
                            ? <Switch
                              checked={isTrue}
                              onChange={e => {
                                plugin.emit('worlds:rule', sw.id, key, e.target.checked.toString())
                                success()
                              }}
                            />
                            : <IconButton
                              onClick={() => dialog({
                                content: '请输入要修改的值',
                                input: {
                                  error: true,
                                  type: 'number',
                                  helperText: '值不合法!',
                                  validator: (it: string) => /^\d+$/.test(it)
                                }
                              }).then(res => {
                                if (res == null) return
                                plugin.emit('worlds:rule', sw.id, key, res)
                                success()
                              })}
                            ><Edit /></IconButton>}
                        >
                          <ListItemText primary={minecraft['gamerule.' + key] + (isBoolean ? '' : ': ' + value)} />
                        </ListItem>
                      })}
                    </List>
                  </Collapse>
                </List>
                : <CardContent><Empty /></CardContent>
              }
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Container>
  </Box>
}

export default Worlds
