import React, { useEffect, useMemo, useState, useRef } from 'react'
import * as colors from '@material-ui/core/colors'
import socketIO from 'socket.io-client'
import darkScrollbar from '@material-ui/core/darkScrollbar'
import { zhCN } from '@material-ui/core/locale/index'
import { useLocation, Route, NavLink, useHistory } from 'react-router-dom'
import { Divider, Box, List, ListItem, ListItemIcon, ListItemText, CssBaseline, AppBar, MenuItem, Tooltip,
  Typography, Drawer, Toolbar, IconButton, useMediaQuery, Menu as MenuComponent } from '@material-ui/core'
import { Build, Menu, Brightness4, Brightness7, Translate, Backpack, ChevronLeft } from '@material-ui/icons'
import { createTheme, ThemeProvider, alpha } from '@material-ui/core/styles'

import loadPlugin from './pluginAPI'
import { address, origin, token, pathname } from './url'
import { typography } from './theme'
import { version } from '../package.json'
import { GlobalItems } from './components/ItemViewer'
import { pluginCtx, globalCtx, drawerWidthCtx } from './Context'
import lang, { languages, currentLanguage } from '../languages'
import toast, { Snackbars, failed } from './toast'
import dialog, { DialogWrapper } from './dialog'
import Plugin, { GlobalInfo, Page } from './Plugin'
import initPages, { onGlobalDataReceived } from './pages/index'

export interface ServerRecord { address: string, time: number, icon?: string }

export let pages: Record<string, Page[]> = { }

export let update: React.Dispatch<number>

const LanguageSwitch: React.FC = React.memo(() => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | undefined>()
  return <>
    <IconButton onClick={e => setAnchorEl(e.currentTarget)} color='inherit'><Translate /></IconButton>
    <MenuComponent anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(undefined)}>
      {Object.entries(languages).map(([key, value]) => <MenuItem
        key={key}
        selected={currentLanguage === key}
        onClick={() => {
          setAnchorEl(undefined)
          if (currentLanguage !== key) {
            localStorage.setItem('NekoMaid:language', key)
            location.reload()
          }
        }}
      >{value.minecraft['language.name']}</MenuItem>)}
    </MenuComponent>
  </>
})

let sent = false
const App: React.FC<{ darkMode: boolean, setDarkMode: (a: boolean) => void }> = React.memo(({ darkMode, setDarkMode }) => {
  const loc = useLocation()
  const his = useHistory()
  const pluginRef = useRef<Plugin | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [globalItemsOpen, setGlobalItemsOpen] = useState(false)
  const [globalData, setGlobalData] = useState<GlobalInfo>({ } as any)
  const [drawerWidth, setDrawerWidth] = useState(240)
  const updateF = useState(0)[1]
  const create = useMemo(() => {
    const io = socketIO(origin!, { path: pathname!, auth: { token } })
    const map: Record<string, Plugin> = { }
    const fn = (window as any).__NekoMaidAPICreate = (name: string) => map[name] || (map[name] = new Plugin(io, name))
    const nekoMaid = pluginRef.current = fn('NekoMaid')
    io.on('globalData', (data: GlobalInfo) => {
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
      new Set(Object.values(data.plugins).flat()).forEach(loadPlugin)
      setGlobalData(data)
      pages = { }
      initPages(nekoMaid)
      onGlobalDataReceived(nekoMaid, data)
      update(Math.random())
      if (process.env.NODE_ENV !== 'development' && data.pluginVersion !== version) toast(lang.pluginUpdate, 'warning')
    }).on('!', () => {
      io.close()
      dialog(lang.wrongToken + ': ' + version).then(() => (location.href = '//maid.neko-craft.com'))
    }).on('reconnect', () => {
      toast(lang.reconnect)
      setTimeout(() => location.reload(), 5000)
    }).on('disconnect', () => failed(lang.disconnected))
    return fn
  }, [])
  useEffect(() => { if (!loc.pathname || loc.pathname === '/') his.replace('/NekoMaid/dashboard') }, [loc.pathname])
  useEffect(() => {
    update = updateF
    return () => { update = undefined as any }
  }, [])

  const handleDrawerToggle = () => {
    setDrawerWidth(240)
    setMobileOpen(!mobileOpen)
  }

  const isExpand = drawerWidth === 240

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
    const icon = <ListItemIcon>{it.icon || <Build />}</ListItemIcon>
    return it.title
      ? <NavLink key={key} to={'/' + name + '/' + (it.url || path)} activeClassName='actived'>
        <ListItem button>
          {isExpand ? icon : <Tooltip title={it.title} placement='right'>{icon}</Tooltip>}
          {isExpand && <ListItemText primary={it.title} />}
        </ListItem>
      </NavLink>
      : undefined
  }

  const singlePages: JSX.Element[] = []
  const multiPagesPages: Array<JSX.Element | JSX.Element[]> = []
  let index = 0
  for (const name in pages) {
    if (pages[name].length === 1) {
      const elm = mapToItem(name, pages[name][0])
      if (elm) singlePages.push(elm)
    } else {
      if (multiPagesPages.length) multiPagesPages.push(<Divider key={index++} />)
      multiPagesPages.push(pages[name].map(it => mapToItem(name, it)!).filter(Boolean))
    }
  }
  if (singlePages.length) multiPagesPages.push(<Divider key={index++} />, singlePages)

  const drawer = <div>
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

  return <Box sx={{ display: 'flex' }}>
    <CssBaseline />
    <AppBar position='fixed' sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton
          color='inherit'
          edge='start'
          onClick={() => setDrawerWidth(isExpand ? 57 : 240)}
          sx={{ mr: 1, display: { sm: 'inline-flex', xs: 'none' } }}
        ><ChevronLeft sx={{ transition: '.3s', transform: isExpand ? undefined : 'rotate(-180deg)' }} /></IconButton>
        <IconButton color='inherit' edge='start' onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}><Menu /></IconButton>
        <Typography variant='h3' noWrap component='div' sx={{ flexGrow: 1 }}>NekoMaid</Typography>
        {globalData.hasNBTAPI && <IconButton
          color='inherit'
          onClick={() => setGlobalItemsOpen(!globalItemsOpen)}
          onDragOver={() => setGlobalItemsOpen(true)}
        ><Backpack /></IconButton>}
        <LanguageSwitch />
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
        open
        variant='permanent'
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            transition: 'width .3s',
            backgroundImage: theme => theme.palette.mode === 'dark' ? 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))' : undefined
          }
        }}
      >
        {drawer}
      </Drawer>
    </Box>
    <Box component='main' sx={{ flexGrow: 1, width: '100vw' }}>
      <globalCtx.Provider value={globalData}>
        <drawerWidthCtx.Provider value={drawerWidth}>{routes}</drawerWidthCtx.Provider>
        {globalData.hasNBTAPI && <pluginCtx.Provider value={pluginRef.current}>
          <GlobalItems open={globalItemsOpen} onClose={() => setGlobalItemsOpen(false)} />
        </pluginCtx.Provider>}
      </globalCtx.Provider>
    </Box>
  </Box>
})

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
