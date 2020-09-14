const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {generateMessage, generateLocationMessage} = require("./utils/messages");
const {addUser, removeUser, getUser, getUsersInRoom} = require("./utils/users");


const app = express();
// This is done usually in the backend by express, we are just refactoring to socket.io
// we are configuring the server outside of the express library use the core http node module
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT;
const publicDirPath = path.join(__dirname, "../public");

app.use(express.static(publicDirPath));

io.on("connection", (socket) => {
  console.log("New websocket connection");

  /* socket.emit("message", generateMessage("Welcome!"));
  socket.broadcast.emit("message", generateMessage("A new user has joined!")); */

  socket.on("join", (options, callback) => {
    const {error, user} = addUser({id: socket.id, ...options});

    if(error){
      return callback(error);
    }
    socket.join(user.room);

    socket.emit("message", generateMessage("Admin", "Welcome!"));
    socket.broadcast.to(user.room).emit("message", generateMessage("Admin", `${user.username} has joined!`));

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room)
    });
    callback();
  });
  
  socket.on("sendMessage", (msg, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();

    if(filter.isProfane(msg)){
      return callback("Profanity is not allowed");
    }
    io.to(user.room).emit("message", generateMessage(user.username, msg));
    callback();
  });

  socket.on("sendLocation", (locationCoords, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit("locationMessage", generateLocationMessage(user.username, `https://google.com/maps?q=${locationCoords.latitude},${locationCoords.longitude}`));
    callback();
  });

  socket.on("disconnect",() => {
    const user = removeUser(socket.id);

    if(user){
      io.to(user.room).emit("message", generateMessage("Admin", `${user.username} has left!`));
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room)
      });
    }
    
  });

  /* socket.emit("countUpdated",count);
  socket.on("increment", () => {
    count++;
    // Emits event to that specific connection
    // socket.emit("countUpdated",count);

    // Emits events to all the available connections
    io.emit("countUpdated", count);
  }); */
});

server.listen(port,() => {
  console.log(`Server is up on port ${port}`);
});