import { auth } from './config.js';

const authScreen = document.getElementById('auth-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

let onAuthChangeCallback = null;

export function registerAuthCallback(callback) {
    onAuthChangeCallback = callback;
}

auth.onAuthStateChanged((user) => {
    if (user) {
        authScreen.classList.add('hidden');
        dashboardScreen.classList.remove('hidden');
        if (onAuthChangeCallback) {
            onAuthChangeCallback(user);
        }
        console.log("Utilisateur connecté:", user.email);
    } else {
        authScreen.classList.remove('hidden');
        dashboardScreen.classList.add('hidden');
        if (onAuthChangeCallback) {
            onAuthChangeCallback(null);
        }
        console.log("Utilisateur déconnecté");
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm['login-email'].value;
    const password = loginForm['login-password'].value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        loginError.classList.add('hidden');
    } catch (error) {
        loginError.textContent = 'Erreur de connexion: ' + error.message;
        loginError.classList.remove('hidden');
        console.error("Erreur de connexion:", error);
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
    } catch (error) {
        console.error("Erreur de déconnexion:", error);
    }
});