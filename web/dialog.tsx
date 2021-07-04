import React, { useEffect, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions, Button } from '@material-ui/core'

export interface DialogOptionsNoInput {
  content: React.ReactNode
  title?: React.ReactNode
}

export type DialogOptionsWithInput = DialogOptionsNoInput & { input: string }

export type DialogOptions = DialogOptionsNoInput | DialogOptionsWithInput

type DialogOptionsWithPromise = DialogOptions & { resolve: (it: any) => void }

let openFn: (it: DialogOptionsWithPromise) => void

export const DialogWrapper: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [data, setDate] = useState<DialogOptionsWithPromise | undefined>()
  useEffect(() => {
    openFn = it => {
      setDate(it)
      setOpen(true)
    }
  }, [])
  if (!data) return <></>
  const cancel = () => {
    setOpen(false)
    setDate(undefined)
    setText('')
    data.resolve((data as any).input ? null : false)
  }
  return <Dialog open={!!open} onClose={cancel}>
    <DialogTitle>{data.title || '提示'}</DialogTitle>
    <DialogContent>
      <DialogContentText>{data.content}</DialogContentText>
      {(data as any).input && <TextField
        autoFocus
        fullWidth
        margin='dense'
        label={(data as any).input}
        variant='standard'
        value={text}
        onChange={it => setText(it.target.value)}
      />}
    </DialogContent>
    <DialogActions>
      <Button onClick={cancel}>取消</Button>
      <Button onClick={() => {
        setOpen(false)
        setDate(undefined)
        setText('')
        data.resolve((data as any).input ? text : true)
      }}>确认</Button>
    </DialogActions>
  </Dialog>
}

export interface FN {
  (content: React.ReactNode): Promise<boolean>
  (content: React.ReactNode | DialogOptions, input: string): Promise<string | null>
  <T extends DialogOptions> (options: T): T extends DialogOptionsWithInput ? Promise<string | null> : Promise<boolean>
}

export default ((content: any, input: any) => {
  return (openFn
    ? new Promise(resolve => openFn(content.content ? { input, ...content, resolve } : { input, content, resolve }))
    : Promise.reject(new Error('Uninitialization completed!'))) as any
}) as FN
