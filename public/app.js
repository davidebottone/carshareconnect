document.getElementById('startButton').addEventListener('click', function() {
    if (!auth.isAuthenticated()) {
        auth.login();
    } else {
        startApp();
    }
});

window.addEventListener('load', () => {
    if (window.location.pathname === '/callback.html') {
        auth.handleAuthentication().then(() => {
            window.location = '/';
        }).catch(err => {
            console.error(err);
        });
    } else if (auth.isAuthenticated()) {
        startApp();
    }
});

function startApp() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(initMap, showError);
    } else {
        alert("Geolocalizzazione non supportata dal tuo browser.");
    }
}

document.getElementById('logoutButton').addEventListener('click', function() {
    auth.logout();
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

    var userId = localStorage.getItem('user_id');
    fetch(`/api/profile/${userId}`)
      .then(response => response.json())
      .then(user => {
          var userMarker = L.marker([position.coords.latitude, position.coords.longitude]).addTo(map)
            .bindPopup(getUserPopup(user)).openPopup();

          socket.emit('new-user', {
              auth0Id: user.auth0Id,
              name: user.name,
              surname: user.surname,
              profileImage: user.profileImage,
              interests: user.interests,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              signupDate: user.signupDate
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
                            .bindPopup(getUserPopup(user));
                          markers[user.id] = marker;
                      }
                  }
              });
          });


          // Aggiorna la posizione dell'utente corrente ogni 5 secondi
          setInterval(function() {
              navigator.geolocation.getCurrentPosition(function(pos) {
                  var newLat = pos.coords.latitude;
                  var newLon = pos.coords.longitude;

                  userMarker.setLatLng([newLat, newLon]);

                  socket.emit('update-user', {
                      id: socket.id,
                      latitude: newLat,
                      longitude: newLon,
                      name: user.name,
                      surname: user.surname,
                      profileImage: user.profileImage,
                      interests: user.interests,
                      signupDate: user.signupDate
                  });
              }, showError);
          }, 5000); // Aggiorna ogni 5 secondi
      })
      .catch(error => console.error('Errore nel recupero dei dati dell\'utente:', error));
}


function getUserPopup(user) {
    return `<img src="/uploads/${user.profileImage}" alt="${user.name} ${user.surname}" class="avatar"><br><b>${user.name} ${user.surname}</b><br>Interessi: ${user.interests.join(', ')}<br>Iscritto dal: ${user.signupDate}`;
}
