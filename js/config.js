// Votre configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDPUFQ7inMFmpd3b3tCnUj1bXsdD9Sfem0", // Remplacez par votre clé API
    authDomain: "apel-tresorie.firebaseapp.com",
    projectId: "apel-tresorie",
    storageBucket: "apel-tresorie.firebasestorage.app",
    messagingSenderId: "620063447998", // Remplacez
    appId: "1:620063447998:web:83ffc185342061ce20f7ef" // Remplacez
};

// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);

// Exportation des instances pour les autres modules
export const auth = firebase.auth();
export const db = firebase.firestore();

// Désactiver les avertissements pour les dates Timestamp si vous en voyez
// experimentalForceLongPolling est parfois utile pour des problèmes réseau spécifiques
db.settings({ experimentalForceLongPolling: true });