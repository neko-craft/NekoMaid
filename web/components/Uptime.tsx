import React, { useRef, useEffect } from 'react'
import lang from '../../languages'
import { Box } from '@mui/material'

import type { BoxProps } from '@mui/material/Box'

const SRC = 1000
const MIN = 60 * 1000
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const Uptime: React.FC<BoxProps & { time: number }> = ({ time, ...props }) => {
  const ref = useRef<HTMLSpanElement | null>(null)
  useEffect(() => {
    if (!ref.current) return
    const update = () => {
      let t = Date.now() - time
      const day = t / DAY | 0
      const hour = (t -= DAY * day) / HOUR | 0
      const min = (t -= HOUR * hour) / MIN | 0
      const sec = (t - MIN * min) / SRC | 0
      let text = ''
      if (day) text += day + lang.time.day
      if (day || hour) text += hour + lang.time.hour
      if (day || hour || min) text += min + lang.time.minute
      ref.current!.innerText = text + sec + lang.time.second
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [ref.current])
  return <Box ref={ref} component='span' {...props} />
}

export const Countdown: React.FC<BoxProps & { time: number, max?: number, interval?: number, step?: number }> =
  ({ time, max, interval, step, ...props }) => {
    const ref = useRef<HTMLSpanElement | null>(null)
    useEffect(() => {
      if (!ref.current) return
      let curTime = time
      const update = () => {
        ref.current!.innerText = curTime.toString()
        if (max && curTime >= max) curTime = 0; else curTime += (step || 1)
      }
      update()
      const timer = setInterval(update, interval || 1000)
      return () => clearInterval(timer)
    }, [ref.current, time])
    return <Box ref={ref} component='span' {...props} />
  }

export default Uptime
