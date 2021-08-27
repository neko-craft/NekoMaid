import React, { useState } from 'react'
import lang from '../../languages'
import { Box, Tabs, Tab, Toolbar, Paper } from '@material-ui/core'

const Profiler: React.FC = () => {
  const [tab, setTab] = useState(0)
  return <Box sx={{ minHeight: '100%' }}>
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
  </Box>
}

export default Profiler
