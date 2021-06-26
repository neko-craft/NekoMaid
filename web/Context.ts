import { createContext, useContext } from 'react'
import Plugin from './Plugin'

const ctx = createContext<Plugin | null>(null)
export default ctx
export const usePlugin = () => useContext(ctx) as Plugin
