import './index.css'
import './one-light.less'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import '@fontsource/roboto-mono/400.css'
import '@fontsource/roboto-mono/700.css'
import '@fontsource/roboto-mono/400-italic.css'
import '@fontsource/roboto-mono/700-italic.css'
import './hacks'
import dayjs from 'dayjs'
import React from 'react'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import ServerSwitch from './components/ServerSwitch'
import createCache from '@emotion/cache'
import lang from '../languages'

import { createRoot } from 'react-dom/client'
import { CacheProvider } from '@emotion/react'
import { HashRouter } from 'react-router-dom'

import url from './url'
import App from './App'

dayjs.locale(lang.underlineName)
dayjs.extend(duration)
dayjs.extend(relativeTime)

createRoot(document.getElementById('app')!).render(<CacheProvider value={createCache({ key: 'nm', stylisPlugins: [] })}>
  {url ? <HashRouter><App /></HashRouter> : <ServerSwitch open />}
</CacheProvider>)
