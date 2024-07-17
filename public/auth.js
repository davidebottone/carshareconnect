var auth0Client = new auth0.WebAuth({
  domain: 'dev-6voktka3fzx74nlx.eu.auth0.com',
  clientID: 'ArtLhFsI1OpsAdOSNzTQalULXVcb0HjR',
  redirectUri: 'http://localhost:3000/callback.html',
  responseType: 'token id_token',
  scope: 'openid profile email'
});

function login() {
  auth0Client.authorize();
}

function handleAuthentication() {
  return new Promise((resolve, reject) => {
    auth0Client.parseHash((err, authResult) => {
      if (err) {
        console.error('Error parsing hash:', err);
        return reject(err);
      }
      if (!authResult || !authResult.idToken) {
        console.error('No auth result or idToken:', authResult);
        return reject(new Error('No auth result'));
      }
      localStorage.setItem('id_token', authResult.idToken);
      console.log('Authentication successful, idToken set in localStorage');
      resolve();
    });
  });
}

function logout() {
  localStorage.removeItem('id_token');
  auth0Client.logout({
    returnTo: 'http://localhost:3000',
    clientID: 'ArtLhFsI1OpsAdOSNzTQalULXVcb0HjR',
  });
}

function isAuthenticated() {
  return localStorage.getItem('id_token') !== null;
}

// Esporta le funzioni in un namespace globale
window.auth = {
  login: login,
  handleAuthentication: handleAuthentication,
  logout: logout,
  isAuthenticated: isAuthenticated
};


