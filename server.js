const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

let users = [];

io.on('connection', (socket) => {
    console.log('Nuovo utente connesso');
    
    // Invia al nuovo utente la lista degli utenti esistenti
    socket.emit('update-users', users);

    socket.on('new-user', (data) => {
        console.log('Nuovo utente:', data);
        users.push({
            id: socket.id,
            latitude: data.latitude,
            longitude: data.longitude,
            name: data.name,
            signupDate: data.signupDate
        });
        console.log('Lista utenti aggiornata:', users);
        io.emit('update-users', users);
    });

    socket.on('disconnect', () => {
        users = users.filter(user => user.id !== socket.id);
        io.emit('update-users', users);
        console.log('Utente disconnesso, lista utenti aggiornata:', users);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server in ascolto sulla porta ${PORT}`));

