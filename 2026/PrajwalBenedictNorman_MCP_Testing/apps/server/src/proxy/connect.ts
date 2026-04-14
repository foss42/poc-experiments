// import { WebSocketServer } from 'ws'
// import { spawn, ChildProcess } from 'child_process'
// import { parse } from 'url'

// const wss = new WebSocketServer({ port: 3333 })

// wss.on('connection', (ws, req) => {
//   console.log('Browser connected to proxy')

//   const params = new URLSearchParams(
//     parse(req.url ?? '').query ?? ''
//   )
//   const command = params.get('command')

//   if (!command) {
//     ws.close()
//     return
//   }

//   const parts = command.split(' ')
//   const cmd = parts[0]
//   const args = parts.slice(1)

//   if (!cmd) {
//     ws.close()
//     return
//   }

//   const proc: ChildProcess = spawn(cmd, args, {
//     shell: true
//   })

//   let serverReady = false
//   const messageQueue: string[] = []
//   let buffer = ''

//   // stdout handler with buffering
//   proc.stdout?.on('data', (chunk: Buffer) => {
//     buffer += chunk.toString()
//     const lines = buffer.split('\n')
//     buffer = lines.pop() ?? ''

//     lines.forEach(line => {
//       if (line.trim() && ws.readyState === ws.OPEN) {
//         console.log('Server → Browser:', line)
//         ws.send(line)
//       }
//     })
//   })

//   // stderr = server is ready
//   proc.stderr?.on('data', (chunk: Buffer) => {
//     const msg = chunk.toString()
//     console.log('Server stderr:', msg)

//     if (!serverReady) {
//       serverReady = true
//       console.log('Server ready — flushing queued messages')

//       // Flush all queued messages now server is ready
//       messageQueue.forEach(msg => {
//         proc.stdin?.write(msg + '\n')
//       })
//       messageQueue.length = 0
//     }
//   })

//   // Queue messages until server is ready
//   ws.on('message', (data: Buffer) => {
//     const msg = data.toString()
//     console.log('Browser → Server:', msg)

//     if (!serverReady) {
//       console.log('Server not ready — queuing message')
//       messageQueue.push(msg)
//     } else {
//       proc.stdin?.write(msg + '\n')
//     }
//   })

//   ws.on('close', () => {
//     console.log('Browser disconnected from proxy')
//     proc.kill('SIGTERM')
//   })

//   proc.on('exit', (code: number | null) => {
//     console.log(`Server exited: ${code}`)
//     if (ws.readyState === ws.OPEN) {
//       ws.close()
//     }
//   })
// })

// console.log('Proxy running on ws://localhost:3333')

import { WebSocketServer } from 'ws'
import { spawn, ChildProcess } from 'child_process'
import { parse } from 'url'

const wss = new WebSocketServer({ port: 3333 })

wss.on('connection', (ws, req) => {
  console.log('Browser connected to proxy')

  const params = new URLSearchParams(
    parse(req.url ?? '').query ?? ''
  )
  const command = params.get('command')

  if (!command) {
    ws.close()
    return
  }

  const parts = command.split(' ')
  const cmd = parts[0]
  const args = parts.slice(1)

  if (!cmd) {
    ws.close()
    return
  }

  const proc: ChildProcess = spawn(cmd, args, { shell: true })

  let serverReady = false
  const messageQueue: string[] = []
  let buffer = ''

  proc.stdout?.on('data', (chunk: Buffer) => {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    lines.forEach(line => {
      if (line.trim() && ws.readyState === ws.OPEN) {
        console.log('Server → Browser:', line)
        ws.send(line)
      }
    })
  })

  proc.stderr?.on('data', (chunk: Buffer) => {
    const msg = chunk.toString()
    console.log('Server stderr:', msg)
    if (!serverReady) {
      serverReady = true
      console.log('Server ready — flushing queued messages')
      messageQueue.forEach(msg => proc.stdin?.write(msg + '\n'))
      messageQueue.length = 0
    }
  })

  ws.on('message', (data: Buffer) => {
    const msg = data.toString()
    console.log('Browser → Server:', msg)
    if (!serverReady) {
      console.log('Server not ready — queuing message')
      messageQueue.push(msg)
    } else {
      proc.stdin?.write(msg + '\n')
    }
  })

  ws.on('close', () => {
    console.log('Browser disconnected from proxy')
    proc.kill('SIGTERM')
  })

  proc.on('exit', (code: number | null) => {
    console.log(`Server exited: ${code}`)
    if (ws.readyState === ws.OPEN) ws.close()
  })
})

console.log('Proxy running on ws://localhost:3333')