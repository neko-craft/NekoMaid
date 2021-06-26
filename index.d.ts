/* eslint-disable no-undef */
export class Socket {
  private constructor ()

  on (event: string, fn: Function): this

  once (event: string, fn: Function): this

  emit (event: string, data?: any, ack?: (data?: any) => any): this

  off (event: string, fn?: Function): this

  hasListeners (event: string): this

  switchPage (page: string): this
}
