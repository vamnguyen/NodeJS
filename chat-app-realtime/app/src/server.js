// import lib
const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { createMessages, } = require('./utils/create-message');
const { getUserList, addUser, removeUser } = require('./utils/users');

// init run app express
const app = express()

// setup static file
const publicDirPath = path.join(__dirname, '../public')
app.use(express.static(publicDirPath))

const server = http.createServer(app)
const io = socketio(server)


// listen event connection from client
io.on("connection", (socket) => {
  // listen event client join room
  socket.on('joinRoomToServer', ({ room, username }) => {
    socket.join(room)

    // Send to New Client just connection
    socket.emit('send message from server to client', createMessages(`Welcome you to ${room} room!`))
    // Send to Client remaining in the same room
    socket.broadcast.to(room).emit('send message from server to client', createMessages(`Client ${username} just join ${room} room`))

    // Chat: receive message from client to server
    socket.on("send message", (messageText, callback) => {
      const filter = new Filter()
      if (filter.isProfane(messageText)) {
        return callback('Message invalid! Because contain keyword Profane')
      }
      // send message to all clients in the same room
      io.to(room).emit('send message from server to client', createMessages(messageText))
      callback()
    })

    // handle share location
    socket.on('share location from client to server', ({ latitude, longitude }) => {
      const linkLocation = `https://www.google.com/maps?q=${latitude},${longitude}`
      io.to(room).emit('share location from server to client', linkLocation)
    })

    // handle user list
    const newUser = {
      id: socket.id,
      username,
      room,
    }
    addUser(newUser)
    io.to(room).emit('sendUserListToClient', getUserList(room))

    // disconnect
    socket.on("disconnect", () => {
      removeUser(socket.id)
      io.to(room).emit('sendUserListToClient', getUserList(room))
      console.log(`${username} just disconnected and left server.`)
    })
  })
})


const port = 6969
server.listen(port, () => {
  console.log(`App running on http://localhost:${port}`)
})