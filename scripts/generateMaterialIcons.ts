import { writeFileSync } from 'fs'
import { folderIcons } from '../vscode-material-icon-theme/src/icons/folderIcons'
import { fileIcons } from '../vscode-material-icon-theme/src/icons/fileIcons'

const icons: string[] = []
const iconsMap: Record<string, number> = { }
const folders: Record<string, number> = { }
const files: Record<string, number> = { }
const extensions: Record<string, number> = { }

folderIcons[0].icons!.forEach(it => {
  let id = iconsMap[it.name]
  if (id == null) id = iconsMap[it.name] = icons.push(it.name) - 1
  it.folderNames.forEach(n => (folders[n] = id))
})
fileIcons.icons!.forEach(it => {
  let id = iconsMap[it.name]
  if (id == null) id = iconsMap[it.name] = icons.push(it.name) - 1
  it.fileNames?.forEach(n => (files[n] = id))
  it.fileExtensions?.forEach(n => (extensions[n] = id))
})

writeFileSync('icons.json', JSON.stringify({ icons, folders, files, extensions }))
console.log('Success!')
