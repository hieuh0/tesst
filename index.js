const fs = require('fs');
const https = require('https');
const express = require('express');
const socketIO = require('socket.io');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

// SSL certificate options
const options = {
    key: fs.readFileSync('./server.key'),
    cert: fs.readFileSync('./server.crt')
};

// Create Express application
const app = express();
app.use(express.static('public'));

if (cluster.isMaster) {
    // Fork workers for each CPU core
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // Restart workers if they die
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });
} else {
    // Create HTTPS server with Express
    const server = https.createServer(options, app);
    const io = socketIO(server);

    let users = {}; // { userId: { type: 'admin'|'user', socketId: socket.id } }

    io.on('connection', (socket) => {
        console.log('New user connected:', socket.id);

        socket.on('join-room', (type) => {
            users[socket.id] = { type, socketId: socket.id };

            // Find the other user
            const otherUser = Object.keys(users).find(id => id !== socket.id);

            if (otherUser) {
                // Notify the other user about the new connection
                io.to(otherUser).emit('user-connected', socket.id);
                io.to(socket.id).emit('user-connected', otherUser); // Notify the new user
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

    // Start server on port 3000
    server.listen(3000, () => {
        console.log('Server is running on port 3000');
    });
}
