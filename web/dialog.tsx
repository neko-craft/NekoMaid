import React, { useEffect, useState } from 'react'
import ValidInput, { ValidInputProps } from './components/ValidInput'
import lang, { minecraft } from '../languages'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Button, { ButtonProps } from '@mui/material/Button'

export interface DialogOptionsWithoutInput {
  content: React.ReactNode
  title?: React.ReactNode
  okButton?: ButtonProps
  cancelButton?: boolean
}

export type DialogOptionsWithInput = DialogOptionsWithoutInput & { input: string | ValidInputProps }

export type DialogOptions = DialogOptionsWithoutInput | DialogOptionsWithInput

type DialogOptionsWithPromise = DialogOptions & { resolve: (it: any) => void }

let openFn: (it: DialogOptionsWithPromise) => void

export const DialogWrapper: React.FC = () => {
  const [canClick, setCanClick] = useState(false)
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
      key: input.label || input,
      autoFocus: true,
      fullWidth: true,
      margin: 'dense',
      variant: 'standard',
      value: text,
      onStatusChange: setCanClick,
      onChange (it: any) { setText(it.target.value) }
    }
    if (typeof input === 'string') props.label = input
    else if (typeof input === 'object') Object.assign(props, input)
    inputElm = React.createElement(ValidInput, props)
  }

  return <Dialog open={!!open} onClose={cancel}>
    <DialogTitle>{data.title || lang.tip}</DialogTitle>
    <DialogContent>
      <DialogContentText>{data.content}</DialogContentText>
      {inputElm}
    </DialogContent>
    <DialogActions>
      {data.cancelButton !== false && <Button onClick={cancel}>{minecraft['gui.cancel']}</Button>}
      <Button {...data.okButton} disabled={canClick} onClick={() => {
        setOpen(false)
        setDate(undefined)
        setText('')
        data.resolve((data as any).input ? text : true)
      }}>{minecraft['gui.ok']}</Button>
    </DialogActions>
  </Dialog>
}

export default ((content: any, input: any) => {
  return (openFn
    ? new Promise(resolve => openFn(content.content ? { input, ...content, resolve } : { input, content, resolve }))
    : Promise.reject(new Error('Uninitialization completed!'))) as any
}) as {
  (content: React.ReactNode | DialogOptionsWithoutInput): Promise<boolean>
  (content: React.ReactNode | DialogOptions, input: string | ValidInputProps): Promise<string | null>
  (options: DialogOptionsWithInput): Promise<string | null>
}
