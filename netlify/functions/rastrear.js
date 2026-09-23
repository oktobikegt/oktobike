// Busca una orden de taller por su codigo de seguimiento (numero_boleta),
// por ejemplo OK-00351, y devuelve solo lo que un cliente necesita ver
// (nunca su nombre, telefono, correo, ni los montos de la orden).
const { getDb } = require('./_lib/firebase');

const COLLECTION = 'ordenes_taller';

// Los 4 pasos reales que tu sistema de taller usa hoy.
// (falta_aprobacion y cancelado se muestran aparte, no encajan en una barra lineal)
const PASOS = [
  { key: 'pendiente', label: 'Recibida' },
  { key: 'en_progreso', label: 'En reparación' },
  { key: 'terminado', label: 'Lista para retirar' },
  { key: 'entregado', label: 'Entregada' },
];

function construirPasos(estado) {
  if (estado === 'falta_aprobacion' || estado === 'cancelado') return null;

  const idxActual = PASOS.findIndex((p) => p.key === estado);
  return PASOS.map((p, i) => ({
    label: p.label,
    estado: idxActual === -1 ? 'pendiente' : i < idxActual ? 'hecho' : i === idxActual ? 'activo' : 'pendiente',
  }));
}

const ESTADO_LABEL = {
  falta_aprobacion: 'Presupuesto pendiente de aprobación',
  pendiente: 'Recibida',
  en_progreso: 'En reparación',
  terminado: 'Lista para retirar',
  entregado: 'Entregada',
  cancelado: 'Orden cancelada',
};

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  const codigo = (event.queryStringParameters && event.queryStringParameters.codigo || '').trim().toUpperCase();
  if (!codigo) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta el código de seguimiento.' }) };
  }

  try {
    const db = getDb();
    const doc = await db.collection(COLLECTION).doc(codigo).get();

    if (!doc.exists) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'No encontramos ninguna orden con ese código.' }) };
    }

    const o = doc.data();

    const respuesta = {
      numero_boleta: codigo,
      estado: o.estado,
      estado_label: ESTADO_LABEL[o.estado] || o.estado,
      pasos: construirPasos(o.estado),
      fecha_entrada: o.fecha_entrada || null,
      fecha_finalizacion: o.fecha_finalizacion || null,
      fecha_entrega: o.fecha_entrega || null,
      bici: {
        marca: o.marca || null,
        modelo: o.modelo || null,
        color: o.color || null,
        talla: o.talla || null,
        tipo: o.tipo || null,
      },
      observaciones: o.observaciones || null,
      recomendaciones: o.recomendaciones || null,
      items: (o.items || []).map((it) => it.nombre),
    };

    return { statusCode: 200, headers, body: JSON.stringify(respuesta) };
  } catch (e) {
    console.log('ERROR rastrear:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error del servidor. Intenta de nuevo en un momento.' }) };
  }
};

