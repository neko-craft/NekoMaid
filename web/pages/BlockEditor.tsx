import React, { useState, useEffect } from 'react'
import ItemViewer, { getName, Item, InvType } from '../components/ItemViewer'
import lang, { minecraft } from '../../languages'
import { parse, stringify } from 'nbt-ts'
import { UnControlled } from 'react-codemirror2'
import { useTheme } from '@mui/material/styles'
import { Refresh, ExpandMore, Save } from '@mui/icons-material'
import { Box, Toolbar, Container, Grid, Card, CardHeader, Divider, IconButton, Autocomplete, Button,
  CardContent, TextField, Select, FormControl, InputLabel, MenuItem, Accordion, AccordionSummary,
  Typography, AccordionDetails } from '@mui/material'
import { useHistory, useLocation } from 'react-router-dom'
import { useDrawerWidth, useGlobalData, usePlugin } from '../Context'
import { cardActionStyles } from '../theme'
import { action, failed, success } from '../toast'
import Empty from '../components/Empty'

interface Block {
  type: string
  data?: string
  nbt?: string
  inventory?: Item[]
  inventoryType?: string
}

const compare = (obj: any, params: any) => obj && obj.type === InvType.BLOCK && obj.world === params.world && obj.x === params.x &&
  obj.y === params.y && obj?.z === params.z

const BlockSelector: React.FC<{ worlds: string[] }> = ({ worlds }) => {
  const his = useHistory()
  const [world, setWorld] = useState(worlds[0])
  const [x, setX] = useState('0')
  const [y, setY] = useState('0')
  const [z, setZ] = useState('0')
  return <Grid container>
    <Grid item xs={6}>
      <FormControl variant='standard' fullWidth>
        <InputLabel id='nekomaid-block-editor-world'>{lang.world}</InputLabel>
        <Select
          labelId='nekomaid-block-editor-world'
          value={world}
          label={lang.world}
          onChange={e => setWorld(e.target.value)}
        >
          {worlds.map(it => <MenuItem key={it} value={it}>{it}</MenuItem>)}
        </Select>
      </FormControl>
    </Grid>
    <Grid item xs={2}><TextField variant='standard' label='X' type='number' fullWidth value={x} onChange={e => setX(e.target.value)} /></Grid>
    <Grid item xs={2}><TextField variant='standard' label='Y' type='number' fullWidth value={y} onChange={e => setY(e.target.value)} /></Grid>
    <Grid item xs={2}><TextField variant='standard' label='Z' type='number' fullWidth value={z} onChange={e => setZ(e.target.value)} /></Grid>
    <Grid item xs={12} sx={{ marginTop: 3, textAlign: 'center' }}>
      <Button
        variant='contained'
        onClick={() => his.push(`/NekoMaid/block/${world}/${parseFloat(x) | 0}/${parseFloat(y) | 0}/${parseFloat(z) | 0}`)}
      >{minecraft['gui.done']}</Button>
    </Grid>
  </Grid>
}

