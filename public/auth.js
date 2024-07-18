(async function() {
  const response = await fetch('/api/env');
  const env = await response.json();

  const auth0Client = new auth0.WebAuth({
    domain: env.AUTH0_DOMAIN,
    clientID: env.AUTH0_CLIENT_ID,
    redirectUri: env.REDIRECT_URI,
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
        auth0Client.client.userInfo(authResult.accessToken, (err, user) => {
          if (err) {
            console.error('Error getting user info:', err);
            return reject(err);
          }
          localStorage.setItem('user_id', user.sub);
          console.log('Authentication successful, user ID set in localStorage');
          resolve(user);
        });
      });
    });
  }

  function logout() {
    localStorage.removeItem('id_token');
    localStorage.removeItem('user_id');
    auth0Client.logout({
      returnTo: env.HOME_URL,
      clientID: env.AUTH0_CLIENT_ID,
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

})();
