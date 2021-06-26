import React from 'react'

export interface Page { title: string, component: React.ComponentType<any>, path: string, icon?: JSX.Element, noPadding?: boolean }

export class Plugin {
  private constructor ()

  public addPages (...args: Page[]): this

  on (event: string, fn: Function): this

  once (event: string, fn: Function): this

  emit (event: string, data?: any, ack?: (data?: any) => any): this

  off (event: string, fn?: Function): this

  hasListeners (event: string): this

  switchPage (page: string): this
}

export const usePlugin: () => Plugin
