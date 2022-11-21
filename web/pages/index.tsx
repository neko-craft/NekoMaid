import React, { useEffect, useState } from 'react'
import loadable from '@loadable/component'
import Plugin, { GlobalInfo } from '../Plugin'
import { minecraft, lang } from '../../languages'
import { useGlobalData, usePlugin } from '../Context'

import Badge from '@mui/material/Badge'

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
import Equalizer from '@mui/icons-material/Equalizer'

import Dashboard from './Dashboard'
import Terminal from './Terminal'
import Files from './Files'
import Plugins from './Plugins'
import Worlds from './Worlds'
import BlockEditor from './BlockEditor'
import EntityEditor from './EntityEditor'
import Config from './Config'
import Inventory, { playerAction } from './Inventory'

export const ProfilerIcon: React.FC = () => {
  const plugin = usePlugin()
  const globalData = useGlobalData()
  const [status, setStatus] = useState(!!globalData.profilerStarted)
  useEffect(() => {
    const off = plugin.on('profiler:status', (res: boolean) => {
      setStatus(globalData.profilerStarted = res)
    })
    return () => { off() }
  }, [])
  return <Badge color='secondary' variant='dot' invisible={!status}><Equalizer /></Badge>
}

export default (p: Plugin) => p.addPages(
  { component: Dashboard, path: 'dashboard', icon: <DashboardIcon />, title: lang.dashboard.title },
  { component: Terminal, path: 'terminal', icon: <DoubleArrow />, title: lang.terminal.title },
  { component: loadable(() => import('./PlayerList')), path: ['playerList', 'playerList/:name'], icon: <People />, title: minecraft['entity.minecraft.player'] },
  { component: Files, path: 'files/*', icon: <Description />, title: lang.files.title },
  { component: Plugins, path: 'plugins', icon: <Extension />, title: lang.plugins.title },
  { component: Worlds, path: 'worlds', icon: <Public />, title: lang.worlds.title },
  { component: BlockEditor, path: 'block', icon: <Widgets />, title: lang.blockEditor.title },
  { component: EntityEditor, path: ['entity', 'entity/:id'], icon: <Pets />, title: lang.entityEditor.title },
  { component: loadable(() => import('./Profiler')), path: 'profiler', icon: ProfilerIcon, title: lang.profiler.title },
  { component: loadable(() => import('./Scheduler')), path: 'scheduler', icon: <Schedule />, title: lang.scheduler.title },
  { component: Inventory, path: ['inventory', 'inventory/:name'], icon: <Backpack />, title: lang.inventory.title },
  { component: Config, path: 'config', icon: <Settings />, title: lang.config.title }
).addPlayerAction(playerAction)

export const onGlobalDataReceived = (p: Plugin, data: GlobalInfo) => {
  if (data.hasVault) p.addPages({ component: loadable(() => import('./Vault')), path: 'vault', icon: <AccountBalance />, title: lang.vault.title })
}
