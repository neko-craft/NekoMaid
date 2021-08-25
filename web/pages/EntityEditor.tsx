import React, { useState, useEffect } from 'react'
import ItemViewer, { Item, InvType } from '../components/ItemViewer'
import lang, { minecraft } from '../../languages'
import { parse, stringify } from 'nbt-ts'
import { UnControlled } from 'react-codemirror2'
import { useTheme } from '@material-ui/core/styles'
import { Refresh, ExpandMore, Save } from '@material-ui/icons'
import { Box, Toolbar, Container, Grid, Card, CardHeader, Divider, IconButton, Button,
  CardContent, TextField, Accordion, AccordionSummary, FormControlLabel, Switch,
  Typography, AccordionDetails } from '@material-ui/core'
import { useHistory, useLocation } from 'react-router-dom'
import { useDrawerWidth, useGlobalData, usePlugin } from '../Context'
import { cardActionStyles } from '../theme'
import { action, success, failed } from '../toast'

interface Entity {
  type: string
  nbt?: string
  inventory?: Item[]
  inventoryType?: string
  customName?: string
  customNameVisible: boolean
  glowing: boolean
  gravity: boolean
  invulnerable: boolean
  silent: boolean
}

const REGEXP = /^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/i

const EntitySelector: React.FC = () => {
  const his = useHistory()
  const [id, setId] = useState('')
  const error = REGEXP.test(id) ? undefined : lang.invalidValue
  return <Box sx={{ display: 'flex', alignItems: 'center' }}>
    <TextField
      error={!!error}
      helperText={error}
      variant='standard'
      label='UUID'
      value={id}
      onChange={e => setId(e.target.value)} sx={{ flex: '1' }}
    />
    <Button
      disabled={!!error}
      variant='contained'
      sx={{ height: 36 }}
      onClick={() => his.push('/NekoMaid/entity/' + id)}
    >{minecraft['gui.done']}</Button>
  </Box>
}

const values = ['customNameVisible', 'glowing', 'gravity', 'invulnerable', 'silent']

const EntityEditor: React.FC = () => {
  const theme = useTheme()
  const plugin = usePlugin()
  const his = useHistory()
  const loc = useLocation()
  const globalData = useGlobalData()
  const drawerWidth = useDrawerWidth()
  const [customName, setCustomName] = useState('')
  const [entity, setEntity] = useState<Entity>()
  let id: string | null = null
  if (loc.pathname.startsWith('/NekoMaid/entity/')) {
    const arr = loc.pathname.split('/')
    if (arr.length > 3) id = arr[3]
  }
  useEffect(() => {
    const off = plugin.on('entity:select', id => his.push('/NekoMaid/entity/' + id))
    return () => void off()
  }, [])
  const update = () => {
    if (id) {
      plugin.emit('entity:fetch', (entity: Entity) => {
        if (!entity) {
          failed()
          his.push('/NekoMaid/entity')
          return
        }
        if (globalData.hasNBTAPI && entity.nbt) entity.nbt = stringify(parse(entity.nbt), { pretty: true })
        setCustomName(entity.customName || '')
        setEntity(entity)
      }, id)
    }
  }
  const updateWithAction = (res: boolean) => {
    action(res)
    update()
  }
  useEffect(update, [id])
  return <Box sx={{ minHeight: '100%', py: 3 }}>
    <Toolbar />
    <Container maxWidth={false}>
      <Grid container spacing={3} sx={{ width: { sm: `calc(100vw - ${drawerWidth}px - ${theme.spacing(3)})` } }}>
        <Grid item lg={6} md={12} xl={6} xs={12}>
          <Card>
            <CardHeader
              title={(entity && minecraft['entity.minecraft.' + entity.type.toLowerCase()]) || lang.entityEditor.title}
              sx={{ position: 'relative' }}
              action={<Box sx={cardActionStyles}>
                <IconButton
                  size='small'
                  disabled={!entity}
                  onClick={() => entity && plugin.emit('entity:save', (res: boolean) => {
                    action(res)
                    update()
                  }, id, entity.nbt || null, customName || null)}
                ><Save /></IconButton>
                <IconButton
                  size='small'
                  disabled={!entity}
                  onClick={() => {
                    update()
                    success()
                  }}
                ><Refresh /></IconButton>
              </Box>}
            />
            <Divider />
            {entity
              ? <>
                <CardContent>
                  <Grid container>
                    <Grid item lg={6} md={6} xl={6} xs={12}>
                      <TextField
                        size='small'
                        label={lang.entityEditor.customName}
                        value={customName}
                        sx={{ width: '90%' }}
                        onChange={e => setCustomName(e.target.value)}
                      />
                    </Grid>
                    {values.map(it => <Grid item lg={6} md={6} xl={6} xs={12} key={it}>
                      <FormControlLabel
                        control={<Switch checked={(entity as any)[it]} />}
                        label={(lang.entityEditor as any)[it]}
                        onChange={(e: any) => plugin.emit('entity:set', (res: boolean) => {
                          action(res)
                          update()
                        }, id, it, e.target.checked)}
                      />
                    </Grid>)}
                  </Grid>
                </CardContent>
                {entity.nbt != null && <Accordion sx={{ '&::before': { opacity: '1!important' } }} disableGutters>
                  <AccordionSummary expandIcon={<ExpandMore />}><Typography>NBT</Typography></AccordionSummary>
                  <AccordionDetails sx={{ padding: 0, '& .CodeMirror': { width: '100%', height: 350 } }}>
                    <UnControlled
                      value={entity.nbt}
                      options={{
                        mode: 'javascript',
                        theme: theme.palette.mode === 'dark' ? 'material' : 'one-light'
                      }}
                      onChange={(_: any, __: any, data: string) => (entity.nbt = data)}
                    />
                  </AccordionDetails>
                </Accordion>}
              </>
              : <CardContent><EntitySelector /></CardContent>}
          </Card>
        </Grid>
        {entity?.inventory?.length
          ? <Grid item lg={6} md={12} xl={6} xs={12}>
            <Card>
              <CardHeader
                title={lang.entityEditor.container}
                sx={{ position: 'relative' }}
              />
              <Divider />
              <CardContent sx={{ whiteSpace: 'nowrap', overflowX: 'auto', textAlign: 'center' }}>
                {entity.inventory.map((it, i) => <React.Fragment key={i}><ItemViewer
                  item={it}
                  data={{ type: InvType.ENTITY, solt: i, id }}
                  onDrag={() => plugin.emit('entity:setItem', update, id, i, null, -1)}
                  onDrop={(item, obj) => plugin.emit('entity:setItem', update, id, i, JSON.stringify(item),
                    obj?.type === InvType.ENTITY && obj.id === id ? obj.solt : -1)}
                  onEdit={item => item !== false && plugin.emit('entity:setItem', updateWithAction, id, i, item && JSON.stringify(item), -1)}
                />{!((i + 1) % 9) && <br />}</React.Fragment>)}
              </CardContent>
            </Card>
          </Grid>
          : undefined}
      </Grid>
    </Container>
  </Box>
}

export default EntityEditor
