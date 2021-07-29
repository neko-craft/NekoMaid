import React, { useEffect, useMemo, useState } from 'react'
import * as colors from '@material-ui/core/colors'
import socketIO from 'socket.io-client'
import darkScrollbar from '@material-ui/core/darkScrollbar'
import { zhCN } from '@material-ui/core/locale/index'
import { useLocation, Route, NavLink, useHistory } from 'react-router-dom'
import { Divider, Box, List, ListItem, ListItemIcon, ListItemText, CssBaseline, AppBar,
  Typography, Drawer, Toolbar, IconButton, useMediaQuery } from '@material-ui/core'
import { createTheme, ThemeProvider, alpha } from '@material-ui/core/styles'

import { Build, Menu, Brightness4, Brightness7, Translate, Backpack } from '@material-ui/icons'
import { address, origin, token, pathname } from './url'
import toast, { Snackbars } from './toast'
import { typography } from './theme'
import { version } from '../package.json'
import { GlobalItems } from './components/ItemEditor'
import { pluginCtx, globalCtx } from './Context'
import dialog, { DialogWrapper } from './dialog'
import Plugin, { GlobalInfo, Page } from './Plugin'
import initPages, { onGlobalDataReceived } from './pages/index'

import type { ServerRecord } from './types'

export let pages: Record<string, Page[]> = { }

export let update: React.Dispatch<number>

const drawerWidth = 240

const encrypt = (str: string) => {
  const ua = navigator.userAgent
  let len = ua.length
  let data = ''
  for (let i = 0; i < str.length; i++) data += String.fromCharCode(str.charCodeAt(i) ^ (--len >= 0 ? ua.charCodeAt(len) : i + 66))
  return btoa(data)
}

