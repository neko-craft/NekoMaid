import React, { useEffect, useState } from 'react'
import { useGlobalData, usePlugin } from '../Context'
import Plugin from '../Plugin'
import Avatar from '../components/Avatar'
import { Close, PersonAdd, PersonSearch, PersonRemove, Groups as GroupsIcon } from '@material-ui/icons'
import { Box, Toolbar, Container, Card, CardHeader, Grid,
  Dialog, AppBar, IconButton, Slide, Typography, Tooltip } from '@material-ui/core'
import { DataGrid, GridCellParams } from '@material-ui/data-grid'
import { action } from '../toast'

interface PlayerInfo { id: string, balance?: number, group?: string, prefix?: string, suffix?: string, groups?: string[] }
interface GroupInfo { id: string, prefix?: string, suffix?: string }

const Transition: any = React.forwardRef((props: any, ref) => <Slide direction='up' ref={ref} {...props} />)
const Groups: React.FC<{ plugin: Plugin, id: string | undefined, isGroup: boolean, onClose: () => void }> = ({ plugin, id, onClose, isGroup }) => {
  return <Dialog fullScreen open={!!id} onClose={onClose} TransitionComponent={Transition}>
    <AppBar sx={{ position: 'relative' }}>
      <Toolbar>
        <IconButton edge='start' color='inherit' onClick={onClose}><Close /></IconButton>
        <Typography variant='h4'>编辑权限节点 <span className='bold'>({isGroup ? '权限组' : '玩家'}: {id})</span></Typography>
      </Toolbar>
    </AppBar>
  </Dialog>
}

const Vault: React.FC = () => {
  const plugin = usePlugin()
  const { hasVaultPermission, hasVaultChat, vaultEconomy, hasVaultGroups } = useGlobalData()
  const [players, setPlayers] = useState<PlayerInfo[]>([])
  const [count, setCount] = useState(-1)
  const [page, setPage] = useState(0)
  const [sortModel, setSortModel] = useState<Array<{ field: string, sort: 'asc' | 'desc' | undefined }>>([])
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [isGroup] = useState(false)
  const refresh = (res?: boolean) => {
    if (res != null) action(res)
    setCount(-1)
    plugin.emit('vault:fetch', (a, b) => {
      setCount(a)
      setPlayers(b)
    }, page, sortModel.find(it => it.field === 'balance'))
  }
  useEffect(refresh, [page, sortModel])
  useEffect(() => {
    plugin.emit('vault:fetchGroups', setGroups)
  }, [])

  const columns: any[] = [
    {
      field: '',
      sortable: false,
      width: 60,
      renderCell: (it: GridCellParams) => <Avatar
        src={`https://mc-heads.net/avatar/${it.id}/40`}
        imgProps={{ crossOrigin: 'anonymous' }}
        variant='rounded'
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
      width: 150,
      editable: true,
      valueFormatter: ({ value }: any) => (value === 0 || value === 1 ? vaultEconomy.singular : vaultEconomy.plural) +
        (vaultEconomy.digits === -1 ? value : value.toFixed(vaultEconomy.digits))
    })
  }
  if (hasVaultPermission) {
    columns.push({
      field: '_',
      headerName: '操作',
      width: 154,
      sortable: false,
      renderCell: (it: GridCellParams) => <>
        <Tooltip title='权限组管理'><IconButton onClick={() => { }} size='small'><GroupsIcon /></IconButton></Tooltip>
        <Tooltip title='查找玩家是否有某权限'><IconButton onClick={() => { }} size='small'><PersonSearch /></IconButton></Tooltip>
        <Tooltip title='给玩家增加权限'><IconButton onClick={() => { }} size='small'><PersonAdd /></IconButton></Tooltip>
        <Tooltip title='删除玩家的权限'><IconButton onClick={() => { }} size='small'><PersonRemove /></IconButton></Tooltip>
      </>
    })
    if (hasVaultGroups) {
      columns2.push({
        field: '_',
        headerName: '操作',
        width: 120,
        sortable: false,
        renderCell: (it: GridCellParams) => <>
          <Tooltip title='查找该组是否有某权限'><IconButton onClick={() => { }} size='small'><PersonSearch /></IconButton></Tooltip>
          <Tooltip title='给该组增加权限'><IconButton onClick={() => { }} size='small'><PersonAdd /></IconButton></Tooltip>
          <Tooltip title='删除该组的权限'><IconButton onClick={() => { }} size='small'><PersonRemove /></IconButton></Tooltip>
        </>
      })
    }
  }

  const playerList = <Card>
    <CardHeader title='玩家列表' />
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
                      plugin.emit('vault:setChat', refresh, id, true, flag, value || null)
                  }
                }}
              />
            </div>
          </Card>
        </Grid>
        </Grid>
        : playerList}
    </Container>
    <Groups plugin={plugin} id={selectedId} onClose={() => setSelectedId(undefined)} isGroup={isGroup} />
  </Box>
}

export default Vault
