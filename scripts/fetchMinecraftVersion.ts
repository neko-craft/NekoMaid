import request from 'request'

export const exit = (...err: (Error | string)[]): never => {
  console.error(...err)
  process.exit(-1)
}

interface MinecraftVersion {
  downloads: { client: { sha1: string, url: string } }
  assetIndex: { url: string }
}

export const get = <T> (url: string) => new Promise<T>(resolve => request.get(url, { json: true }, (err, _, body) => {
  if (err) exit(err)
  resolve(body)
}))

export default () => get('https://launchermeta.mojang.com/mc/game/version_manifest.json').then((body: any) => {
  const ver = body.versions.find(it => it.id === body.latest.release)
  console.log('Found version:', ver.id)
  return get<MinecraftVersion>(ver.url)
})
