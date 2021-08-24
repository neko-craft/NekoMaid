module.exports = app => app.use((_, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none')
  next()
})
