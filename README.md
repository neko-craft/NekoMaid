# NekoMaid [![GitHub stars](https://img.shields.io/github/stars/neko-craft/NekoMaid)](https://github.com/neko-craft/NekoMaid/stargazers) [![Release](https://github.com/neko-craft/NekoMaid/actions/workflows/release.yml/badge.svg)](https://github.com/neko-craft/NekoMaid/actions/workflows/release.yml) [![](https://www.jitpack.io/v/neko-craft/NekoMaid.svg)](https://www.jitpack.io/#neko-craft/NekoMaid) ![Lines of code](https://img.shields.io/tokei/lines/github/neko-craft/NekoMaid) ![License](https://img.shields.io/github/license/neko-craft/NekoMaid)

A bukkit plugin that can manage your server through web pages.

## Requirements

- [Uniporter](https://github.com/Apisium/Uniporter)

## Usage

1. Download the [NekoMaid.jar](https://github.com/neko-craft/NekoMaid/releases/latest/download/NekoMaid.jar)
2. Put the jar file into the `plugins` folder of your Minecraft server.
3. Restart your Minecraft server.
4. Modify the `hostname` to the address to connect to your MineCraft server.
5. Execute `/nekomaid reload` command in the console to reload configuration.
6. Execute `/nekomaid` or `/nm` command in the console.
7. Open the url and manage your server!

## Configures

```yaml
token: ~ # Password

hostname: 127.0.0.1 # Connecting address of your Minecraft server
customAddress: 'https://example.com/{token}' # Your custom address

geolite2-eula: false # Agree or not with EULA of MaxMind GeoIP2
baidu-map-license-key: '' # If you deploy your own front-end website and turn on the GeoIP function, you should use your own Baidu map license key

skin-url: '' # Custom player skin url (png), {} will be replaced with username or UUID
head-url: '' # Custom player avatar url (png), {} will be replaced with username or UUID

debug: false # Debug mode

logger: # Logger configures
  maxLevel: INFO
  minLevel: OFF
```

## Permission

- **neko.maid.use**: Allow a player to use the `/nekomaid` command.

## For developers

[Wiki](https://github.com/neko-craft/NekoMaid/wiki)

## Screenshot

![0](https://user-images.githubusercontent.com/17093811/144084574-c0168d13-edba-4d9d-8db3-3a3712eada37.png)
![1](https://user-images.githubusercontent.com/17093811/144084605-1cb11c44-182d-472f-9016-cd28aab40851.png)
![2](https://user-images.githubusercontent.com/17093811/144084613-c2e17378-c360-48f0-ac1d-39a7df2ecc04.png)
![3](https://user-images.githubusercontent.com/17093811/144084629-0b8e1179-8e25-4a44-9440-e921016fc86e.png)
![4](https://user-images.githubusercontent.com/17093811/144084638-91393d37-61c4-4c2d-89df-90fda5b31f0b.png)
![5](https://user-images.githubusercontent.com/17093811/144084647-5763720d-5f50-4bf8-ad7a-e77daf339034.png)
![6](https://user-images.githubusercontent.com/17093811/144084651-26ea9f02-a145-4efe-9127-f5c4f1cb27fe.png)

## License

[MIT](./LICENSE)

## Author

Shirasawa
