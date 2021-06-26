import React, { useMemo, useState } from 'react'
import socketIO from 'socket.io-client'
import { useLocation, useHistory, Route } from 'react-router-dom'
import { Divider, Hidden, List, ListItem, ListItemIcon, ListItemText, CssBaseline, AppBar,
  Typography, Drawer, Toolbar, IconButton, useMediaQuery } from '@material-ui/core'
import { makeStyles, useTheme, createMuiTheme, ThemeProvider } from '@material-ui/core/styles'

import { Build, Menu, Brightness4, Brightness7 } from '@material-ui/icons'
import { address, token } from './url'
import PluginContext from './Context'
import Plugin from './Plugin'
import initPages from './pages/index'

export interface Page { title: string, component: React.ComponentType<any>, path: string, icon?: JSX.Element, noPadding?: boolean }

export const pages: Record<string, Page[]> = { }

export let update: React.Dispatch<number>

const drawerWidth = 240

const useStyles = makeStyles(theme => ({
  actived: {
    '& div': {
      color: theme.palette.primary[theme.palette.type === 'light' ? 'main' : 'contrastText']
    }
  },
  root: {
    display: 'flex'
  },
  drawer: {
    [theme.breakpoints.up('sm')]: {
      width: drawerWidth,
      flexShrink: 0
    }
  },
  appBar: {
    [theme.breakpoints.up('sm')]: {
      width: '100%',
      zIndex: theme.zIndex.drawer + 1
    }
  },
  menuButton: {
    marginRight: theme.spacing(2),
    [theme.breakpoints.up('sm')]: {
      display: 'none'
    }
  },
  toolbar: theme.mixins.toolbar,
  drawerPaper: {
    width: drawerWidth
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3)
  },
  title: {
    flexGrow: 1
  }
}))

const App: React.FC<{ darkMode: boolean, setDarkMode: (a: boolean) => void }> = ({ darkMode, setDarkMode }) => {
  const classes = useStyles()
  const theme = useTheme()
  const loc = useLocation()
  const history = useHistory()
  const [mobileOpen, setMobileOpen] = useState(false)
  update = useState(0)[1]
  const create = useMemo(() => {
    const io = socketIO(address!, { query: 'token=' + token })
    io.on('connect', () => {
      const his: Array<{ address: string, time: number }> = JSON.parse(localStorage.getItem('NekoMaid:servers') || '[]')
      const curAddress = address!.replace('http://', '') + '?' + token
      let cur = his.find(it => it.address === curAddress)
      if (!cur) his.push((cur = { address: curAddress, time: 0 }))
      cur.time = Date.now()
      localStorage.setItem('NekoMaid:servers', JSON.stringify(his))
    })
    const map: Record<string, Plugin> = { }
    const fn = (name: string) => map[name] || (map[name] = new Plugin(io, name))
    initPages(fn('NekoMaid'))
    return fn
  }, [])

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen)

  const routes: JSX.Element[] = []
  let needPadding = true
  const mapToItem = (name: string, it: Page) => {
    const key = '/' + name + '/' + it.path
    const actived = key === loc.pathname
    if (actived && it.noPadding) needPadding = false
    routes.push(<PluginContext.Provider key={key} value={create(name)}><Route path={key} component={it.component} exact /></PluginContext.Provider>)
    return <ListItem button key={key} className={actived ? classes.actived : undefined} onClick={() => history.push(key)}>
      <ListItemIcon>{it.icon || <Build />}</ListItemIcon>
      <ListItemText primary={it.title} />
    </ListItem>
  }

  const singlePages: JSX.Element[] = []
  const multiPagesPages: Array<JSX.Element | JSX.Element[]> = [singlePages]
  let index = 0
  for (const name in pages) {
    if (pages[name].length === 1) singlePages.push(mapToItem(name, pages[name][0]))
    else multiPagesPages.push(<Divider key={index++} />, pages[name].map(it => mapToItem(name, it)))
  }

  const drawer = (
    <div>
      <div className={classes.toolbar} />
      <Divider />
      <List>{multiPagesPages.flat()}</List>
    </div>
  )

  return (
    <div className={classes.root}>
      <CssBaseline />
      <AppBar position='fixed' className={classes.appBar}>
        <Toolbar>
          <IconButton
            color='inherit'
            aria-label='open drawer'
            edge='start'
            onClick={handleDrawerToggle}
            className={classes.menuButton}
          >
            <Menu />
          </IconButton>
          <Typography variant='h6' className={classes.title}>NekoMaid</Typography>
          <IconButton
            color='inherit'
            edge='end'
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <nav className={classes.drawer} aria-label="mailbox folders">
        <Hidden smUp implementation='css'>
          <Drawer
            variant='temporary'
            anchor={theme.direction === 'rtl' ? 'right' : 'left'}
            open={mobileOpen}
            onClose={handleDrawerToggle}
            classes={{ paper: classes.drawerPaper }}
            ModalProps={{ keepMounted: true }}
          >
            {drawer}
          </Drawer>
        </Hidden>
        <Hidden xsDown implementation='css'>
          <Drawer classes={{ paper: classes.drawerPaper }} variant="permanent" open>{drawer}</Drawer>
        </Hidden>
      </nav>
      <main style={{ width: '100%' }} className={needPadding ? classes.content : undefined}>
        {routes}
      </main>
    </div>
  )
}

const AppWrap: React.FC = () => {
  const [darkMode, setDarkMode] = useState(useMediaQuery('(prefers-color-scheme: dark)'))
  const theme2 = React.useMemo(() => createMuiTheme({
    palette: {
      type: darkMode ? 'dark' : 'light'
    }
  }), [darkMode])
  return <ThemeProvider theme={theme2}><App darkMode={darkMode} setDarkMode={setDarkMode} /></ThemeProvider>
}

export default AppWrap