let sent = false
const App: React.FC<{ darkMode: boolean, setDarkMode: (a: boolean) => void }> = ({ darkMode, setDarkMode }) => {
  const loc = useLocation()
  const his = useHistory()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [globalItemsOpen, setGlobalItemsOpen] = useState(false)
  const [globalData, setGlobalData] = useState<GlobalInfo>({ } as any)
  update = useState(0)[1]
  const create = useMemo(() => {
    const io = socketIO(origin!, { path: pathname!, auth: { token: encrypt(token!) } })
    const map: Record<string, Plugin> = { }
    const fn = (name: string) => map[name] || (map[name] = new Plugin(io, name))
    const nekoMaid = fn('NekoMaid')
    io.on('globalData', data => {
      const his: ServerRecord[] = JSON.parse(localStorage.getItem('NekoMaid:servers') || '[]')
      const curAddress = address!.replace('http://', '') + '?' + token
      let cur = his.find(it => it.address === curAddress)
      if (!cur) his.push((cur = { address: curAddress, time: 0 }))
      cur.time = Date.now()
      cur.icon = data.icon
      const arr = loc.pathname.split('/')
      if (!sent && arr.length > 2) io.emit('switchPage', arr[1], arr[2])
      sent = true
      localStorage.setItem('NekoMaid:servers', JSON.stringify(his))
      Object.entries(data.plugins as Record<string, string>).forEach(([name, file]) => import(file).then(plugin => plugin(fn(name))).catch(console.error))
      setGlobalData(data)
      pages = { }
      initPages(nekoMaid)
      onGlobalDataReceived(nekoMaid, data)
      update(Math.random())
      if (data.pluginVersion !== version) toast('发现插件更新! 推荐立即更新!', 'warning')
    }).on('!', () => {
      io.close()
      dialog('密钥错误!').then(() => (location.href = '//maid.neko-craft.com'))
    })
    return fn
  }, [])
  useEffect(() => { if (!loc.pathname || loc.pathname === '/') his.replace('/NekoMaid/dashboard') }, [loc.pathname])
  useEffect(() => () => { update = undefined as any }, [])

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen)

  const routes: JSX.Element[] = []
  const mapToItem = (name: string, it: Page) => {
    const path = Array.isArray(it.path) ? it.path[0] : it.path
    const key = '/' + name + '/' + path
    routes.push(<pluginCtx.Provider key={key} value={create(name)}>
      <Route
        path={Array.isArray(it.path) ? it.path.map(it => '/' + name + '/' + it) : key}
        component={it.component}
        strict={it.strict}
        exact={it.exact}
        sensitive={it.sensitive}
      />
    </pluginCtx.Provider>)
    return <NavLink key={key} to={'/' + name + '/' + (it.url || path)} activeClassName='actived'>
      <ListItem button>
        <ListItemIcon>{it.icon || <Build />}</ListItemIcon>
        <ListItemText primary={it.title} />
      </ListItem>
    </NavLink>
  }

  const singlePages: JSX.Element[] = []
  const multiPagesPages: Array<JSX.Element | JSX.Element[]> = []
  let index = 0
  for (const name in pages) {
    if (pages[name].length === 1) singlePages.push(mapToItem(name, pages[name][0]))
    else {
      if (multiPagesPages.length) multiPagesPages.push(<Divider key={index++} />)
      multiPagesPages.push(pages[name].map(it => mapToItem(name, it)))
    }
  }
  if (singlePages.length) multiPagesPages.push(<Divider key={index++} />, singlePages)

  const drawer = (
    <div>
      <Toolbar />
      <Divider sx={{ display: { sm: 'none', xs: 'block' } }} />
      <List sx={{
        '& a': {
          color: 'inherit',
          textDecoration: 'inherit'
        },
        '& .actived > div': {
          fontWeight: 'bold',
          color: theme => theme.palette.primary.main,
          backgroundColor: theme => alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity) + '!important',
          '& svg': { color: theme => theme.palette.primary.main + '!important' }
        }
      }}>{multiPagesPages.flat()}</List>
    </div>
  )

  return <Box sx={{ display: 'flex' }}>
    <CssBaseline />
    <AppBar position='fixed' sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton
          color='inherit'
          aria-label='open drawer'
          edge='start'
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <Menu />
        </IconButton>
        <Typography variant='h3' noWrap component='div' sx={{ flexGrow: 1 }}>NekoMaid</Typography>
        {globalData.hasNBTAPI && <IconButton
          color='inherit'
          onClick={() => setGlobalItemsOpen(!globalItemsOpen)}
          onDragOver={() => setGlobalItemsOpen(true)}
        ><Backpack /></IconButton>}
        <IconButton color='inherit'><Translate /></IconButton>
        <IconButton color='inherit' edge='end' onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
      </Toolbar>
    </AppBar>
    <Box component='nav' sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
      <Drawer
        variant='temporary'
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            backgroundImage: theme => theme.palette.mode === 'dark' ? 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))' : undefined
          }
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant='permanent'
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            backgroundImage: theme => theme.palette.mode === 'dark' ? 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))' : undefined
          }
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
    <Box component='main' sx={{ flexGrow: 1, width: '100vw' }}>
      <globalCtx.Provider value={globalData}>
        {routes}
        <GlobalItems open={globalItemsOpen} onClose={() => setGlobalItemsOpen(false)} />
      </globalCtx.Provider>
    </Box>
  </Box>
}

const AppWrap: React.FC = () => {
  const isDark = useMediaQuery('(prefers-color-scheme: dark)')
  const mode = localStorage.getItem('NekoMaid:colorMode')
  const [darkMode, setDarkMode] = useState(mode ? mode === 'dark' : isDark)
  const primary = (colors as any)[localStorage.getItem('NekoMaid:color') || 'blue']
  ;(document.getElementById('theme-color-meta') as HTMLMetaElement)?.setAttribute('content', primary[500])
  const theme = React.useMemo(() => createTheme({
    typography,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: darkMode ? darkScrollbar() : null
        }
      }
    },
    palette: {
      primary,
      mode: darkMode ? 'dark' : 'light',
      background: darkMode ? { default: '#212121', paper: '#212121' } : { default: '#f4f6f8', paper: '#ffffff' }
    }
  }, zhCN), [darkMode])
  return <ThemeProvider theme={theme}>
    <DialogWrapper />
    <Snackbars />
    <App darkMode={darkMode} setDarkMode={setDarkMode} />
  </ThemeProvider>
}

export default AppWrap
