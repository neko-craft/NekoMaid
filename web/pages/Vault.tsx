import React, { useEffect, useMemo, useState } from 'react'
import { useGlobalData, usePlugin } from '../Context'
import Plugin from '../Plugin'
import throttle from 'lodash/throttle'
import { DataGrid, GridCellParams, GridSortItem } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { action, success } from '../toast'
import { getSkin } from '../utils'
import lang, { minecraft } from '../../languages'
import dialog from '../dialog'
import isEqual from 'lodash/isEqual'

import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Container from '@mui/material/Container'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import Button from '@mui/material/Button'
import Autocomplete from '@mui/material/Autocomplete'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import ListItemText from '@mui/material/ListItemText'
import IconButton from '@mui/material/IconButton'
import ListItem from '@mui/material/ListItem'
import Tooltip from '@mui/material/Tooltip'
import DialogActions from '@mui/material/DialogActions'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import List from '@mui/material/List'
import ListItemIcon from '@mui/material/ListItemIcon'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'

import Close from '@mui/icons-material/Close'
import ListIcon from '@mui/icons-material/List'
import GroupsIcon from '@mui/icons-material/Groups'
import Check from '@mui/icons-material/Check'
import Search from '@mui/icons-material/Search'

interface PlayerInfo { id: string, balance?: number, group?: string, prefix?: string, suffix?: string }
interface GroupInfo { id: string, prefix?: string, suffix?: string }

const Groups: React.FC<{ plugin: Plugin, id: string | undefined, onClose: () => void, groups: GroupInfo[] }> =
  ({ plugin, id, onClose, groups }) => {
    const [loading, setLoading] = useState(true)
    const [playerGroups, setPlayerGroups] = useState<Record<string, true>>({ })
    const refresh = () => {
      setLoading(true)
      plugin.emit('vault:playerGroup', (res: string[]) => {
        if (!res) return
        const obj: Record<string, true> = { }
        res.forEach(it => (obj[it] = true))
        setPlayerGroups(obj)
        setLoading(false)
      }, id, null, 0)
    }
    useEffect(() => {
      setPlayerGroups({})
      if (!id) return
      refresh()
    }, [id])
    return <Dialog onClose={onClose} open={!!id}>
      <DialogTitle>{lang.vault.whosPermissionGroup(id!)}</DialogTitle>
      <List sx={{ pt: 0 }}>
        {groups.map(it => <ListItem onClick={() => { }} key={it.id}>
          <ListItemIcon><Checkbox
            tabIndex={-1}
            disabled={loading}
            checked={!!playerGroups[it.id]}
            onChange={e => plugin.emit('vault:playerGroup', (res: boolean) => {
              action(res)
              refresh()
            }, id, it.id, e.target.checked ? 1 : 2)}
          /></ListItemIcon>
          <ListItemText primary={it.id} />
        </ListItem>)}
      </List>
      <DialogActions><Button onClick={onClose}>{minecraft['gui.back']}</Button></DialogActions>
    </Dialog>
  }

