import React, { useState, useEffect } from 'react'
import { HelpOutline } from '@material-ui/icons'
import { UnControlled } from 'react-codemirror2'
import { useTheme } from '@material-ui/core/styles'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Paper, Tooltip, Drawer,
  Tab, Tabs, Chip, Box, useMediaQuery, Autocomplete, TextField, Grid, Checkbox, Select,
  FormControlLabel, MenuItem, FormControl, InputLabel } from '@material-ui/core'
import { useGlobalData, usePlugin } from '../Context'
import { parseComponent, stringifyTextComponent } from '../utils'
import MojangSON, { parse, stringify, Byte, Short } from 'nbt-ts'
import lang, { minecraft } from '../../languages'
import set from 'lodash/set'
import * as icons from '../../minecraftIcons.json'

import type { PaperProps } from '@material-ui/core/Paper'

export interface Enchantment extends MojangSON.TagObject {
  id: string
  lvl: MojangSON.Short
}
export interface Display extends MojangSON.TagObject {
  Name?: string
  Color?: MojangSON.Int
  Lore?: string[]
}
export interface AttributeModifier extends MojangSON.TagObject {
  Operation: MojangSON.Byte
  Amount: MojangSON.Float
  UUID: string
  Slot: string
  AttributeName: string
  Name: string
}
export interface Tag extends MojangSON.TagObject {
  Damage: MojangSON.Int
  Enchantments?: Enchantment[]
  display?: Display
  AttributeModifiers?: AttributeModifier[]
  Unbreakable?: MojangSON.Byte
  SkullOwner?: {
    Id?: number[],
    Properties?: { textures: Array<{ Value: string }> }
  }
}

export interface NBT extends MojangSON.TagObject {
  Count: MojangSON.Byte
  id: string
  tag?: Tag
}

export interface Item {
  type: string
  name?: string
  icon?: string
  hasEnchants?: boolean
  amount?: number
  nbt?: string
}

export const isBlock = (name: string) => ('item.minecraft.' + name) in minecraft
export const getName = (name: string) => minecraft['item.minecraft.' + name] || minecraft['block.minecraft.' + name]
export const getEnchantmentName = (it: string | Enchantment) => {
  const name = minecraft['enchantment.' + (typeof it === 'string' ? it : it.id).replace(/:/g, '.')] || lang.itemEditor.unknownEnchantment
  return typeof it === 'string' ? name : name + ' ' + it.lvl.value
}

export enum InvType {
  // eslint-disable-next-line no-unused-vars
  PLAYER = 'PLAYER',
  // eslint-disable-next-line no-unused-vars
  ENDER_CHEST = 'ENDER_CHEST',
  // eslint-disable-next-line no-unused-vars
  GLOBAL_ITEMS = 'GLOBAL_ITEMS',
  // eslint-disable-next-line no-unused-vars
  BLOCK = 'BLOCK',
  // eslint-disable-next-line no-unused-vars
  ENTITY = 'ENTITY'
}

export type ItemViewerProps = Omit<PaperProps, 'onDrop' | 'onDrag'> & {
  item?: Item | null
  data?: any
  onDrag?: (data: any) => void
  onDrop?: (item: Item, data: any) => void
  onEdit?: (item?: Item | null | false) => void
}

