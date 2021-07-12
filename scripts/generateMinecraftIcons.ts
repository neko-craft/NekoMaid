import { readFileSync, createWriteStream, existsSync, mkdirSync } from 'fs'
import { createHash } from 'crypto'
import { basename } from 'path'
import { fromBuffer } from 'yauzl'
import request from 'request'

const exit = (...err: (Error | string)[]): never => {
  console.error(...err)
  process.exit(-1)
}

if (!existsSync('icons/minecraft')) mkdirSync('icons/minecraft')

request.get('https://launchermeta.mojang.com/mc/game/version_manifest.json', { json: true }, (err, _, body) => {
  if (err) exit(err)
  const ver = body.versions.find(it => it.id === body.latest.release)
  console.log('Found version:', ver.id)
  request.get(ver.url, { json: true }, (err, _, body) => {
    if (err) exit(err)
    console.log('Url:', body.downloads.client.url)
    require('nugget')(body.downloads.client.url, { target: 'build/client.jar' }, function (err) {
      if (err) exit(err)
      try {
        const data = readFileSync('build/client.jar')
        const hash = createHash('sha1').update(data).digest('hex')
        if (hash !== body.downloads.client.sha1) exit('Hash is not equal:', body.downloads.client.sha1, hash)
        fromBuffer(data, { lazyEntries: true }, (err, file) => {
          if (err) exit(err)
          file.on('entry', entry => {
            if (entry.fileName.endsWith('/') || entry.fileName.endsWith('.mcmeta') ||
              (!entry.fileName.startsWith('assets/minecraft/textures/block/') &&
              !entry.fileName.startsWith('assets/minecraft/textures/item/'))) {
              file.readEntry()
              return
            }
            file.openReadStream(entry, (err, readStream) => {
              if (err) exit(err)
              const name = basename(entry.fileName)
              readStream.on('end', () => {
                console.log('Saved:', name)
                file.readEntry()
              })
              readStream.pipe(createWriteStream('icons/minecraft/' + name))
            })
          }).readEntry()
        })
      } catch (e) { exit(e) }
    })
  })
})
