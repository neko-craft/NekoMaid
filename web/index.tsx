import './index.css'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import 'dayjs/locale/zh-cn'
import dayjs from 'dayjs'
import React from 'react'
import ReactDom from 'react-dom'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import ServerSwitch from './components/ServerSwitch'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { HashRouter } from 'react-router-dom'

import url from './url'
import App from './App'

dayjs.locale('zh-cn')
dayjs.extend(duration)
dayjs.extend(relativeTime)

ReactDom.render(<CacheProvider value={createCache({ key: 'nm', stylisPlugins: [] })}>
  {url ? <HashRouter><App /></HashRouter> : <ServerSwitch />}
</CacheProvider>, document.getElementById('app'))
