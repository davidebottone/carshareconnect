const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 20000 // 20 secondi
})
  .then(() => console.log('Connected to MongoDB...'))
  .catch(err => console.error('Could not connect to MongoDB...', err));

const userSchema = new mongoose.Schema({
    auth0Id: { type: String, required: true, unique: true },
    name: String,
    surname: String,
    profileImage: String,
    interests: [String],
    latitude: Number,
    longitude: Number,
    signupDate: String
});

const User = mongoose.model('User', userSchema);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Endpoint per ottenere i dati del profilo dell'utente
app.get('/api/profile/:auth0Id', async (req, res) => {
    try {
        console.log(`Fetching user with auth0Id: ${req.params.auth0Id}`);
        const user = await User.findOne({ auth0Id: req.params.auth0Id });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Errore nel recupero del profilo utente:', error);
        res.status(500).json({ message: 'Errore nel recupero del profilo utente' });
    }
});

// Endpoint per ottenere le variabili di ambiente
app.get('/api/env', (req, res) => {
    res.json({
        AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
        AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
        REDIRECT_URI: process.env.REDIRECT_URI,
        HOME_URL: process.env.HOME_URL
    });
});

app.post('/api/profile', upload.single('profileImage'), async (req, res) => {
    try {
        const { auth0Id, name, surname, interests } = req.body;
        console.log(`Received data: ${JSON.stringify(req.body)}`); // Log dei dati ricevuti
        const profileImage = req.file ? req.file.filename : null;

        let user = await User.findOne({ auth0Id });
        if (user) {
            // Aggiorna il profilo esistente
            user.name = name;
            user.surname = surname;
            user.profileImage = profileImage;
            user.interests = interests.split(',').map(interest => interest.trim());
            await user.save();
        } else {
            // Crea un nuovo profilo
            user = new User({
                auth0Id,
                name,
                surname,
                profileImage,
                interests: interests.split(',').map(interest => interest.trim()),
                latitude: 0,
                longitude: 0,
                signupDate: new Date().toISOString()
            });
            await user.save();
        }
        res.status(200).json({ message: 'Profilo aggiornato con successo' });
    } catch (error) {
        console.error('Errore nell\'aggiornamento del profilo:', error);
        res.status(500).json({ message: 'Errore nell\'aggiornamento del profilo' });
    }
});

let users = [];

io.on('connection', (socket) => {
    console.log('Nuovo utente connesso');

    socket.emit('update-users', users);

    socket.on('new-user', async (data) => {
        console.log('Nuovo utente:', data);
        const newUser = new User({
            auth0Id: data.auth0Id,
            name: data.name,
            surname: data.surname,
            profileImage: data.profileImage,
            interests: data.interests,
            latitude: data.latitude,
            longitude: data.longitude,
            signupDate: data.signupDate
        });
        await newUser.save();

        users.push(newUser);
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
