const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app); // Sử dụng HTTP thay vì HTTPS
const io = socketIO(server);

app.use(express.static('public'));

let users = {}; // { userId: { type: 'admin'|'user', socketId: socket.id } }

io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    socket.on('join-room', (type) => {
        users[socket.id] = { type, socketId: socket.id };
        
        // Tìm người dùng khác
        const otherUser = Object.keys(users).find(id => id !== socket.id);

        if (otherUser) {
            // Thông báo cho người dùng khác về kết nối mới
            io.to(otherUser).emit('user-connected', socket.id);
            io.to(socket.id).emit('user-connected', otherUser); // Thông báo cho người dùng mới
        }
    });

    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', {
            signal: data.signal,
            from: socket.id
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete users[socket.id];
        socket.broadcast.emit('user-disconnected', socket.id);
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
