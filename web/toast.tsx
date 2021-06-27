import React from 'react'
import { SnackbarProps, Snackbar, Box, Alert, AlertColor, Toolbar, Paper } from '@material-ui/core'

let update: (it: number) => void

let i = 0
const toasts: Record<number, SnackbarProps> = {}
export default (props: (SnackbarProps & { autoHideDuration?: number }) | string = { }, type?: AlertColor) => {
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

export const Snackbars: React.FC = () => {
  [, update] = React.useState<number>(0)

  return <Box sx={{
    position: 'fixed',
    top: 12,
    right: 34,
    zIndex: (theme: any) => theme.zIndex.drawer + 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  }}><Toolbar />{Object.values(toasts).map(it => React.createElement(Snackbar, it))}</Box>
}
