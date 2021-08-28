import React, { useState, useEffect } from 'react'
import lang from '../../languages'
import { useGlobalData, usePlugin } from '../Context'
import { PlayArrow, Stop, Equalizer } from '@material-ui/icons'
import { Box, Tabs, Tab, Toolbar, Paper, Fab, Badge } from '@material-ui/core'

export const ProfilerIcon: React.FC = () => {
  const plugin = usePlugin()
  const globalData = useGlobalData()
  const [status, setStatus] = useState(!!globalData.profilerStarted)
  useEffect(() => {
    const off = plugin.on('profiler:status', (res: boolean) => {
      setStatus(globalData.profilerStarted = res)
    })
    return () => { off() }
  })
  return <Badge color='secondary' variant='dot' invisible={!status}><Equalizer /></Badge>
}

const Profiler: React.FC = () => {
  const plugin = usePlugin()
  const globalData = useGlobalData()
  const [tab, setTab] = useState(0)
  const [status, setStatus] = useState(!!globalData.profilerStarted)
  useEffect(() => {
    const off = plugin.on('profiler:status', setStatus)
    return () => { off() }
  })
  return <Box sx={{ minHeight: status ? '100%' : undefined }}>
    {status
      ? <>
        <Toolbar />
        <Paper square variant='outlined' sx={{ margin: '0 -1px' }}>
          <Tabs value={tab} onChange={(_, it) => setTab(it)} variant='scrollable' scrollButtons='auto'>
            <Tab label={lang.profiler.summary} />
            <Tab label='Timings' />
            <Tab label={lang.profiler.entities} />
            <Tab label={lang.profiler.chunks} />
            <Tab label={lang.profiler.heap} />
            <Tab label={lang.profiler.suggestions} />
          </Tabs>
        </Paper>
      </>
      : <Box sx={{ textAlign: 'center', marginTop: '50vh' }}>{lang.profiler.notStarted}</Box>}
    <Fab color='primary' sx={{ position: 'fixed', bottom: { xs: 16, sm: 40 }, right: { xs: 16, sm: 40 } }} onClick={() => {
      plugin.emit('profiler:status', !status)
    }}>
      {status ? <Stop /> : <PlayArrow />}
    </Fab>
  </Box>
}

export default Profiler
