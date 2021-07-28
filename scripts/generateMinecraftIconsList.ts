import { readdirSync, writeFileSync, renameSync } from 'fs'

const map: Record<string, 0> = { }
readdirSync('icons/minecraft').forEach(it => {
  if (it.endsWith('_inventory.png')) {
    const name = it.replace('_inventory', '')
    renameSync('icons/minecraft/' + it, 'icons/minecraft/' + name)
    it = name
  }
  map[it.replace(/\.png$/, '')] = 0
})
writeFileSync('minecraftIcons.json', JSON.stringify(map))
console.log('Sccuessfully generated minecraftIcons.json!')
