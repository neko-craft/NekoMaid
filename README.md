# NekoMaid [![GitHub stars](https://img.shields.io/github/stars/neko-craft/NekoMaid)](https://github.com/neko-craft/NekoMaid/stargazers) [![Release](https://github.com/neko-craft/NekoMaid/actions/workflows/release.yml/badge.svg)](https://github.com/neko-craft/NekoMaid/actions/workflows/release.yml) [![](https://www.jitpack.io/v/neko-craft/NekoMaid.svg)](https://www.jitpack.io/#neko-craft/NekoMaid) ![License](https://img.shields.io/github/license/neko-craft/NekoMaid)

A bukkit plugin that can manage your server through web pages.

## Requirements

- [Uniporter](https://github.com/Apisium/Uniporter)

## Usage

1. Download the [NekoMaid.jar](https://github.com/neko-craft/NekoMaid/releases/latest/download/NekoMaid.jar)
2. Put the jar file into the `plugins` folder of your Minecraft server.
3. Restart your Minecraft server.
4. Execute `/nekomaid` or `/nm` command in the console.
5. Open the url and manage your server!

## Configures

```yaml
token: ~ # Password

hostname: 127.0.0.1 # Connecting address of your Minecraft server

logger: # Logger configures
  maxLevel: INFO
  minLevel: OFF
```

## Permission

- **neko.maid.use**: Allow a player to use the `/nekomaid` command.

## For developers

[Wiki](https://github.com/neko-craft/NekoMaid/wiki)

## License

[MIT](./LICENSE)

## Author

Shirasawa
