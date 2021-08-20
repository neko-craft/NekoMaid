import React, { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions, Button, Autocomplete } from '@material-ui/core'

import type { DialogProps } from '@material-ui/core/Dialog'
import lang, { minecraft } from '../../languages'

const ServerSwitch: React.FC<DialogProps> = props => {
  const [value, setValue] = useState<string>('')
  let error = false
  // eslint-disable-next-line no-new
  try { if (value) new URL(value.startsWith('http://') ? value : 'http://' + value) } catch { error = true }
  return <Dialog fullWidth maxWidth='xs' {...props}>
    <DialogTitle>{lang.serverSwitch.title}</DialogTitle>
    <DialogContent sx={{ overflow: 'hidden' }}>
      <Autocomplete
        freeSolo
        inputValue={value}
        onInputChange={(_: any, v: string) => setValue(v)}
        noOptionsText={lang.serverSwitch.noServer}
        style={{ width: '100%', maxWidth: 500, marginTop: 10 }}
        options={JSON.parse(localStorage.getItem('NekoMaid:servers') || '[]')}
        getOptionLabel={(option: any) => option.address}
        renderInput={(props: any) => <TextField
          {...props}
          error={error}
          label={minecraft['addServer.enterIp']}
          helperText={error ? lang.serverSwitch.wrongHostname : undefined}
        />}
      />
      <DialogContentText>{lang.serverSwitch.content}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button
        color='primary'
        disabled={error}
        onClick={() => (location.search = '?' + encodeURIComponent(value))}
      >{lang.serverSwitch.connect}</Button>
    </DialogActions>
  </Dialog>
}

export default ServerSwitch
