import React from 'react'
import { DoubleArrow, Dashboard as DashboardIcon, People, Description, Extension, Settings, AccountBalance,
  Schedule, Backpack, Public, Widgets, Pets, Equalizer } from '@material-ui/icons'
import Plugin, { GlobalInfo } from '../Plugin'
import lang, { minecraft } from '../../languages'

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
import Profiler from './Profiler'
import Vault from './Vault'
import OpenInv, { playerAction } from './OpenInv'

export default (p: Plugin) => p.addPages(
  { component: Dashboard, path: 'dashboard', icon: <DashboardIcon />, title: lang.dashboard.title },
  { component: Terminal, path: 'terminal', icon: <DoubleArrow />, title: lang.terminal.title },
  { component: PlayerList, path: ['playerList', 'playerList/:name'], icon: <People />, title: minecraft['entity.minecraft.player'], exact: true },
  { component: Files, path: 'files', icon: <Description />, title: lang.files.title },
  { component: Plugins, path: 'plugins', icon: <Extension />, title: lang.plugins.title },
  { component: Worlds, path: 'worlds', icon: <Public />, title: lang.worlds.title },
  { component: BlockEditor, path: 'block', icon: <Widgets />, title: lang.blockEditor.title },
  { component: EntityEditor, path: ['entity', 'entity/:id'], icon: <Pets />, title: lang.entityEditor.title },
  { component: Scheduler, path: 'scheduler', icon: <Schedule />, title: lang.scheduler.title },
  { component: OpenInv, path: ['openInv', 'openInv/:name'], icon: <Backpack />, title: lang.openInv.title, exact: true },
  { component: Config, path: 'config', icon: <Settings />, title: lang.config.title }
).addPlayerAction(playerAction)

export const onGlobalDataReceived = (p: Plugin, data: GlobalInfo) => {
  if (data.hasProfiler) p.addPages({ component: Profiler, path: 'profiler', icon: <Equalizer />, title: lang.profiler.title })
  if (data.hasVault) p.addPages({ component: Vault, path: 'vault', icon: <AccountBalance />, title: lang.vault.title })
}
