import type { Context } from 'hono';

/**
 * Route handler that serves an authenticated API Explorer page.
 * Embeds Scalar (OpenAPI explorer) + Firebase Auth (Google sign-in).
 * Both load from CDN — no npm dependencies needed.
 */
export const explorerRoute = (c: Context) => {
  const firebaseConfig = JSON.stringify({
    apiKey: process.env.PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID || '',
  });
  const emulatorHost = JSON.stringify(
    process.env.FIREBASE_AUTH_EMULATOR_HOST || ''
  );

  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Explorer</title>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"><\/script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; }
    #auth-bar {
      position: sticky; top: 0; z-index: 1000;
      display: flex; align-items: center; justify-content: flex-end; gap: 12px;
      padding: 8px 16px;
      background: #12122a; color: #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      border-bottom: 1px solid #2a2a4a;
    }
    #auth-bar img { width: 28px; height: 28px; border-radius: 50%; }
    #auth-bar button {
      padding: 6px 14px; border: none; border-radius: 6px;
      cursor: pointer; font-size: 13px; font-weight: 500;
    }
    .sign-in-btn { background: #4285f4; color: white; }
    .sign-in-btn:hover { background: #3367d6; }
    .sign-out-btn { background: transparent; color: #aaa; border: 1px solid #555 !important; }
    .sign-out-btn:hover { background: #222; }
    .auth-user { display: flex; align-items: center; gap: 8px; }
    .auth-status { color: #888; font-size: 12px; }
    #loading {
      display: flex; align-items: center; justify-content: center;
      height: 60vh; color: #888; font-family: sans-serif; font-size: 16px;
    }
  </style>
</head>
<body>
  <div id="auth-bar">
    <span class="auth-status">Initializing...</span>
  </div>
  <div id="loading">Loading API Explorer...</div>
  <div id="app"></div>

  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"><\/script>
  <script>
    (function() {
      var firebaseConfig = ${firebaseConfig};
      var emulatorHost = ${emulatorHost};

      firebase.initializeApp(firebaseConfig);
      var auth = firebase.auth();

      if (emulatorHost) {
        var proto = emulatorHost.startsWith('localhost') || emulatorHost.startsWith('127.') ? 'http' : 'https';
        auth.useEmulator(proto + '://' + emulatorHost);
      }

      function escapeHtml(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
      }

      function renderAuthBar(user) {
        var bar = document.getElementById('auth-bar');
        if (user) {
          var photo = user.photoURL
            ? '<img src="' + escapeHtml(user.photoURL) + '" alt="">'
            : '';
          bar.innerHTML =
            '<div class="auth-user">' + photo +
              '<span>' + escapeHtml(user.email || '') + '</span>' +
            '</div>' +
            '<button class="sign-out-btn" id="sign-out-btn">Sign out</button>';
          document.getElementById('sign-out-btn').onclick = function() {
            auth.signOut();
          };
        } else {
          bar.innerHTML =
            '<span class="auth-status">Not authenticated \\u2014 API calls will return 401</span>' +
            '<button class="sign-in-btn" id="sign-in-btn">Sign in with Google</button>';
          document.getElementById('sign-in-btn').onclick = function() {
            var provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider);
          };
        }
      }

      function initScalar(token) {
        var loading = document.getElementById('loading');
        if (loading) loading.remove();

        var config = {
          url: '/api/v1/doc',
          darkMode: true,
          theme: 'purple',
          layout: 'modern',
          showSidebar: true,
          hideClientButton: true,
        };

        if (token) {
          config.authentication = {
            preferredSecurityScheme: 'bearerAuth',
            securitySchemes: {
              bearerAuth: { token: token }
            }
          };
        }

        document.getElementById('app').innerHTML = '';
        Scalar.createApiReference('#app', config);
      }

      var initialized = false;

      auth.onAuthStateChanged(function(user) {
        renderAuthBar(user);

        if (user) {
          user.getIdToken().then(function(token) {
            // Register user in the database via /auth/login (idempotent)
            return fetch('/api/v1/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
              body: JSON.stringify({ idToken: token })
            }).then(function() {
              initScalar(token);
              initialized = true;
            });
          });
        } else if (!initialized) {
          initScalar(null);
          initialized = true;
        } else {
          // User signed out after Scalar was already initialized — reinitialize without token
          initScalar(null);
        }
      });

      // Refresh token every 50 minutes and re-init Scalar with fresh token
      setInterval(function() {
        var user = auth.currentUser;
        if (user) {
          user.getIdToken(true).then(function(token) {
            initScalar(token);
          });
        }
      }, 50 * 60 * 1000);
    })();
  <\/script>
</body>
</html>`);
};