const ItemViewer: React.FC<ItemViewerProps> = ({ item, data, onDrag, onDrop, onEdit, onClick, ...props }) => {
  const globalData = useGlobalData()
  const lowerCase = item ? item.type.toLowerCase() : ''
  const type = item ? item.icon || lowerCase : ''
  const hasEnchants = item?.hasEnchants && type in icons
  const nbt: NBT | null = item?.nbt ? parse(item.nbt) as any as NBT : null
  const elm = <Paper
    {...props}
    onDragOver={globalData.hasNBTAPI && onDrop
      ? e => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }
      : undefined}
    onDrop={globalData.hasNBTAPI && onDrop
      ? e => {
        e.preventDefault()
        const obj = JSON.parse(e.dataTransfer.getData('application/json'))
        if (obj.item) onDrop(obj.item, obj.data)
      }
      : undefined}
    onClick={onClick || (globalData.hasNBTAPI && onEdit
      ? () => openItemEditor(item).then(onEdit)
      : undefined)}
    sx={{
      width: '40px',
      height: '40px',
      display: 'inline-block',
      margin: 0.5,
      position: 'relative',
      overflow: 'hidden',
      userSelect: 'none',
      cursor: globalData.hasNBTAPI && (onEdit || onDrag) ? 'pointer' : undefined,
      backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)',
      '& span': {
        position: 'absolute',
        right: 2,
        bottom: -5,
        pointerEvents: 'none',
        textShadow: theme => theme.palette.mode === 'light'
          ? '#fff 1px 0 0, #fff 0 1px 0, #fff -1px 0 0, #fff 0 -1px 0'
          : '#000 1px 0 0, #000 0 1px 0, #000 -1px 0 0, #000 0 -1px 0'
      }
    }}
  >
    {item && <div
      onMouseDown={() => window.getSelection()?.removeAllRanges()}
      draggable={!!onDrag}
      onDragStart={onDrag
        ? e => {
          e.dataTransfer.effectAllowed = 'copyMove'
          e.dataTransfer.setData('application/json', JSON.stringify({ item, data }))
          onDrag(data)
        }
        : undefined}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        left: 0,
        bottom: 0,
        backgroundSize: 'cover',
        imageRendering: 'pixelated',
        filter: hasEnchants ? 'brightness(1.5)' : undefined,
        WebkitMaskSize: 'cover',
        maskImage: !hasEnchants && type in icons ? `url(/icons/minecraft/${type}.png)` : undefined,
        WebkitMaskImage: !hasEnchants && type in icons ? `url(/icons/minecraft/${type}.png)` : undefined,
        backgroundImage: item && type in icons ? `url(/icons/minecraft/${type}.png)` : undefined
      }}
    >
      {item && (item.type === 'PLAYER_HEAD' && nbt?.tag?.SkullOwner?.Id
        ? <img
          crossOrigin='anonymous'
          src={`https://mc-heads.net/head/${nbt.tag.SkullOwner.Id.reduce((s, it) => s + (it >>> 0).toString(16), '')}/30`}
        />
        : !(type in icons) && type !== 'air' && <HelpOutline sx={{ position: 'absolute', left: 8, top: 8 }} />)}
      {hasEnchants && type !== 'air' && <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        opacity: 0.5,
        WebkitMaskSize: 'cover',
        filter: 'blur(1px) brightness(1.7)',
        maskImage: `url(/icons/minecraft/${type}.png)`,
        WebkitMaskImage: `url(/icons/minecraft/${type}.png)`,
        animation: 'enchants-animation 6s infinite linear',
        backgroundPositionY: 128,
        backgroundImage: 'url(/icons/minecraft/enchanted_item_glint.png)'
      }} />}
    </div>}
    {item && item.amount && item.amount > 1 ? <span>{item.amount}</span> : null}
  </Paper>
  const nbtTexts = nbt
    ? <>
      {nbt.tag?.display?.Lore?.map((it, i) => <React.Fragment key={i}>{parseComponent(JSON.parse(it))}<br /></React.Fragment>)}
      {nbt.tag?.Enchantments?.length
        ? nbt.tag?.Enchantments.map((it, i) => <React.Fragment key={i}><br />{getEnchantmentName(it)}</React.Fragment>)
        : null}
      {nbt.tag?.Unbreakable?.value === 1 && <><br />{minecraft['item.unbreakable']}</>}
    </>
    : null
  return item
    ? <Tooltip title={<>
      <h3 style={{ margin: 0 }}>{nbt?.tag?.display?.Name
        ? parseComponent(JSON.parse(nbt.tag.display.Name))
        : item.name ? parseComponent(item.name) : getName(lowerCase)}</h3>
      {nbtTexts}
    </>}>{elm}</Tooltip>
    : elm
}

export default ItemViewer

let _setItem: any
let _resolve: any
export const openItemEditor = (it?: Item | null): Promise<Item | null | undefined | false> => _setItem
  ? new Promise(resolve => {
    _resolve = resolve
    _setItem(it ? { ...it } : { type: 'AIR', amount: 1, hasEnchants: false })
  })
  : Promise.resolve(it)

