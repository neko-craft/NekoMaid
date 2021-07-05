import React, { useState } from 'react'
import TextField, { TextFieldProps } from '@material-ui/core/TextField'

export type Props = TextFieldProps & { validator?: (text: string) => React.ReactNode | null | undefined | boolean }

const ValidInput: React.FC<Props> = ({ validator, error: defaultError, onChange, helperText, ...props }) => {
  const [error, setError] = useState<React.ReactNode | undefined>(defaultError ? helperText : undefined)
  return <TextField
    {...props}
    error={!!error}
    helperText={error}
    onChange={validator
      ? e => {
        const it = validator(e.target.value)
        setError(typeof it === 'boolean' ? it ? null : helperText : it || undefined)
        if (onChange) onChange(e)
      }
      : undefined
    }
  />
}

export default ValidInput
