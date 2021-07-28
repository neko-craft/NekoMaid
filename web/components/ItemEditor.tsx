import React, { useState, useEffect } from 'react'
import { HelpOutline } from '@material-ui/icons'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Paper, Tooltip } from '@material-ui/core'
import { /* useGlobalData, */ usePlugin } from '../Context'
import { minecraft } from '../../languages/zh_CN'
import { parseComponent } from '../utils'
import MojangSON, { parse } from 'nbt-ts'
import * as icons from '../../minecraftIcons.json'

export const isBlock = (name: string) => ('item.minecraft.' + name) in minecraft
export const getName = (name: string) => (minecraft as any)['item.minecraft.' + name] || (minecraft as any)['block.minecraft.' + name]

export interface Enchantment {
  id: string
  lvl: MojangSON.Short
}
export interface Display {
  Name?: string
  Color?: MojangSON.Int
  Lore?: string[]
}
export interface AttributeModifier {
  Operation: MojangSON.Byte
  Amount: MojangSON.Float
  UUID: string
  Slot: string
  AttributeName: string
  Name: string
}
export interface NBT {
  Damage: MojangSON.Int
  Enchantments?: Enchantment[]
  display?: Display
  AttributeModifiers?: AttributeModifier[]
  Unbreakable?: MojangSON.Byte
  SkullOwner?: string
}

export interface Item {
  type: string
  icon?: string
  hasEnchants: boolean
  amount: number
  nbt?: string
}

export const ItemViewer: React.FC<{ item?: Item | null, id?: any, onDrag?: (id: any) => void, onDrop?: (item: Item, id: any) => void }> =
  ({ item, id, onDrag, onDrop }) => {
    // const globalData = useGlobalData()
    const lowerCase = item ? item.type.toLowerCase() : ''
    const type = item ? item.icon || lowerCase : ''
    const hasEnchants = item?.hasEnchants && type in icons
    const nbt: NBT | null = item?.nbt ? parse(item.nbt) as any as NBT : null
    const elm = <Paper
      onDragOver={onDrop
        ? e => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
        }
        : undefined}
      onDrop={onDrop
        ? e => {
          e.preventDefault()
          const obj = JSON.parse(e.dataTransfer.getData('application/json'))
          if (obj.item) onDrop(obj.item, obj.id)
        }
        : undefined}
      sx={{
        width: '40px',
        height: '40px',
        display: 'inline-block',
        marginRight: 1,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)',
        '& span': {
          position: 'absolute',
          right: 2,
          bottom: -5,
          textShadow: theme => theme.palette.mode === 'light'
            ? '#fff 1px 0 0, #fff 0 1px 0, #fff -1px 0 0, #fff 0 -1px 0'
            : '#000 1px 0 0, #000 0 1px 0, #000 -1px 0 0, #000 0 -1px 0'
        }
      }}
    >
      {item && <div
        draggable={!!onDrag}
        onDragStart={onDrag
          ? e => {
            e.dataTransfer.effectAllowed = 'copyMove'
            e.dataTransfer.setData('application/json', JSON.stringify({ item, id }))
            onDrag(id)
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
        {hasEnchants && <div style={{
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
      {item && !(type in icons) && <HelpOutline sx={{ position: 'absolute', left: 8, top: 8 }} />}
      {item && item.amount > 1 ? <span>{item.amount}</span> : null}
    </Paper>
    const nbtTexts = nbt
      ? <>
        {nbt.display?.Lore?.map((it, i) => <React.Fragment key={i}>{parseComponent(it)}<br /></React.Fragment>)}
        {nbt.Enchantments?.length
          ? nbt.Enchantments.map((it, i) => <React.Fragment key={i}><br />
            {(minecraft as any)['enchantment.' + it.id.replace(/:/g, '.')] || '未知附魔'} {it.lvl.value}
          </React.Fragment>)
          : null}
      </>
      : null
    return item
      ? <Tooltip title={<>
        <h3 style={{ margin: 0 }}>{nbt?.display?.Name ? parseComponent(JSON.parse(nbt.display.Name)) : getName(lowerCase)}</h3>
        {nbtTexts}
      </>}>{elm}</Tooltip>
      : elm
  }

const ItemEditor: React.FC<{ onClose: () => void, open: boolean }> = ({ onClose, open }) => {
  const plugin = usePlugin()
  useState<Item | undefined>()
  useEffect(() => {
    plugin.emit('item:create', console.log, 'NETHERITE_AXE')
  }, [])
  return <Dialog open={open} onClose={onClose}>
    <DialogTitle>物品编辑器</DialogTitle>
    <DialogContent>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>关闭</Button>
      <Button onClick={onClose} autoFocus>确认</Button>
    </DialogActions>
  </Dialog>
}

export default ItemEditor
