import { Socket } from 'socket.io-client'
import { pages, update } from './App'

export interface Page {
  title: string
  component: React.ComponentType<any>
  path: string | string[]
  url?: string
  icon?: JSX.Element
  exact?: boolean
  strict?: boolean
  sensitive?: boolean
}

export interface GlobalInfo {
  onlineMode: boolean
  version: string
  hasWhitelist: boolean
  canLoadPlugin: boolean
}

const mapArgs = (args: any[]) => args.map(it => typeof it === 'string'
  ? it.startsWith('\ud83d\udc2e')
    ? it.slice(2)
    : it.startsWith('\ud83c\udf7a')
      ? JSON.parse(it.slice(2))
      : it
  : it)

let flag = 0
export default class Plugin {
  #io: Socket

  constructor (io: Socket, public readonly namespace: string) {
    this.#io = io
  }

  public addPages (...args: Page[]) {
    if (!args.length) return
    (pages[this.namespace] || (pages[this.namespace] = [])).push(...args)
    update(++flag)
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
  public emit (event: string, ...data: any[]): void
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
}
