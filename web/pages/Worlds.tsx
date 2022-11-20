import React, { useEffect, useState } from 'react'
import Empty from '../components/Empty'
import dialog from '../dialog'
import { success } from '../toast'
import { Countdown } from '../components/Uptime'
import { usePlugin, useGlobalData } from '../Context'
import { cardActionStyles } from '../theme'
import { lang, minecraft } from '../../languages'

import Grid from '@mui/material/Grid'
import Toolbar from '@mui/material/Toolbar'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import TableContainer from '@mui/material/TableContainer'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Checkbox from '@mui/material/Checkbox'
import CardContent from '@mui/material/CardContent'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Collapse from '@mui/material/Collapse'
import Switch from '@mui/material/Switch'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
  
import WbSunny from '@mui/icons-material/WbSunny'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import Save from '@mui/icons-material/Save'
import Edit from '@mui/icons-material/Edit'
import WeatherRainy from 'mdi-material-ui/WeatherRainy'
import WeatherLightningRainy from 'mdi-material-ui/WeatherLightningRainy'

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
    if (data.length) setSelected(old => data.some(it => it.id === old) ? old : '')
  })
  useEffect(() => {
    const offUpdate = plugin.on('worlds:update', update)
    update()
    return () => { offUpdate() }
  }, [])
  const sw = worlds.find(it => it.id === selected)
  const getSwitch = (name: string, configId = name) => sw
    ? <ListItem
      secondaryAction={<Switch disabled={!globalData.hasMultiverse} checked={(sw as any)[name]}
      onChange={e => {
        plugin.emit('worlds:set', sw.id, configId, e.target.checked.toString())
        success()
      }}
    />}><ListItemText primary={(lang.worlds as any)[name]} /></ListItem>
    : null

  return <Box sx={{ minHeight: '100%', py: 3 }}>
    <Toolbar />
    <Container maxWidth={false}>
      <Grid container spacing={3}>
        <Grid item lg={8} md={12} xl={9} xs={12}>
        <Card>
          <CardHeader title={lang.worlds.title} />
          <Divider />
          <Box sx={{ position: 'relative' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding='checkbox' />
                    <TableCell>{lang.worlds.name}</TableCell>
                    {globalData.hasMultiverse && <TableCell>{lang.worlds.alias}</TableCell>}
                    <TableCell>{lang.worlds.players}</TableCell>
                    <TableCell>{lang.worlds.chunks}</TableCell>
                    <TableCell>{lang.worlds.entities}</TableCell>
                    <TableCell>{lang.worlds.tiles}</TableCell>
                    <TableCell>{lang.worlds.time}</TableCell>
                    <TableCell>{lang.worlds.weather}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {worlds.map(it => <TableRow key={it.id}>
                    <TableCell padding='checkbox'><Checkbox checked={selected === it.id} onClick={() => setSelected(it.id)} /></TableCell>
                    <TableCell><Tooltip title={it.id}><span>{it.name}</span></Tooltip></TableCell>
                    {globalData.hasMultiverse && <TableCell>{it.alias}
                      <IconButton size='small' onClick={() => dialog(lang.inputValue, lang.worlds.alias).then(res => {
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
                      {React.createElement((it.weather === 1 ? WeatherRainy : it.weather === 2 ? WeatherLightningRainy : WbSunny) as any)}
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
              title={lang.operations}
              sx={{ position: 'relative' }}
              action={<Tooltip title={lang.worlds.save} placement='left'>
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
                  {getSwitch('allowAnimals', 'spawning.animals.spawn')}
                  {getSwitch('allowMonsters', 'spawning.monsters.spawn')}
                  {globalData.hasMultiverse && <>
                    {getSwitch('allowFlight')}
                    {getSwitch('autoHeal')}
                    {getSwitch('hunger')}
                  </>}
                  <ListItem secondaryAction={globalData.canSetViewDistance
                    ? <IconButton
                      onClick={() => dialog({
                        content: lang.inputValue,
                        input: {
                          error: true,
                          type: 'number',
                          helperText: lang.invalidValue,
                          validator: (it: string) => /^\d+$/.test(it) && +it > 1 && +it < 33
                        }
                      }).then(res => {
                        if (!res) return
                        plugin.emit('worlds:viewDistance', sw.id, parseInt(res as any))
                        success()
                      })}
                    ><Edit /></IconButton>
                    : undefined}>
                    <ListItemText primary={lang.worlds.viewDistance + ': ' + sw.viewDistance} />
                  </ListItem>
                  <ListItem><ListItemText primary={minecraft['selectWorld.enterSeed']} secondary={sw.seed} /></ListItem>
                  <ListItemButton onClick={() => setOpen(!open)}>
                    <ListItemText primary={minecraft['selectWorld.gameRules']} />
                    {open ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                  <Collapse in={open} timeout='auto' unmountOnExit>
                    <List component='div' dense disablePadding>
                      {sw.rules.map(([key, value]) => {
                        const isTrue = value === 'true'
                        const isBoolean = isTrue || value === 'false'
                        const isNumber = /^\d+$/.test(value)
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
                                content: lang.inputValue,
                                input: isNumber
                                  ? {
                                      error: true,
                                      type: 'number',
                                      helperText: lang.invalidValue,
                                      validator: (it: string) => /^\d+$/.test(it)
                                    }
                                  : { }
                              }).then(res => {
                                if (res == null) return
                                plugin.emit('worlds:rule', sw.id, key, res)
                                success()
                              })}
                            ><Edit /></IconButton>}
                        >
                          <ListItemText primary={(minecraft['gamerule.' + key] || key) + (isBoolean ? '' : ': ' + value)} />
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
