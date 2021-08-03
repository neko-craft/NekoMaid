import React, { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions, Button, Autocomplete } from '@material-ui/core'

import type { DialogProps } from '@material-ui/core/Dialog'

const ServerSwitch: React.FC<DialogProps> = props => {
  const [value, setValue] = useState<string>('')
  let error = false
  // eslint-disable-next-line no-new
  try { if (value) new URL(value.startsWith('http://') ? value : 'http://' + value) } catch { error = true }
  return <Dialog fullWidth maxWidth='xs' {...props}>
    <DialogTitle>连接到服务器</DialogTitle>
    <DialogContent sx={{ overflow: 'hidden' }}>
      <Autocomplete
        freeSolo
        inputValue={value}
        onInputChange={(_: any, v: string) => setValue(v)}
        noOptionsText='你还没有连接过任何服务器!'
        style={{ width: '100%', maxWidth: 500, marginTop: 10 }}
        options={JSON.parse(localStorage.getItem('NekoMaid:servers') || '[]')}
        getOptionLabel={(option: any) => option.address}
        renderInput={(props: any) => <TextField {...props} error={error} label='服务器地址' helperText={error ? '请输入正确的连接地址!' : undefined} />}
      />
      <DialogContentText>请选择或输入要连接的服务器地址.</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button color='primary' disabled={error} onClick={() => (location.search = '?' + encodeURIComponent(value))}>连接</Button>
    </DialogActions>
  </Dialog>
}

export default ServerSwitch
