import { pages, Page, update } from './App'

let flag = 0
export default class Plugin {
  // eslint-disable-next-line no-undef
  #io: SocketIOClient.Socket

  // eslint-disable-next-line no-undef
  constructor (io: SocketIOClient.Socket, public readonly namespace: string) {
    this.#io = io
  }

  // eslint-disable-next-line no-undef
  public addPage (...args: Page[]) {
    if (!args.length) return
    (pages[this.namespace] || (pages[this.namespace] = [])).push(...args)
    update(++flag)
  }

  on (event: string, fn: Function) {
    this.#io.on(this.namespace + ':' + event, fn)
    return this
  }

  once (event: string, fn: Function) {
    this.#io.once(this.namespace + ':' + event, fn)
    return this
  }

  emit (event: string, data?: any, ack?: (data?: any) => any) {
    const name = this.namespace + ':' + event
    const a = typeof data !== 'undefined'
    const b = typeof ack === 'function'
    if (a && b) this.#io.emit(name, data, ack)
    else if (a || b) this.#io.emit(name, ack || data)
    else this.#io.emit(name)
    return this
  }

  off (event: string, fn?: Function) {
    this.#io.removeListener(this.namespace + ':' + event, fn)
    return this
  }

  hasListeners (event: string) {
    this.#io.hasListeners(this.namespace + ':' + event)
    return this
  }

  switchPage (page: string) {
    this.#io.emit('switchPage', { page, namespace: this.namespace })
    return this
  }
}
