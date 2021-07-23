import fetchVersion, { exit, get } from './fetchMinecraftVersion'
import { existsSync, mkdirSync } from 'fs'

if (!existsSync('languages/minecraft')) mkdirSync('languages/minecraft')

const supportLanguages = ['zh_cn']
fetchVersion().then(body => get<{ objects: Record<string, { hash: string }> }>(body.assetIndex.url).then(body => supportLanguages.forEach(it => {
  const { hash } = body.objects[`minecraft/lang/${it}.json`]
  require('nugget')(`http://resources.download.minecraft.net/${hash.slice(0, 2)}/${hash}`, { target: `languages/minecraft/${it}.json` }, err => {
    if (err) exit(err)
    console.log('Successfully downloaded:', it + '.json')
  })
})))
