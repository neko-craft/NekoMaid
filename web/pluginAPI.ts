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
import language, { languages, currentLanguage } from '../languages/index'

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
  language,
  currentLanguage,
  libraries: Object.freeze({
    react: require('react'),
    reactDom: require('react-dom'),
    jsxRuntime: require('react/jsx-runtime'),
    emotionReact: require('@emotion/react'),
    emotionStyled: require('@emotion/styled'),
    muiSystem: require('@material-ui/system'),
    muiUtils: require('@material-ui/utils'),
    muiUnstyled: require('@material-ui/unstyled')
  })
})

export default (url: string) => {
  const node = document.createElement('script')
  node.type = 'text/javascript'
  node.src = url
  node.crossOrigin = 'anonymous'
  document.body.appendChild(node)
}
