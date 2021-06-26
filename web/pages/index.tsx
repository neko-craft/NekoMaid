import React from 'react'
import { DoubleArrow } from '@material-ui/icons'

import Plugin from '../Plugin'

import Console from './Console'

export default (p: Plugin) => p.addPage(
  { component: Console, path: 'console', icon: <DoubleArrow />, title: '终端' }
)
