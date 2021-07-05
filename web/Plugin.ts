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
  version: String
}

let flag = 0
export default class Plugin {
  #io: SocketIOClient.Socket

  constructor (io: SocketIOClient.Socket, public readonly namespace: string) {
    this.#io = io
  }

  public addPages (...args: Page[]) {
    if (!args.length) return
    (pages[this.namespace] || (pages[this.namespace] = [])).push(...args)
    update(++flag)
    return this
  }

  public on (event: string, fn: Function) {
    this.#io.on(this.namespace + ':' + event, fn)
    return this
  }

  public once (event: string, fn: Function) {
    this.#io.once(this.namespace + ':' + event, fn)
    return this
  }

  public emit (event: string, data?: any, ack?: (data?: any) => any) {
    const name = this.namespace + ':' + event
    const a = typeof data !== 'undefined'
    const b = typeof ack === 'function'
    if (a && b) this.#io.emit(name, data, ack)
    else if (a || b) this.#io.emit(name, ack || data)
    else this.#io.emit(name)
    return this
  }

  public off (event: string, fn?: Function) {
    this.#io.removeListener(this.namespace + ':' + event, fn)
    return this
  }

  public hasListeners (event: string) {
    this.#io.hasListeners(this.namespace + ':' + event)
    return this
  }

  public switchPage (page: string) {
    this.#io.emit('switchPage', { page, namespace: this.namespace })
    return this
  }
}
