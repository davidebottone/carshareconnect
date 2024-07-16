document.getElementById('startButton').addEventListener('click', function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(initMap, showError);
    } else {
        alert("Geolocalizzazione non supportata dal tuo browser.");
    }
});

function showError(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            alert("L'utente ha rifiutato la richiesta di geolocalizzazione.");
            break;
        case error.POSITION_UNAVAILABLE:
            alert("Le informazioni sulla posizione non sono disponibili.");
            break;
        case error.TIMEOUT:
            alert("La richiesta di ottenere la posizione è scaduta.");
            break;
        case error.UNKNOWN_ERROR:
            alert("Si è verificato un errore sconosciuto.");
            break;
    }
}

function initMap(position) {
    document.querySelector('.login').classList.add('hidden');
    document.getElementById('mapContainer').classList.remove('hidden');

    var map = L.map('map').setView([position.coords.latitude, position.coords.longitude], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    map.invalidateSize();

    var socket = io();
    var userMarker = L.marker([position.coords.latitude, position.coords.longitude]).addTo(map)
        .bindPopup("Tu sei qui").openPopup();

    socket.emit('new-user', { 
        latitude: position.coords.latitude, 
        longitude: position.coords.longitude, 
        name: "Mario Rossi", 
        signupDate: "01-01-2024" 
    });

    var markers = {};

    socket.on('update-users', function(users) {
        console.log('Ricevuta lista utenti:', users);

        // Rimuovi tutti i marker esistenti eccetto il proprio
        for (let id in markers) {
            if (id !== socket.id) {
                map.removeLayer(markers[id]);
                delete markers[id];
            }
        }

        users.forEach(function(user) {
            if (user.id !== socket.id) {
                console.log('Aggiungo marker per l\'utente:', user);
                if (!markers[user.id]) {
                    var marker = L.marker([user.latitude, user.longitude]).addTo(map)
                        .bindPopup(`<b>${user.name}</b><br>Iscritto dal: ${user.signupDate}`);
                    markers[user.id] = marker;
                }
            }
        });
    });
}

