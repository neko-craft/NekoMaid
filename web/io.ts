import socketIO from 'socket.io-client'

export default socketIO('http://localhost:11451', { query: 'token=' + '02dcc81a-7bd6-49f8-a0ba-bd388caafe4b' })
