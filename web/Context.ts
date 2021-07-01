import { createContext, useContext } from 'react'
import Plugin, { GlobalInfo } from './Plugin'

export const pluginCtx = createContext<Plugin | null>(null)
export const globalCtx = createContext<Partial<GlobalInfo>>({ })
export const usePlugin = () => useContext(pluginCtx) as Plugin
export const useGlobalData = () => useContext(globalCtx) as Partial<GlobalInfo>
