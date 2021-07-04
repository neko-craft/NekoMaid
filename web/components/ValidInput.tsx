import React, { useState } from 'react'
import TextField, { TextFieldProps } from '@material-ui/core/TextField'

export type Props = TextFieldProps & { validator?: (text: string) => React.ReactNode | null | undefined }

const ValidInput: React.FC<Props> = ({ validator, error: defaultError, onChange, helperText, ...props }) => {
  const [error, setError] = useState<React.ReactNode | undefined>(defaultError ? helperText || undefined : undefined)
  return <TextField
    {...props}
    error={!!error}
    helperText={error}
    onChange={validator
      ? e => {
        setError(validator(e.target.value) || undefined)
        if (onChange) onChange(e)
      }
      : undefined
    }
  />
}

export default ValidInput