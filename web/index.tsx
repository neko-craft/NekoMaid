import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import React from 'react'
import ReactDom from 'react-dom'
import ServerSwitch from './components/ServerSwitch'
import { newInstance } from 'reqwq'
import { HashRouter } from 'react-router-dom'
import { zhCN } from '@material-ui/core/locale/index'
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles'

import url from './url'
import App from './App'

const theme = createMuiTheme({
}, zhCN)

const Provider = newInstance()

ReactDom.render(<ThemeProvider theme={theme}>
  {url
    ? <Provider><HashRouter><App /></HashRouter></Provider>
    : <ServerSwitch />}
</ThemeProvider>, document.getElementById('app'))
