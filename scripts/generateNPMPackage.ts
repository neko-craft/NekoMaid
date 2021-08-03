import { writeFileSync } from 'fs'
import { version, author, description, name, main, keywords, repository, license, bugs, homepage, dependencies, devDependencies } from '../package.json'

writeFileSync('npm/package.json', JSON.stringify({
  name,
  main,
  version,
  author,
  description,
  keywords,
  repository,
  license,
  bugs,
  homepage,
  sideEffects: false,
  peerDependencies: {
    react: dependencies.react,
    '@material-ui/core': dependencies['@material-ui/core'],
    '@material-ui/styles': dependencies['@material-ui/styles'],
    '@types/react': devDependencies['@types/react']
  },
  peerDependenciesMeta: {
    '@types/react': { optional: true },
    '@material-ui/core': { optional: true },
    '@material-ui/styles': { optional: true }
  },
  types: 'index.d.ts'
}))
