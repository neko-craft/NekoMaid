import React, { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@material-ui/core'
import { usePlugin } from '../Context'
import { minecraft } from '../../languages/zh_CN'

export const isBlock = (name: string) => ('item.minecraft.' + name) in minecraft
export const getName = (name: string) => (minecraft as any)['item.minecraft.' + name] || (minecraft as any)['block.minecraft.' + name]

interface Enchantment {
  id: string
  lvl: number
}
interface Display {
  Display?: string
  Color?: number
  Name?: string[]
}
interface AttributeModifier {
  Operation: boolean
  Amount: number
  UUID: string
  Slot: string
  AttributeName: string
  Name: string
}
interface Item {
  damage: number
  Enchantments?: Enchantment[]
  Display?: Display
  AttributeModifiers?: AttributeModifier[]
  Unbreakable?: boolean
  SkullOwner?: string
}

const ItemEditor: React.FC<{ onClose: () => void, open: boolean }> = ({ onClose, open }) => {
  const plugin = usePlugin()
  const [] = useState<Item | undefined>()
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
