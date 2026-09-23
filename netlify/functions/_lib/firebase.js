// Inicializa Firebase Admin una sola vez por instancia de la funcion,
// usando la credencial de servicio guardada en la variable de entorno
// FIREBASE_SERVICE_ACCOUNT (el contenido completo del JSON que descargas
// desde Firebase Console > Configuracion del proyecto > Cuentas de servicio).
const admin = require('firebase-admin');

let db = null;

function getDb() {
  if (db) return db;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('Falta la variable de entorno FIREBASE_SERVICE_ACCOUNT en Netlify.');
  }

  const serviceAccount = JSON.parse(raw);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  db = admin.firestore();
  return db;
}

module.exports = { getDb };

