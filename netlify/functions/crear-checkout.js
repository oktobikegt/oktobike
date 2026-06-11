exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { items, total } = JSON.parse(event.body);
    const secretKey = process.env.RECURRENTE_SECRET_KEY;

    if (!secretKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Secret key no configurada' }) };
    }

    const payload = {
      items: items.map(item => ({
        name: item.name,
        amount_in_cents: Math.round(item.precio * 100),
        currency: 'GTQ',
        quantity: item.cantidad || 1
      })),
      success_url: 'https://oktobike.com/checkout.html?pago=exitoso',
      cancel_url: 'https://oktobike.com/checkout.html?pago=cancelado'
    };

    const response = await fetch('https://app.recurrente.com/api/checkouts', {
      method: 'POST',
      headers: {
        'X-SECRET-KEY': secretKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('STATUS:',