const PermissionDialog: React.FC<{ plugin: Plugin, id: string | undefined, isGroup: boolean, onClose: () => void }> = ({ plugin, id, onClose, isGroup }) => {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<boolean | undefined>(false)
  const [options, setOptions] = useState<string[]>([])
  useEffect(() => {
    if (!id) return
    setValue('')
    setStatus(false)
    plugin.emit('vault:getAllPermissions', (it: any) => setOptions(it.sort()))
  }, [id])
  const queryStatus = useMemo(() => throttle((value: string) => plugin.emit('vault:permission', setStatus, id, value, 0, isGroup), 500), [id, isGroup])
  return <Dialog open={!!id} onClose={onClose}>
    <DialogTitle>{lang.vault.editorTitle}</DialogTitle>
    <DialogContent sx={{ overflow: 'hidden' }}>
      <DialogContentText>{lang.vault.permissionInput}: <span className='bold' style={{ }}>
        ({isGroup ? lang.vault.permissionGroup : minecraft['entity.minecraft.player']}: {id})</span></DialogContentText>
      <Autocomplete
        freeSolo
        options={options}
        sx={{ marginTop: 1 }}
        inputValue={value}
        renderInput={params => <TextField {...params as any} label={lang.vault.permission} />}
        onInputChange={(_, it) => {
          setValue(it)
          setStatus(undefined)
          queryStatus(it)
        }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', marginTop: 1 }}>
        {lang.status}:{status == null
          ? <CircularProgress size={20} sx={{ margin: '5px' }}/>
          : status ? <Check color='success' /> : <Close color='error' />}
        &nbsp;{status != null && <Button
          disabled={!value}
          variant='outlined'
          size='small'
          onClick={() => plugin.emit('vault:permission', (res: boolean) => {
            action(res)
            setStatus(undefined)
            queryStatus(value)
          }, id, value, status ? 2 : 1, isGroup)}
        >{lang.vault[status ? 'removePermission' : 'addPermission']}</Button>}
      </Box>
    </DialogContent>
    <DialogActions><Button onClick={onClose}>{minecraft['gui.back']}</Button></DialogActions>
  </Dialog>
}

const Vault: React.FC = () => {
  const navigate = useNavigate()
  const plugin = usePlugin()
  const globalData = useGlobalData()
  const { hasVaultPermission, hasVaultChat, vaultEconomy, hasVaultGroups } = globalData
  const [players, setPlayers] = useState<PlayerInfo[]>([])
  const [count, setCount] = useState(-1)
  const [page, setPage] = useState(0)
  const [sortModel, setSortModel] = useState<GridSortItem[]>([])
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [selectedPlayer, setSelectedPlayer] = useState<string | undefined>()
  const [isGroup, setIsGroup] = useState(false)
  const balanceSort = sortModel[0]?.sort
  const refresh = (res?: boolean) => {
    if (res != null) action(res)
    setCount(-1)
    plugin.emit('vault:fetch', (a, b) => {
      setCount(a)
      setPlayers(b)
    }, page, balanceSort)
  }
  useEffect(refresh, [page, balanceSort])
  useEffect(() => { plugin.emit('vault:fetchGroups', setGroups) }, [])

  const columns: any[] = [
    {
      field: '',
      sortable: false,
      width: 60,
      renderCell: (it: GridCellParams) => <Avatar
        src={getSkin(globalData, it.id, true)}
        imgProps={{ crossOrigin: 'anonymous', onClick () { navigate('/NekoMaid/playerList/' + it.id) }, style: { width: 40, height: 40 } }}
        variant='rounded'
        sx={{ cursor: 'pointer' }}
      />
    },
    {
      field: 'id',
      headerName: lang.username,
      sortable: false,
      width: 200
    }
  ]
  const columns2: any[] = [
    {
      field: 'id',
      headerName: lang.vault.groupName,
      sortable: false,
      width: 160
    }
  ]

  if (hasVaultGroups) {
    columns.push({
      field: 'group',
      headerName: lang.vault.defaultGroup,
      width: 110,
      sortable: false
    })
  }
  if (hasVaultChat) {
    const a = {
      field: 'prefix',
      headerName: lang.vault.prefix,
      width: 110,
      editable: true,
      sortable: false
    }
    const b = {
      field: 'suffix',
      headerName: lang.vault.suffix,
      width: 110,
      editable: true,
      sortable: false
    }
    columns.push(a, b)
    columns2.push(a, b)
  }
  if (vaultEconomy) {
    columns.push({
      field: 'balance',
      headerName: lang.vault.balance,
      editable: true,
      width: 110,
      valueFormatter: ({ value }: any) => (value === 0 || value === 1 ? vaultEconomy.singular : vaultEconomy.plural) +
        (vaultEconomy.digits === -1 ? value : value.toFixed(vaultEconomy.digits))
    })
  }
  if (hasVaultPermission) {
    columns.push({
      field: '_',
      headerName: lang.operations,
      width: 88,
      sortable: false,
      renderCell: (it: GridCellParams) => <>
        {hasVaultGroups && <Tooltip title={lang.vault.managePermissionGroup}>
          <IconButton onClick={() => setSelectedPlayer(it.id as any)} size='small'><GroupsIcon /></IconButton>
        </Tooltip>}
        <Tooltip title={lang.vault.managePermission}><IconButton onClick={() => {
          setSelectedId(it.id as any)
          setIsGroup(false)
        }} size='small'><ListIcon /></IconButton></Tooltip>
      </>
    })
    if (hasVaultGroups) {
      columns2.push({
        field: '_',
        headerName: lang.operations,
        width: 66,
        sortable: false,
        renderCell: (it: GridCellParams) => <Tooltip title={lang.vault.managePermission}><IconButton onClick={() => {
          setSelectedId(it.id as any)
          setIsGroup(true)
        }} size='small'><ListIcon /></IconButton></Tooltip>
      })
    }
  }

  const playerList = <Card>
    <CardHeader
      title={lang.playerList.title}
      action={<IconButton onClick={() => dialog(lang.playerList.nameToSearch, lang.username).then(filter => {
        if (!filter) return refresh()
        setCount(-1)
        plugin.emit('vault:fetch', (a, b) => {
          setCount(a)
          setPlayers(b)
          success()
        }, page, sortModel.find(it => it.field === 'balance'), filter.toLowerCase())
      })}
    ><Search /></IconButton>} />
    <Divider />
    <div style={{ height: 594, width: '100%' }}>
      <DataGrid
        pagination
        disableColumnMenu
        hideFooterSelectedRowCount
        rows={players}
        columns={columns}
        pageSize={10}
        rowCount={count === -1 ? 0 : count}
        loading={count === -1}
        onPageChange={setPage}
        paginationMode='server'
        sortingMode='server'
        sortModel={sortModel}
        onSortModelChange={it => !isEqual(sortModel, it) && setSortModel(it)}
        onCellEditCommit={({ field, id, value }) => {
          let flag = false
          switch (field) {
            case 'balance':
              if (isNaN(+value!)) refresh()
              else plugin.emit('vault:setBalance', refresh, id, +value!)
              break
            case 'prefix': flag = true
            // eslint-disable-next-line no-fallthrough
            case 'suffix':
              plugin.emit('vault:setChat', refresh, id, false, flag, value || null)
          }
        }}
      />
    </div>
  </Card>

  return <Box sx={{ minHeight: '100%', py: 3, '& .MuiDataGrid-root': { border: 'none' } }}>
    <Toolbar />
    <Container maxWidth={false}>
      {hasVaultGroups
        ? <Grid container spacing={3}>
        <Grid item lg={8} md={12} xl={8} xs={12}>{playerList}</Grid>
        <Grid item lg={4} md={12} xl={4} xs={12}>
          <Card>
            <CardHeader title={lang.vault.permissionGroup} />
            <Divider />
            <div style={{ height: 594, width: '100%' }}>
              <DataGrid
                hideFooter
                disableColumnMenu
                rows={groups}
                columns={columns2}
                onCellEditCommit={({ field, id, value }) => {
                  let flag = false
                  switch (field) {
                    case 'prefix': flag = true
                    // eslint-disable-next-line no-fallthrough
                    case 'suffix':
                      plugin.emit('vault:setChat', (res: boolean) => {
                        action(res)
                        plugin.emit('vault:fetchGroups', setGroups)
                      }, id, true, flag, value || null)
                  }
                }}
              />
            </div>
          </Card>
        </Grid>
        </Grid>
        : playerList}
    </Container>
    <PermissionDialog plugin={plugin} id={selectedId} onClose={() => setSelectedId(undefined)} isGroup={isGroup} />
    {hasVaultGroups && <Groups plugin={plugin} id={selectedPlayer} onClose={() => setSelectedPlayer(undefined)} groups={groups} />}
  </Box>
}

export default Vault
