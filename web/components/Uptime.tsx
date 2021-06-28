import React, { useRef, useEffect } from 'react'

const SRC = 1000
const MIN = 60 * 1000
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const Uptime: React.FC<{ time: number }> = ({ time }) => {
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
      if (day) text += day + '天'
      if (day || hour) text += hour + '时'
      if (day || hour || min) text += min + '分'
      ref.current!.innerText = text + sec + '秒'
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [ref.current])
  return <span ref={ref} />
}

export default Uptime