const BlockEditor: React.FC = () => {
  const theme = useTheme()
  const plugin = usePlugin()
  const his = useHistory()
  const loc = useLocation()
  const globalData = useGlobalData()
  const drawerWidth = useDrawerWidth()
  const [block, setBlock] = useState<Block>()
  const [types, setTypes] = useState<string[]>([])
  const [worlds, setWorlds] = useState<string[]>([])
  const params = { world: '', x: 0, y: 0, z: 0 }
  if (loc.pathname.startsWith('/NekoMaid/block/')) {
    const arr = loc.pathname.split('/')
    if (arr.length > 6) {
      params.world = arr[3]
      params.x = +arr[4]
      params.y = +arr[5]
      params.z = +arr[6]
    } else his.push('/NekoMaid/block')
  }
  useEffect(() => {
    const off = plugin.emit('item:blocks', (types: string[], worlds: string[]) => {
      setTypes(types)
      setWorlds(worlds)
    })
      .on('block:select', (world, x, y, z) => his.push(`/NekoMaid/block/${world}/${x}/${y}/${z}`))
    return () => void off()
  }, [])
  const update = () => {
    if (params.world) {
      plugin.emit('block:fetch', (block: Block) => {
        if (!block) {
          failed()
          his.push('/NekoMaid/block')
          return
        }
        if (globalData.hasNBTAPI && block.nbt) block.nbt = stringify(parse(block.nbt), { pretty: true })
        setBlock(block)
      }, params.world, params.x, params.y, params.z)
    }
  }
  const updateWithAction = (res: boolean) => {
    action(res)
    update()
  }
  useEffect(update, [params.world, params.x, params.y, params.z])
  return <Box sx={{ minHeight: '100%', py: 3 }}>
    <Toolbar />
    <Container maxWidth={false}>
      <Grid container spacing={3} sx={{ width: { sm: `calc(100vw - ${drawerWidth}px - ${theme.spacing(3)})` } }}>
        <Grid item lg={6} md={12} xl={6} xs={12}>
          <Card sx={{ '& .CodeMirror-dialog, .CodeMirror-scrollbar-filler': { backgroundColor: theme.palette.background.paper + '!important' } }}>
            <CardHeader
              title={lang.blockEditor.title}
              sx={{ position: 'relative' }}
              action={<Box sx={cardActionStyles}>
                <IconButton
                  size='small'
                  disabled={!block || (!block.data && !block.nbt)}
                  onClick={() => block && plugin.emit('block:save', (res: boolean) => {
                    action(res)
                    update()
                  }, params.world, params.x, params.y, params.z, block.nbt || null, block.data || null)}
                ><Save /></IconButton>
                <IconButton
                  size='small'
                  disabled={!block}
                  onClick={() => {
                    update()
                    success()
                  }}
                ><Refresh /></IconButton>
              </Box>}
            />
            <Divider />
            {block
              ? <>
                <CardContent sx={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
                  <ItemViewer item={{ type: block.type }} />
                  <Autocomplete
                    options={types}
                    sx={{ maxWidth: 300, marginLeft: 1, flexGrow: 1 }}
                    value={block.type}
                    onChange={(_, it) => it && plugin.emit('block:type', (res: boolean) => {
                      action(res)
                      update()
                    }, params.world, params.x, params.y, params.z, (block.type = it))}
                    getOptionLabel={it => getName(it.toLowerCase()) + ' ' + it}
                    renderInput={(params) => <TextField {...params} label={lang.itemEditor.itemType} size='small' variant='standard' />}
                  />
                </CardContent>
                {block.data != null && <Accordion sx={{ '&::before': { opacity: '1!important' } }} disableGutters>
                  <AccordionSummary expandIcon={<ExpandMore />}><Typography>{lang.data}</Typography></AccordionSummary>
                  <AccordionDetails sx={{ padding: 0, '& .CodeMirror': { width: '100%', height: 350 } }}>
                    <UnControlled
                      value={block.data}
                      options={{
                        mode: 'javascript',
                        phrases: lang.codeMirrorPhrases,
                        theme: theme.palette.mode === 'dark' ? 'material' : 'one-light'
                      }}
                      onChange={(_: any, __: any, data: string) => (block.data = data)}
                    />
                  </AccordionDetails>
                </Accordion>}
                {block.nbt != null && <Accordion sx={{ '&::before': { opacity: '1!important', display: '!important' } }} disableGutters>
                  <AccordionSummary expandIcon={<ExpandMore />}><Typography>NBT</Typography></AccordionSummary>
                  <AccordionDetails sx={{ padding: 0, '& .CodeMirror': { width: '100%', height: 350 } }}>
                    <UnControlled
                      value={block.nbt}
                      options={{
                        mode: 'javascript',
                        phrases: lang.codeMirrorPhrases,
                        theme: theme.palette.mode === 'dark' ? 'material' : 'one-light'
                      }}
                      onChange={(_: any, __: any, data: string) => (block.nbt = data)}
                    />
                  </AccordionDetails>
                </Accordion>}
              </>
              : <CardContent>{worlds.length ? <BlockSelector worlds={worlds} /> : <Empty />}</CardContent>}
          </Card>
        </Grid>
        {block?.inventory?.length
          ? <Grid item lg={6} md={12} xl={6} xs={12}>
            <Card>
              <CardHeader
                title={minecraft[('container.' + block.inventoryType || '').toLowerCase()] || lang.blockEditor.container}
                sx={{ position: 'relative' }}
              />
              <Divider />
              <CardContent sx={{ whiteSpace: 'nowrap', overflowX: 'auto', textAlign: 'center' }}>
                {block.inventory.map((it, i) => <React.Fragment key={i}><ItemViewer
                  item={it}
                  data={{ type: InvType.BLOCK, solt: i, ...params }}
                  onDrag={() => plugin.emit('block:setItem', update, params.world, params.x, params.y, params.z, i, null, -1)}
                  onDrop={(item, obj) => plugin.emit('block:setItem', update, params.world, params.x, params.y, params.z, i,
                    JSON.stringify(item), compare(obj, params) ? obj.solt : -1)}
                  onEdit={item => item !== false && plugin.emit('block:setItem', updateWithAction, params.world, params.x, params.y,
                    params.z, i, item && JSON.stringify(item), -1)}
                />{!((i + 1) % 9) && <br />}</React.Fragment>)}
              </CardContent>
            </Card>
          </Grid>
          : undefined}
      </Grid>
    </Container>
  </Box>
}

export default BlockEditor
