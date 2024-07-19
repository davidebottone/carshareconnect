document.addEventListener('DOMContentLoaded', () => {
    // Controlla se auth è definito prima di procedere
    function waitForAuth() {
        if (window.auth && typeof window.auth.isAuthenticated === 'function') {
            initializeApp();
        } else {
            setTimeout(waitForAuth, 100); // Riprova ogni 100 ms
        }
    }

    waitForAuth();
});

function initializeApp() {
    document.getElementById('startButton').addEventListener('click', function() {
        if (!auth.isAuthenticated()) {
            auth.login();
        } else {
            showOptions();
        }
    });

    document.getElementById('giveRideButton').addEventListener('click', function() {
        showForm('giveRide');
    });

    document.getElementById('requestRideButton').addEventListener('click', function() {
        showForm('requestRide');
    });

    document.getElementById('profileForm').addEventListener('submit', function(event) {
        event.preventDefault();
        saveProfile();
    });

    if (window.location.pathname === '/callback.html') {
        auth.handleAuthentication().then(() => {
            window.location = '/';
        }).catch(err => {
            console.error(err);
        });
    } else if (auth.isAuthenticated()) {
        const state = getState();
        if (state) {
            showForm(state); // Ripristina lo stato salvato
        } else {
            showOptions();
        }
    }

    document.getElementById('logoutButton').addEventListener('click', function() {
        auth.logout();
    });
}

function showOptions() {
    document.querySelector('.login').classList.add('hidden');
    document.getElementById('optionContainer').classList.remove('hidden');
}

function showForm(type) {
    saveState(type); // Salva lo stato

    document.getElementById('optionContainer').classList.add('hidden');
    document.getElementById('profileFormContainer').classList.remove('hidden');

    if (type === 'giveRide') {
        document.getElementById('giveRideForm').classList.remove('hidden');
        document.getElementById('requestRideForm').classList.add('hidden');
    } else {
        document.getElementById('giveRideForm').classList.add('hidden');
        document.getElementById('requestRideForm').classList.remove('hidden');
    }

    // Fetch user profile and populate the form if available
    fetchUserProfile();
}

function fetchUserProfile() {
    const userId = localStorage.getItem('user_id');
    if (userId) {
        fetch(`/api/profile/${userId}`)
          .then(response => response.json())
          .then(user => {
              document.getElementById('name').value = user.name || '';
              document.getElementById('surname').value = user.surname || '';
              document.getElementById('interests').value = user.interests ? user.interests.join(', ') : '';

              if (user.profileImage) {
                  const profileImageElement = document.createElement('img');
                  profileImageElement.src = `/uploads/${user.profileImage}`;
                  profileImageElement.id = 'profileImagePreview';
                  document.getElementById('profileForm').prepend(profileImageElement);
              }

              if (user.carModel) {
                  document.getElementById('carModel').value = user.carModel;
              }
              if (user.licensePlate) {
                  document.getElementById('licensePlate').value = user.licensePlate;
              }
              if (user.destination) {
                  document.getElementById('destination').value = user.destination;
              }
              if (user.notes) {
                  document.getElementById('notes').value = user.notes;
              }
          })
          .catch(error => console.error('Errore nel recupero dei dati dell\'utente:', error));
    }
}

function saveProfile() {
    const userId = localStorage.getItem('user_id');
    const name = document.getElementById('name').value;
    const surname = document.getElementById('surname').value;
    const interests = document.getElementById('interests').value.split(',').map(interest => interest.trim());
    const profileImage = document.getElementById('profileImage').files[0];
    const carModel = document.getElementById('carModel').value;
    const licensePlate = document.getElementById('licensePlate').value;
    const destination = document.getElementById('destination').value;
    const notes = document.getElementById('notes').value;

    const formData = new FormData();
    formData.append('auth0Id', userId);
/*    formData.append('userId', userId);*/
    formData.append('name', name);
    formData.append('surname', surname);
    formData.append('interests', interests);
    if (profileImage) {
        formData.append('profileImage', profileImage);
    }
    formData.append('carModel', carModel);
    formData.append('licensePlate', licensePlate);
    formData.append('destination', destination);
    formData.append('notes', notes);

    fetch('/api/profile', {
        method: 'POST',
        body: formData
    })
      .then(response => {
          if (response.ok) {
              startApp();
          } else {
              alert('Errore nel salvataggio del profilo');
          }
      })
      .catch(error => console.error('Errore nel salvataggio del profilo:', error));
}

function startApp() {

    document.getElementById('profileFormContainer').classList.add('hidden');
    document.getElementById('mapContainer').classList.remove('hidden');

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(initMap, showError);
    } else {
        alert("Geolocalizzazione non supportata dal tuo browser.");
    }
}

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

function saveState(state) {
    localStorage.setItem('appState', state);
}

function getState() {
    return localStorage.getItem('appState');
}

function clearState() {
    localStorage.removeItem('appState');
}
