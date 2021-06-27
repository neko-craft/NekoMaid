import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import React from 'react'
import ReactDom from 'react-dom'
import ServerSwitch from './components/ServerSwitch'
import createCache from '@emotion/cache'
import { newInstance } from 'reqwq'
import { CacheProvider } from '@emotion/react'
import { HashRouter } from 'react-router-dom'
import { zhCN } from '@material-ui/core/locale/index'
import { createTheme, ThemeProvider } from '@material-ui/core/styles'

import url from './url'
import App from './App'

const theme = createTheme(zhCN)

const Provider = newInstance()

ReactDom.render(<CacheProvider value={createCache({ key: 'nm', stylisPlugins: [] })}>
  <ThemeProvider theme={theme}>
    {url
      ? <Provider><HashRouter><App /></HashRouter></Provider>
      : <ServerSwitch />}
  </ThemeProvider>
</CacheProvider>, document.getElementById('app'))
