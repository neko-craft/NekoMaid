import React, { useEffect, useState } from 'react'
import TextField, { TextFieldProps } from '@mui/material/TextField'

export type ValidInputProps = TextFieldProps & {
  onStatusChange?: (it: boolean) => void
  validator?: (text: string) => React.ReactNode | null | undefined | boolean
}

const ValidInput: React.FC<ValidInputProps> = ({ validator, error: defaultError, onChange, helperText, onStatusChange, ...props }) => {
  const [error, setError] = useState<React.ReactNode | undefined>(defaultError ? helperText : undefined)
  if (onStatusChange) useEffect(() => onStatusChange(defaultError || false), [])
  return <TextField
    {...props}
    error={!!error}
    helperText={error}
    onChange={validator
      ? e => {
        const it = validator(e.target.value)
        const cur = typeof it === 'boolean' ? it ? null : helperText : it || undefined
        setError(cur)
        if (onStatusChange && !cur !== !error) onStatusChange(!!cur)
        if (onChange) onChange(e)
      }
      : onChange
    }
  />
}

export default ValidInput
