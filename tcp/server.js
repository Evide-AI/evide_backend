import net from "node:net"
import "dotenv/config"

import Gt06 from "./gps/gt06.js"

const PORT = process.env.TCP_PORT || 5023

const server = net.createServer((client) => {
  console.log("gt06 connected: ", client.remoteAddress)

  const gt06 = new Gt06()
  client.on("data", (data) => {
    try {
      gt06.parse(data)
    } catch (e) {
      console.log("err", e)
      return
    }

    if (gt06.expectsResponse) {
      client.write(gt06.responseMsg)
    }

    gt06.msgBuffer.forEach((msg) => {
      console.log(msg)
    })

    gt06.clearMsgBuffer()
  })
})

server.listen(PORT, () => {
  console.log("Server started on port: ", PORT)
})
