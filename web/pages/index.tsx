import React from 'react'
import Plugin, { GlobalInfo } from '../Plugin'
import lang, { minecraft } from '../../languages'

import DoubleArrow from '@mui/icons-material/DoubleArrow'
import DashboardIcon from '@mui/icons-material/Dashboard'
import People from '@mui/icons-material/People'
import Description from '@mui/icons-material/Description'
import Extension from '@mui/icons-material/Extension'
import Settings from '@mui/icons-material/Settings'
import AccountBalance from '@mui/icons-material/AccountBalance'
import Schedule from '@mui/icons-material/Schedule'
import Backpack from '@mui/icons-material/Backpack'
import Public from '@mui/icons-material/Public'
import Widgets from '@mui/icons-material/Widgets'
import Pets from '@mui/icons-material/Pets'

import Dashboard from './Dashboard'
import Terminal from './Terminal'
import PlayerList from './PlayerList'
import Files from './Files'
import Plugins from './Plugins'
import Worlds from './Worlds'
import BlockEditor from './BlockEditor'
import EntityEditor from './EntityEditor'
import Config from './Config'
import Scheduler from './Scheduler'
import Vault from './Vault'
import Profiler, { ProfilerIcon } from './Profiler'
import OpenInv, { playerAction } from './OpenInv'

export default (p: Plugin) => p.addPages(
  { component: Dashboard, path: 'dashboard', icon: <DashboardIcon />, title: lang.dashboard.title },
  { component: Terminal, path: 'terminal', icon: <DoubleArrow />, title: lang.terminal.title },
  { component: PlayerList, path: ['playerList', 'playerList/:name'], icon: <People />, title: minecraft['entity.minecraft.player'] },
  { component: Files, path: 'files', icon: <Description />, title: lang.files.title },
  { component: Plugins, path: 'plugins', icon: <Extension />, title: lang.plugins.title },
  { component: Worlds, path: 'worlds', icon: <Public />, title: lang.worlds.title },
  { component: BlockEditor, path: 'block', icon: <Widgets />, title: lang.blockEditor.title },
  { component: EntityEditor, path: ['entity', 'entity/:id'], icon: <Pets />, title: lang.entityEditor.title },
  { component: Profiler, path: 'profiler', icon: ProfilerIcon, title: lang.profiler.title },
  { component: Scheduler, path: 'scheduler', icon: <Schedule />, title: lang.scheduler.title },
  { component: OpenInv, path: ['openInv', 'openInv/:name'], icon: <Backpack />, title: lang.openInv.title },
  { component: Config, path: 'config', icon: <Settings />, title: lang.config.title }
).addPlayerAction(playerAction)

export const onGlobalDataReceived = (p: Plugin, data: GlobalInfo) => {
  if (data.hasVault) p.addPages({ component: Vault, path: 'vault', icon: <AccountBalance />, title: lang.vault.title })
}
