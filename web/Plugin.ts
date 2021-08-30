import React from 'react'
import { Socket } from 'socket.io-client'
import { pages, update } from './App'
import { actions, ActionComponent } from './pages/PlayerList'

export interface Page {
  component: React.ComponentType<any>
  path: string | string[]
  title?: string
  url?: string
  icon?: JSX.Element | React.ElementType
  exact?: boolean
  strict?: boolean
  sensitive?: boolean
}

export interface GlobalInfo {
  onlineMode: boolean
  version: string
  hasWhitelist: boolean
  canLoadPlugin: boolean
  pluginVersion?: string
  bMapKey?: string
  icon?: string
  isPaper?: boolean
  hasVault?: boolean
  hasVaultPermission?: boolean
  hasVaultGroups?: boolean
  hasVaultChat?: boolean
  hasOpenInv?: boolean
  hasNBTAPI?: boolean
  hasMultiverse?: boolean
  hasGeoIP?: boolean
  profilerStarted?: boolean
  canSetMaxPlayers?: boolean
  canSetViewDistance?: boolean
  maxPlayers: number
  spawnRadius: number
  plugins: Record<string, string[]>
  vaultEconomy?: {
    singular: string
    plural: string
    digits: number
  }
}

export interface PlayerData { name: string, ban: String | null, whitelisted: boolean, playTime: number, lastOnline: number, online: boolean }

const mapArgs = (args: any[]) => args.map(it => typeof it === 'string'
  ? it.startsWith('\ud83d\udc2e')
    ? it.slice(2)
    : it.startsWith('\ud83c\udf7a')
      ? JSON.parse(it.slice(2))
      : it
  : it)

export const configs: Array<{ title: string, component: React.ComponentType }> = []

let flag = 0
export default class Plugin {
  #io: Socket

  constructor (io: Socket, public readonly namespace: string) {
    this.#io = io
  }

  public addPages (...args: Page[]) {
    if (!args.length) return this
    ;(pages[this.namespace] || (pages[this.namespace] = [])).push(...args)
    this.updateView()
    return this
  }

  public addConfig (title: string, component: React.ComponentType) {
    configs.push({ title, component })
    return this
  }

  public addPlayerAction (component: ActionComponent) {
    actions.push(component)
    return this
  }

  public on (event: string, fn: (...args: any[]) => void) {
    event = this.namespace + ':' + event
    const f = (...args: any[]) => fn(...mapArgs(args))
    this.#io.on(event, f)
    return () => this.#io.off(event, f)
  }

  public once (event: string, fn: (...args: any[]) => void) {
    event = this.namespace + ':' + event
    const f = (...args: any[]) => fn(...mapArgs(args))
    this.#io.once(event, f)
    this.emit('', 3)
    return () => this.#io.off(event, f)
  }

  public emit (event: string, ack: (...data: any[]) => any, ...data: any[]): this
  // eslint-disable-next-line no-dupe-class-members
  public emit (event: string, ...data: any[]): this
  // eslint-disable-next-line no-dupe-class-members
  public emit (event: string, ...data: any[]): this {
    if (typeof data[0] === 'function') {
      const fn = data.shift()
      data.push((...args: any[]) => fn(...mapArgs(args)))
    }
    this.#io.emit(this.namespace + ':' + event, ...data)
    return this
  }

  public off (event: string) {
    this.#io.off(this.namespace + ':' + event)
    return this
  }

  public hasListeners (event: string) {
    this.#io.hasListeners(this.namespace + ':' + event)
    return this
  }

  public switchPage (page: string) {
    this.#io.emit('switchPage', this.namespace, page)
    return this
  }

  public updateView () {
    if (update) update(++flag)
  }
}
