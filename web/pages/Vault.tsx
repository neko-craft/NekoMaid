import React, { useEffect, useMemo, useState } from 'react'
import { useGlobalData, usePlugin } from '../Context'
import Plugin from '../Plugin'
import Avatar from '../components/Avatar'
import throttle from 'lodash/throttle'
import { Close, List as ListIcon, Groups as GroupsIcon, Check, Search } from '@material-ui/icons'
import { Box, Toolbar, Container, Card, CardHeader, Grid, DialogContent, DialogContentText, Button, Autocomplete,
  CircularProgress, Dialog, ListItemText, IconButton, ListItem, Tooltip, DialogActions, DialogTitle, TextField,
  List, ListItemIcon, Checkbox } from '@material-ui/core'
import { DataGrid, GridCellParams } from '@material-ui/data-grid'
import { useHistory } from 'react-router-dom'
import { action, success } from '../toast'
import dialog from '../dialog'

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
      <DialogTitle>{id} 的权限组</DialogTitle>
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
      <DialogActions><Button onClick={onClose}>关闭</Button></DialogActions>
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
    <DialogTitle>权限节点查询及修改</DialogTitle>
    <DialogContent sx={{ overflow: 'hidden' }}>
      <DialogContentText>请输入要查询的权限节点: <span className='bold' style={{ }}>({isGroup ? '权限组' : '玩家'}: {id})</span></DialogContentText>
      <Autocomplete
        freeSolo
        options={options}
        sx={{ marginTop: 1 }}
        inputValue={value}
        renderInput={params => <TextField {...params as any} label='权限节点' />}
        onInputChange={(_, it) => {
          setValue(it)
          setStatus(undefined)
          queryStatus(it)
        }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', marginTop: 1 }}>
        状态:{status == null ? <CircularProgress size={20} sx={{ margin: '5px' }}/> : status ? <Check color='success' /> : <Close color='error' />}
        &nbsp;{status != null && <Button
          disabled={!value}
          variant='outlined'
          size='small'
          onClick={() => plugin.emit('vault:permission', (res: boolean) => {
            action(res)
            setStatus(undefined)
            queryStatus(value)
          }, id, value, status ? 2 : 1, isGroup)}
        >{status ? '移除该权限节点' : '增加该权限节点'}</Button>}
      </Box>
    </DialogContent>
    <DialogActions><Button onClick={onClose}>关闭</Button></DialogActions>
  </Dialog>
}

const Vault: React.FC = () => {
  const his = useHistory()
  const plugin = usePlugin()
  const { hasVaultPermission, hasVaultChat, vaultEconomy, hasVaultGroups } = useGlobalData()
  const [players, setPlayers] = useState<PlayerInfo[]>([])
  const [count, setCount] = useState(-1)
  const [page, setPage] = useState(0)
  const [sortModel, setSortModel] = useState<Array<{ field: string, sort: 'asc' | 'desc' | undefined }>>([])
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [selectedPlayer, setSelectedPlayer] = useState<string | undefined>()
  const [isGroup, setIsGroup] = useState(false)
  const refresh = (res?: boolean) => {
    if (res != null) action(res)
    setCount(-1)
    plugin.emit('vault:fetch', (a, b) => {
      setCount(a)
      setPlayers(b)
    }, page, sortModel.find(it => it.field === 'balance'))
  }
  useEffect(refresh, [page, sortModel])
  useEffect(() => { plugin.emit('vault:fetchGroups', setGroups) }, [])

  const columns: any[] = [
    {
      field: '',
      sortable: false,
      width: 60,
      renderCell: (it: GridCellParams) => <Avatar
        src={`https://mc-heads.net/avatar/${it.id}/40`}
        imgProps={{ crossOrigin: 'anonymous', onClick () { his.push('/NekoMaid/playerList/' + it.id) } }}
        variant='rounded'
        sx={{ cursor: 'pointer' }}
      />
    },
    {
      field: 'id',
      headerName: '游戏名',
      sortable: false,
      width: 200
    }
  ]
  const columns2: any[] = [
    {
      field: 'id',
      headerName: '组名',
      sortable: false,
      width: 160
    }
  ]

  if (hasVaultGroups) {
    columns.push({
      field: 'group',
      headerName: '默认权限组',
      width: 110,
      sortable: false
    })
  }
  if (hasVaultChat) {
    const a = {
      field: 'prefix',
      headerName: '前缀',
      width: 110,
      editable: true,
      sortable: false
    }
    const b = {
      field: 'suffix',
      headerName: '后缀',
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
      headerName: '经济',
      editable: true,
      valueFormatter: ({ value }: any) => (value === 0 || value === 1 ? vaultEconomy.singular : vaultEconomy.plural) +
        (vaultEconomy.digits === -1 ? value : value.toFixed(vaultEconomy.digits))
    })
  }
  if (hasVaultPermission) {
    columns.push({
      field: '_',
      headerName: '操作',
      width: 88,
      sortable: false,
      renderCell: (it: GridCellParams) => <>
        <Tooltip title='权限组管理'><IconButton onClick={() => setSelectedPlayer(it.id as any)} size='small'><GroupsIcon /></IconButton></Tooltip>
        <Tooltip title='权限查询及修改'><IconButton onClick={() => {
          setSelectedId(it.id as any)
          setIsGroup(false)
        }} size='small'><ListIcon /></IconButton></Tooltip>
      </>
    })
    if (hasVaultGroups) {
      columns2.push({
        field: '_',
        headerName: '操作',
        width: 66,
        sortable: false,
        renderCell: (it: GridCellParams) => <Tooltip title='权限查询及修改'><IconButton onClick={() => {
          setSelectedId(it.id as any)
          setIsGroup(true)
        }} size='small'><ListIcon /></IconButton></Tooltip>
      })
    }
  }

  const playerList = <Card>
    <CardHeader title='玩家列表' action={<IconButton onClick={() => dialog('请输入你要查找的游戏名:', '游戏名').then(filter => {
      if (!filter) return refresh()
      setCount(-1)
      plugin.emit('vault:fetch', (a, b) => {
        setCount(a)
        setPlayers(b)
        success()
      }, page, sortModel.find(it => it.field === 'balance'), filter)
    })}><Search /></IconButton>} />
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
        onPageChange={it => setPage(it.page)}
        paginationMode='server'
        sortingMode='server'
        sortModel={sortModel}
        onSortModelChange={it => it.sortModel !== sortModel && setSortModel(it.sortModel as any)}
        onEditCellChangeCommitted={({ field, id, props: { value } }) => {
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

  return <Box sx={{ minHeight: '100%', py: 3 }}>
    <Toolbar />
    <Container maxWidth={false}>
      {hasVaultGroups
        ? <Grid container spacing={3}>
        <Grid item lg={8} md={12} xl={8} xs={12}>{playerList}</Grid>
        <Grid item lg={4} md={6} xl={4} xs={12}>
          <Card>
            <CardHeader title='权限组' />
            <div style={{ height: 594, width: '100%' }}>
              <DataGrid
                hideFooter
                disableColumnMenu
                rows={groups}
                columns={columns2}
                onEditCellChangeCommitted={({ field, id, props: { value } }) => {
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
