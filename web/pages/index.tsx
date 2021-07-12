import React from 'react'
import { DoubleArrow, Dashboard as DashboardIcon, People, Description, Extension } from '@material-ui/icons'

import Plugin from '../Plugin'

import Dashboard from './Dashboard'
import Console from './Console'
import PlayerList from './PlayerList'
import Files from './Files'
import Plugins from './Plugins'

export default (p: Plugin) => p.addPages(
  { component: Dashboard, path: 'dashboard', icon: <DashboardIcon />, title: '概览' },
  { component: Console, path: 'console', icon: <DoubleArrow />, title: '终端' },
  { component: PlayerList, path: ['playerList', 'playerList/:name'], icon: <People />, title: '玩家', exact: true },
  { component: Files, path: 'files', icon: <Description />, title: '文件' },
  { component: Plugins, path: 'plugins', icon: <Extension />, title: '插件' }
)
