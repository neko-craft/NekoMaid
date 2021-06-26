import React, { useMemo, useState } from 'react'
import socketIO from 'socket.io-client'
import { useLocation, useHistory, Route } from 'react-router-dom'
import { Divider, Hidden, List, ListItem, ListItemIcon, ListItemText, CssBaseline, AppBar, Typography, Drawer, Toolbar, IconButton } from '@material-ui/core'
import { makeStyles, useTheme } from '@material-ui/core/styles'

import { Build, Menu } from '@material-ui/icons'
import { address, token } from './url'
import PluginContext from './Context'
import Plugin from './Plugin'
import initPages from './pages/index'

// eslint-disable-next-line no-undef
export interface Page { title: string, component: React.ComponentType<any>, path: string, icon?: JSX.Element }

export const pages: Record<string, Page[]> = { }

export let update: React.Dispatch<number>

const drawerWidth = 240

const useStyles = makeStyles(theme => ({
  actived: {
    '& div': {
      color: theme.palette.primary.main
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
      width: `calc(100% - ${drawerWidth}px)`,
      marginLeft: drawerWidth
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
  }
}))

const App: React.FC = () => {
  const classes = useStyles()
  const theme = useTheme()
  const loc = useLocation()
  const history = useHistory()
  const [mobileOpen, setMobileOpen] = React.useState(false)
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
  // const logs = useMemo<Array<{ level: string, msg: string, time: string, logger: string }>>(() => [], [])

  // useEffect(() => {
  //   const f = (data: any) => logs.push(data)
  //   io.once('logs', f).on('log', f).switchPage('console')
  //   return () => void io.off('log', f).off('logs', f)
  // }, [])

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen)

  // eslint-disable-next-line no-undef
  const routes: JSX.Element[] = []
  const mapToItem = (name: string, it: Page) => {
    const key = '/' + name + '/' + it.path
    routes.push(<PluginContext.Provider key={key} value={create(name)}><Route path={key} component={it.component} exact /></PluginContext.Provider>)
    return <ListItem button key={key} className={key === loc.pathname ? classes.actived : undefined} onClick={() => history.push(key)}>
      <ListItemIcon>{it.icon || <Build />}</ListItemIcon>
      <ListItemText primary={it.title} />
    </ListItem>
  }

  // eslint-disable-next-line no-undef
  const singlePages: JSX.Element[] = []
  // eslint-disable-next-line no-undef
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
      <AppBar position="fixed" className={classes.appBar}>
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
          <Typography variant='h6' noWrap>NekoMaid</Typography>
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
      <main className={classes.content}>{routes}</main>
    </div>
  )
}

export default App
