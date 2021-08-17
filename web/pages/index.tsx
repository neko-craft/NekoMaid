import React from 'react'
import { DoubleArrow, Dashboard as DashboardIcon, People, Description, Extension, Settings, AccountBalance,
  Schedule, Backpack, Public } from '@material-ui/icons'

import Plugin, { GlobalInfo } from '../Plugin'

import Dashboard from './Dashboard'
import Console from './Console'
import PlayerList from './PlayerList'
import Files from './Files'
import Plugins from './Plugins'
import Worlds from './Worlds'
import Config from './Config'
import Scheduler from './Scheduler'
import Vault from './Vault'
import OpenInv, { playerAction } from './OpenInv'

export default (p: Plugin) => p.addPages(
  { component: Dashboard, path: 'dashboard', icon: <DashboardIcon />, title: '概览' },
  { component: Console, path: 'console', icon: <DoubleArrow />, title: '终端' },
  { component: PlayerList, path: ['playerList', 'playerList/:name'], icon: <People />, title: '玩家', exact: true },
  { component: Files, path: 'files', icon: <Description />, title: '文件' },
  { component: Plugins, path: 'plugins', icon: <Extension />, title: '插件' },
  { component: Worlds, path: 'worlds', icon: <Public />, title: '世界' },
  { component: Scheduler, path: 'scheduler', icon: <Schedule />, title: '任务' },
  { component: OpenInv, path: ['openInv', 'openInv/:name'], icon: <Backpack />, title: '背包', exact: true },
  { component: Config, path: 'config', icon: <Settings />, title: '设置' }
).addPlayerAction(playerAction)

export const onGlobalDataReceived = (p: Plugin, data: GlobalInfo) => {
  if (data.hasVault) p.addPages({ component: Vault, path: 'vault', icon: <AccountBalance />, title: '经济 权限 聊天' })
}
