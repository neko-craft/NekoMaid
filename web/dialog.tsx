import React, { useEffect, useState } from 'react'
import ValidInput, { Props } from './components/ValidInput'
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@material-ui/core'

export interface DialogOptionsWithoutInput {
  content: React.ReactNode
  title?: React.ReactNode
}

export type DialogOptionsWithInput = DialogOptionsWithoutInput & { input: string | Props }

export type DialogOptions = DialogOptionsWithoutInput | DialogOptionsWithInput

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

  const input = (data as any).input
  const cancel = () => {
    setOpen(false)
    setDate(undefined)
    setText('')
    data.resolve(input ? null : false)
  }
  let inputElm: React.ReactNode
  if (input) {
    const props: any = {
      autoFocus: true,
      fullWidth: true,
      margin: 'dense',
      variant: 'standard',
      value: text,
      onChange (it: any) { setText(it.target.value) }
    }
    if (typeof input === 'string') props.label = input
    else if (typeof input === 'object') Object.assign(props, input)
    inputElm = React.createElement(ValidInput, props)
  }

  return <Dialog open={!!open} onClose={cancel}>
    <DialogTitle>{data.title || '提示'}</DialogTitle>
    <DialogContent>
      <DialogContentText>{data.content}</DialogContentText>
      {inputElm}
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
  (content: React.ReactNode | DialogOptionsWithoutInput): Promise<boolean>
  (content: React.ReactNode | DialogOptions, input: string | Props): Promise<string | null>
  (options: DialogOptionsWithInput): Promise<string | null>
}

export default ((content: any, input: any) => {
  return (openFn
    ? new Promise(resolve => openFn(content.content ? { input, ...content, resolve } : { input, content, resolve }))
    : Promise.reject(new Error('Uninitialization completed!'))) as any
}) as FN
