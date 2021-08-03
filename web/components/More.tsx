import React from 'react'
import { Collapse } from '@material-ui/core'

import type { CollapseProps } from '@material-ui/core/Collapse'

const C: any = Collapse

const More: React.FC<CollapseProps> = props => {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef('')
  return <C
    {...props}
    in={open}
    className={open ? 'opened' : undefined}
    collapsedSize={parseFloat(getComputedStyle(document.body).lineHeight)}
    onClick={({ target }: any) => {
      if (!target.dataset.collapse) return
      if (open) target.innerText = ref.current
      else {
        if (!ref.current) ref.current = target.innerText
        target.innerText = target.dataset.collapse
      }
      setOpen(!open)
    }}
  />
}

export default More
