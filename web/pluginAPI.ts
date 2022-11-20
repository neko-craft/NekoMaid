import * as Empty from './components/Empty'
import * as ItemViewer from './components/ItemViewer'
import * as Loading from './components/Loading'
import * as More from './components/More'
import * as ServerSwitch from './components/ServerSwitch'
import * as Uptime from './components/Uptime'
import * as ValidInput from './components/ValidInput'

import { usePlugin, useGlobalData, useDrawerWidth } from './Context'
import * as dialog from './dialog'
import * as toast from './toast'
import * as url from './url'
import * as utils from './utils'
import { lang, languages, currentLanguage } from '../languages/index'

import * as react from 'react'
import * as reactDom from 'react-dom/client'
import * as jsxRuntime from 'react/jsx-runtime'
import * as emotionReact from '@emotion/react'
import * as emotionStyled from '@emotion/styled'

(window as any).__NekoMaidAPI = {
  Empty,
  ItemViewer,
  Loading,
  More,
  ServerSwitch,
  Uptime,
  ValidInput,
  usePlugin,
  useGlobalData,
  useDrawerWidth,
  dialog,
  toast,
  url,
  utils,
  languages,
  currentLanguage,
  libraries: {
    react,
    reactDom,
    jsxRuntime,
    emotionReact,
    emotionStyled
  },
  get language () { return lang }
}

export default (url: string) => {
  const node = document.createElement('script')
  node.type = 'text/javascript'
  node.src = url
  node.crossOrigin = 'anonymous'
  document.body.appendChild(node)
}
