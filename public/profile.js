document.addEventListener('DOMContentLoaded', async function() {
  const userId = localStorage.getItem('user_id'); // Ottieni l'ID dell'utente dal localStorage

  if (!userId) {
    console.error('User ID not found in localStorage');
    alert('Errore: utente non autenticato');
    return;
  }

  console.log(`Fetching profile for user ID: ${userId}`); // Log ID

  try {
    const response = await fetch(`/api/profile/${encodeURIComponent(userId)}`);
    if (!response.ok) {
      throw new Error('Errore nel recupero del profilo utente');
    }
    const user = await response.json();

    document.getElementById('name').value = user.name;
    document.getElementById('surname').value = user.surname;
    if (user.profileImage) {
      const profileImageElement = document.createElement('img');
      profileImageElement.src = `/uploads/${user.profileImage}`;
      profileImageElement.id = 'profileImagePreview';
      document.getElementById('profileForm').prepend(profileImageElement);
    }
    document.getElementById('interests').value = user.interests.join(', ');

  } catch (error) {
    console.error(error);
    alert('Errore nel caricamento del profilo utente');
  }
});

document.getElementById('profileForm').addEventListener('submit', async function(event) {
  event.preventDefault();

  const formData = new FormData();
  formData.append('auth0Id', localStorage.getItem('user_id')); // Aggiungi auth0Id
  formData.append('name', document.getElementById('name').value);
  formData.append('surname', document.getElementById('surname').value);
  formData.append('profileImage', document.getElementById('profileImage').files[0]);
  formData.append('interests', document.getElementById('interests').value.split(','));

  try {
    const response = await fetch('/api/profile', {
      method: 'POST',
      body: formData
    });
    if (response.ok) {
      alert('Profilo aggiornato con successo');
    } else {
      alert('Errore nell\'aggiornamento del profilo');
    }
  } catch (error) {
    console.error('Errore:', error);
    alert('Errore nell\'aggiornamento del profilo');
  }
});
