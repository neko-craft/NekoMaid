import React, { useEffect, useState } from 'react'
import lang from '../languages'
import { SnackbarProps, Snackbar, Box, Alert, AlertColor, Toolbar, Paper } from '@material-ui/core'

let update: (it: number) => void

let i = 0
const toasts: Record<number, SnackbarProps> = {}
const toast = (props: (SnackbarProps & { autoHideDuration?: number }) | string = { }, type?: AlertColor) => {
  if (typeof props === 'string') props = { message: props }
  if (type) props.children = <Paper elevation={5}><Alert severity={type} sx={{ width: '100%' }} variant={'filled' as any}>{props.message}</Alert></Paper>
  if (!props.autoHideDuration) props.autoHideDuration = 4000
  const obj = toasts[i] = {
    ...props,
    key: i,
    open: true,
    sx: { position: 'relative', top: 0, left: 0, marginBottom: '12px !important' },
    onClose () {
      toasts[obj.key] = { ...obj, open: false }
      update?.(i++)
      setTimeout(() => {
        delete toasts[obj.key]
        update?.(i++)
      }, 500)
    }
  }
  update?.(++i)
}
export default toast

export const Snackbars: React.FC = () => {
  const [, updateF] = useState<number>(0)
  useEffect(() => {
    update = updateF
    return () => { update = undefined as any }
  })

  return <Box sx={{
    position: 'fixed',
    top: 12,
    right: 44,
    zIndex: theme => theme.zIndex.modal + 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    pointerEvents: 'none'
  }}><Toolbar sx={{ padding: '0!important' }} />{Object.values(toasts).map(it => React.createElement(Snackbar, it))}</Box>
}

export const success = (msg = lang.actionSuccess) => toast(msg, 'success')
export const failed = (msg = lang.actionFailed) => toast(msg, 'error')
export const action = (it: boolean) => it ? success() : failed()
