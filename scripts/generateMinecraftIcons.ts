import { readFileSync, createWriteStream, existsSync, mkdirSync, writeFileSync } from 'fs'
import { createHash } from 'crypto'
import { basename } from 'path'
import { fromBuffer } from 'yauzl'
import fetchVersion, { exit } from './fetchMinecraftVersion'

if (!existsSync('icons/minecraft')) mkdirSync('icons/minecraft')

const regexp = /_(top|on|side\d*|open|front|bottom|back|lit|inner|off|stage_?\d+|\d+)\.png$/

fetchVersion().then(body => {
  console.log('Url:', body.downloads.client.url)
  require('nugget')(body.downloads.client.url, { target: 'client.jar' }, err => {
    if (err) exit(err)
    try {
      const data = readFileSync('client.jar')
      const hash = createHash('sha1').update(data).digest('hex')
      if (hash !== body.downloads.client.sha1) exit('Hash is not equal:', body.downloads.client.sha1, hash)
      fromBuffer(data, { lazyEntries: true }, (err, file) => {
        if (err) exit(err)
        const map: Record<string, 0> = { }
        file.on('entry', entry => {
          if (entry.fileName !== 'assets/minecraft/textures/misc/enchanted_item_glint.png' &&
            (entry.fileName.endsWith('/') || entry.fileName.endsWith('.mcmeta') ||
              (!entry.fileName.startsWith('assets/minecraft/textures/block/') &&
              !entry.fileName.startsWith('assets/minecraft/textures/item/')))) {
            file.readEntry()
            return
          }
          const name = basename(entry.fileName).replace(regexp, '').replace(/\.png$/, '')
          if (name in map) {
            file.readEntry()
            return
          }
          file.openReadStream(entry, (err, readStream) => {
            if (err) exit(err)
            readStream.on('end', () => {
              map[name] = 0
              console.log('Saved:', name)
              file.readEntry()
            })
            readStream.pipe(createWriteStream(`icons/minecraft/${name}.png`))
          })
        }).once('end', () => writeFileSync('minecraftIcons.json', JSON.stringify(map))).readEntry()
      })
    } catch (e) { exit(e) }
  })
})
