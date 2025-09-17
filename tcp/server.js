import net from "node:net"
import "dotenv/config"

import Gt06 from "./handlers/gt06.js"
import GpsData from "./models/GpsData.js"
import { connectDB } from "../config/db.js"

const PORT = process.env.TCP_PORT || 5023

const server = net.createServer((client) => {
  console.log("gt06 connected: ", client.remoteAddress)

  const gt06 = new Gt06()
  client.on("data", async (data) => {
    try {
      gt06.parse(data)
    } catch (e) {
      console.log("err", e)
      return
    }

    if (gt06.expectsResponse) {
      client.write(gt06.responseMsg)
    }

    const locationMessages = gt06.msgBuffer
      .filter((msg) => msg.event.number === 0x12)
      .map((msg) => ({
        bus_id: msg.imei,
        location: {
          type: "Point",
          coordinates: [msg.lon, msg.lat],
        },
        speed: msg.speed,
      }))

    if (locationMessages.length > 0) {
      try {
        await GpsData.bulkCreate(locationMessages)
      } catch (error) {
        console.error("Error saving GPS data:", error)
      }
    }

    gt06.clearMsgBuffer()
  })

  client.on("error", (err) => {
    console.error("Client error:", err)
  })

  client.on("close", () => {
    console.log("Client disconnected")
  })
})

server.on("error", (err) => {
  console.error("Server error:", err)
})

async function startTcpServer() {
  try {
    console.log("Starting TCP Server...")
    console.log("Connecting to database...")
    await connectDB()
    console.log("Database connected successfully")

    server.listen(PORT, () => {
      console.log(`TCP Server running on port: ${PORT}`)
    })
  } catch (error) {
    console.error("Failed to start server", error)
    process.exit(1)
  }
}

startTcpServer()