let enchantments: string[] = []
const ItemEditor: React.FC = () => {
  const plugin = usePlugin()
  const theme = useTheme()
  const [item, setItem] = useState<Item | undefined>()
  const [types, setTypes] = useState<string[]>([])
  const [tab, setTab] = useState(0)
  const [level, setLevel] = useState(1)
  const [enchantment, setEnchantment] = useState<string | undefined>()
  const [nbtText, setNBTText] = useState('')
  const nbt: NBT = item?.nbt ? parse(item.nbt) : { id: 'minecraft:' + (item?.type || 'air').toLowerCase(), Count: new Byte(1) } as any
  useEffect(() => {
    if (!item || types.length) return
    plugin.emit('item:fetch', (a: string[], b: string[]) => {
      setTypes(a)
      enchantments = b
    })
  }, [item])
  useEffect(() => {
    _setItem = (it: any) => {
      setItem(it)
      setNBTText(it.nbt ? stringify(parse(it.nbt), { pretty: true }) : '')
    }
    return () => { _setItem = null }
  }, [])
  const cancel = () => {
    setItem(undefined)
    if (_resolve) {
      _resolve(false)
      _resolve = null
    }
  }
  const update = () => {
    const newItem: any = { ...item }
    if (nbt) {
      newItem.nbt = stringify(nbt as any)
      setNBTText(stringify(nbt, { pretty: true }))
    }
    setItem(newItem)
  }
  const isAir = item?.type === 'AIR'
  const name = nbt?.tag?.display?.Name
  const enchantmentMap: Record<string, true> = { }
  return <Dialog open={!!item} onClose={cancel}>
    <DialogTitle>{lang.itemEditor.title}</DialogTitle>
    <DialogContent sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
      {item && <Box sx={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
        <ItemViewer item={item} />
        <Autocomplete
          options={types}
          sx={{ maxWidth: 300, marginLeft: 1, flexGrow: 1 }}
          value={item?.type}
          onChange={(_, it) => {
            item.type = it || 'AIR'
            if (nbt) nbt.id = 'minecraft:' + (it ? it.toLowerCase() : 'air')
            update()
          }}
          getOptionLabel={it => getName(it.toLowerCase()) + ' ' + it}
          renderInput={(params) => <TextField {...params} label={lang.itemEditor.itemType} size='small' variant='standard' />}
        />
      </Box>}
      <Tabs centered value={tab} onChange={(_, it) => setTab(it)} sx={{ marginBottom: 2 }}>
        <Tab label={lang.itemEditor.baseAttribute} disabled={isAir} />
        <Tab label={minecraft['container.enchant']} disabled={isAir} />
        <Tab label='NBT' disabled={isAir} />
      </Tabs>
      {nbt && tab === 0 && <Grid container spacing={1} rowSpacing={1}>
        <Grid item xs={12} md={6}><TextField
          fullWidth
          label={lang.itemEditor.count}
          type='number'
          variant='standard'
          value={nbt.Count}
          disabled={isAir}
          onChange={e => {
            nbt.Count = new Byte(item!.amount = parseInt(e.target.value))
            update()
          }}
        /></Grid>
        <Grid item xs={12} md={6}><TextField
          fullWidth
          label={lang.itemEditor.damage}
          type='number'
          variant='standard'
          value={nbt.tag?.Damage}
          disabled={isAir}
          onChange={e => {
            set(nbt, 'tag.Damage', parseInt(e.target.value))
            update()
          }}
        /></Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label={lang.itemEditor.displayName}
            variant='standard'
            disabled={isAir}
            value={name ? stringifyTextComponent(JSON.parse(name)) : ''}
            onChange={e => {
              set(nbt, 'tag.display.Name', JSON.stringify(item!.name = e.target.value))
              update()
            }}
          />
          <FormControlLabel
            label={minecraft['item.unbreakable']}
            disabled={isAir}
            checked={nbt.tag?.Unbreakable?.value === 1}
            control={<Checkbox
              checked={nbt.tag?.Unbreakable?.value === 1}
              onChange={e => {
                set(nbt, 'tag.Unbreakable', new Byte(+e.target.checked))
                update()
              }} />
            }
          />
        </Grid>
        <Grid item xs={12} md={6}><TextField
          fullWidth
          multiline
          label={lang.itemEditor.lore}
          variant='standard'
          maxRows={5}
          disabled={isAir}
          value={nbt.tag?.display?.Lore?.map(l => stringifyTextComponent(JSON.parse(l)))?.join('\n') || ''}
          onChange={e => {
            set(nbt, 'tag.display.Lore', e.target.value.split('\n').map(text => JSON.stringify(text)))
            update()
          }}
        /></Grid>
      </Grid>}
      {nbt && tab === 1 && <Grid container spacing={1} sx={{ width: '100%' }}>
        {nbt.tag?.Enchantments?.map((it, i) => {
          enchantmentMap[it.id] = true
          return <Grid item key={i}><Chip label={getEnchantmentName(it)} onDelete={() => {
            nbt?.tag?.Enchantments?.splice(i, 1)
            update()
          }} /></Grid>
        })}
        <Grid item><Chip label={lang.itemEditor.newEnchantment} color='primary' onClick={() => {
          setEnchantment('')
          setLevel(1)
        }} /></Grid>
        <Dialog onClose={() => setEnchantment(undefined)} open={enchantment != null}>
          <DialogTitle>{lang.itemEditor.newEnchantmentTitle}</DialogTitle>
          <DialogContent>
            <Box component='form' sx={{ display: 'flex', flexWrap: 'wrap' }}>
              <FormControl variant='standard' sx={{ m: 1, minWidth: 120 }}>
                <InputLabel htmlFor='item-editor-enchantment-selector'>{minecraft['container.enchant']}</InputLabel>
                <Select
                  id='item-editor-enchantment-selector'
                  label={minecraft['container.enchant']}
                  value={enchantment || ''}
                  onChange={e => setEnchantment(e.target.value)}
                >{enchantments
                  .filter(e => !(e in enchantmentMap))
                  .map(it => <MenuItem key={it} value={it}>{getEnchantmentName(it)}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl sx={{ m: 1, minWidth: 120 }}>
                <TextField
                  label={lang.itemEditor.level}
                  type='number'
                  variant='standard'
                  value={level}
                  onChange={e => setLevel(parseInt(e.target.value))}
                />
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEnchantment(undefined)}>{minecraft['gui.cancel']}</Button>
            <Button disabled={!enchantment || isNaN(level)} onClick={() => {
              nbt?.tag?.Enchantments?.push({ id: enchantment!, lvl: new Short(level) })
              setEnchantment(undefined)
              update()
            }}>{minecraft['gui.ok']}</Button>
          </DialogActions>
        </Dialog>
      </Grid>}
    </DialogContent>
    {nbt && tab === 2 && <Box sx={{ '& .CodeMirror': { width: '100%' } }}>
      <UnControlled
        value={nbtText}
        options={{
          mode: 'javascript',
          theme: theme.palette.mode === 'dark' ? 'material' : 'one-light'
        }}
        onChange={(_: any, __: any, nbt: string) => {
          const n = parse(nbt) as any as NBT
          const newItem: any = { ...item, nbt }
          if (n.Count?.value != null) newItem.amount = n.Count.value
          setItem(newItem)
        }}
      />
    </Box>}
    <DialogActions>
      <Button onClick={cancel}>{minecraft['gui.cancel']}</Button>
      <Button onClick={() => {
        setItem(undefined)
        if (_resolve) {
          _resolve(!item || item.type === 'AIR' ? null : item)
          _resolve = null
        }
      }}>{minecraft['gui.ok']}</Button>
    </DialogActions>
  </Dialog>
}

export const GlobalItems: React.FC<{ open: boolean, onClose: () => void }> = ({ open, onClose }) => {
  const matches = useMediaQuery((theme: any) => theme.breakpoints.down('md'))
  const [flag, update] = useState(0)
  const [copyItemLeft, setCopyItemLeft] = useState<Item | undefined>()
  const [copyItemRight, setCopyItemRight] = useState<Item | undefined>()
  const items: Array<Item | undefined> = JSON.parse(localStorage.getItem('NekoMaid:items') || '[]')
  const save = () => {
    localStorage.setItem('NekoMaid:items', JSON.stringify(items))
    process.nextTick(update, flag + 1)
  }
  return <Drawer anchor='bottom' variant='persistent' elevation={16} open={open} PaperProps={{ elevation: 16 }}>
    <Box sx={{ padding: 2, display: 'flex', justifyContent: 'center', paddingBottom: 0, alignItems: 'center' }}>
      <ItemViewer
        item={copyItemLeft}
        data={{ type: InvType.GLOBAL_ITEMS }}
        onDrag={() => process.nextTick(setCopyItemLeft)}
        onDrop={it => {
          setCopyItemLeft(it)
          setCopyItemRight(it)
        }}
      />&nbsp;{`< ${lang.itemEditor.clone} >`}&nbsp;<ItemViewer
        item={copyItemRight}
        data={{ type: InvType.GLOBAL_ITEMS }}
        onDrag={() => process.nextTick(setCopyItemRight)}
        onDrop={it => {
          setCopyItemLeft(it)
          setCopyItemRight(it)
        }}
      />
    </Box>
    <Box sx={{ padding: 2, display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
      {Array.from({ length: 14 }, (_, i) => <ItemViewer
        key={i}
        item={items[i]}
        data={{ type: InvType.GLOBAL_ITEMS }}
        onDrag={() => {
          items[i] = undefined
          save()
          if (matches) process.nextTick(onClose)
        }}
        onDrop={it => {
          items[i] = it
          save()
        }}
        onEdit={item => {
          if (item === false) return
          items[i] = item || undefined
          save()
        }}
      />)}
    </Box>
    <ItemEditor />
  </Drawer>
}
