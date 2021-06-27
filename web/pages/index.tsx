import React from 'react'
import { DoubleArrow, Dashboard as DashboardIcon } from '@material-ui/icons'

import Plugin from '../Plugin'

import Dashboard from './Dashboard'
import Console from './Console'

export default (p: Plugin) => p.addPages(
  { component: Dashboard, path: 'dashboard', icon: <DashboardIcon />, title: '概览' },
  { component: Console, path: 'console', icon: <DoubleArrow />, title: '终端' }
)
