import * as Empty from './components/Empty'
import * as ItemViewer from './components/ItemViewer'
import * as Loading from './components/Loading'
import * as More from './components/More'
import * as ServerSwitch from './components/ServerSwitch'
import * as Uptime from './components/Uptime'
import * as ValidInput from './components/ValidInput'

import { usePlugin, useGlobalData } from './Context'
import * as dialog from './dialog'
import * as toast from './toast'
import * as url from './url'
import * as utils from './utils'
import language, { languages } from '../languages/index'

(window as any).__NekoMaidAPI = Object.freeze({
  Empty,
  ItemViewer,
  Loading,
  More,
  ServerSwitch,
  Uptime,
  ValidInput,
  usePlugin,
  useGlobalData,
  dialog,
  toast,
  url,
  utils,
  languages,
  language
})

export default (url: string) => {
  const node = document.createElement('script')
  node.src = url
  document.body.appendChild(node)
}
