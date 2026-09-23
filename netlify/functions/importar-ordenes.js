// Funcion de un solo uso para cargar/actualizar en Firestore las ordenes
// que ya existen en el sistema local del taller. Protegida con un secreto
// (variable de entorno IMPORT_SECRET) para que nadie mas la pueda usar.
//
// Una vez que ya no la necesites, lo mas simple es borrar la variable de
// entorno IMPORT_SECRET en Netlify (o borrar este archivo) para desactivarla.
const { getDb } = require('./_lib/firebase');
const admin = require('firebase-admin');

const COLLECTION = 'ordenes_taller';
const CHUNK = 400; // limite de Firestore por batch es 500

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const secretoEsperado = process.env.IMPORT_SECRET;
  const secretoRecibido = event.headers['x-import-secret'];
  if (!secretoEsperado || secretoRecibido !== secretoEsperado) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'No autorizado.' }) };
  }

  let ordenes;
  try {
    ordenes = JSON.parse(event.body);
    if (!Array.isArray(ordenes)) throw new Error('El body debe ser un arreglo de ordenes.');
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalido: ' + e.message }) };
  }

  try {
    const db = getDb();
    let escritas = 0;
    let saltadas = 0;

    for (let i = 0; i < ordenes.length; i += CHUNK) {
      const lote = ordenes.slice(i, i + CHUNK);
      const batch = db.batch();

      for (const o of lote) {
        const codigo = (o.numero_boleta || '').trim().toUpperCase();
        if (!codigo) { saltadas++; continue; }

        const ref = db.collection(COLLECTION).doc(codigo);
        batch.set(ref, {
          shop_id: o.id ?? null,
          estado: o.estado || 'pendiente',
          fecha_entrada: o.fecha_entrada || null,
          fecha_finalizacion: o.fecha_finalizacion || null,
          fecha_entrega: o.fecha_entrega || null,
          marca: o.marca || null,
          modelo: o.modelo || null,
          color: o.color || null,
          talla: o.talla || null,
          tipo: o.tipo || null,
          observaciones: o.observaciones || null,
          recomendaciones: o.recomendaciones || null,
          items: (o.items || []).map((it) => ({ nombre: it.nombre, tipo: it.tipo || null })),
          actualizado_en: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        escritas++;
      }

      await batch.commit();
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, escritas, saltadas }) };
  } catch (e) {
    console.log('ERROR importar-ordenes:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};

