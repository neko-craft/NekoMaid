import React, { useState, useEffect } from 'react'
import lang from '../../languages'
import { UnControlled } from 'react-codemirror2'
import { useTheme } from '@material-ui/core/styles'
import { Refresh } from '@material-ui/icons'
import { Box, Toolbar, Container, Grid, Card, CardHeader, Divider, IconButton,
  CardContent } from '@material-ui/core'
import { useHistory, useParams } from 'react-router-dom'
import { usePlugin } from '../Context'
import { cardActionStyles } from '../theme'
import { success } from '../toast'

interface Block {
  type: string
  nbt: string
  data: string
}
const BlockEditor: React.FC = () => {
  const theme = useTheme()
  const plugin = usePlugin()
  const his = useHistory()
  const params = useParams<{ world: string, x: string, y: string, z: string }>()
  const [block, setBlock] = useState<Block | undefined>()
  useEffect(() => {
    const off = plugin.on('block:select', (world, x, y, z) => his.push(`/NekoMaid/block/${world}/${x}/${y}/${z}`))
    return () => void off()
  })
  const update = () => { plugin.emit('block:fetch', params.world, params.x, params.y, params.z, setBlock) }
  useEffect(update, [params.world, params.x, params.y, params.z])
  const nbt = block?.nbt
  return <Box sx={{ minHeight: '100%', py: 3 }}>
    <Toolbar />
    <Container maxWidth={false}>
      <Grid container spacing={3}>
        <Grid item lg={6} md={12} xl={6} xs={12}>
          <Card>
            <CardHeader
              title={lang.blockEditor.title}
              sx={{ position: 'relative' }}
              action={<IconButton
                size='small'
                disabled={!block}
                sx={cardActionStyles}
                onClick={() => {
                  update()
                  success()
                }}
              ><Refresh /></IconButton>}
            />
            <Divider />
            <CardContent>
              <Box>{lang.itemEditor.itemType}</Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item lg={6} md={12} xl={6} xs={12}></Grid>
        {nbt && <Grid item lg={6} md={12} xl={6} xs={12}>
          <Box sx={{ '& .CodeMirror': { width: '100%' } }}>
            <UnControlled
              value={nbt}
              options={{
                mode: 'javascript',
                theme: theme.palette.mode === 'dark' ? 'material' : 'one-light'
              }}
              onChange={(_: any, __: any, nbt: string) => {
              }}
            />
          </Box>
        </Grid>
        }
      </Grid>
    </Container>
  </Box>
}

export default BlockEditor
