exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { items, total } = JSON.parse(event.body);
    const secretKey = process.env.RECURRENTE_SECRET_KEY;

    const response = await fetch('https://app.recurrente.com/api/checkouts', {
      method: 'POST',
      headers: {
        'X-SECRET-KEY': secretKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: items.map(item => ({
          name: item.name,
          amount_in_cents: Math.round(item.precio * 100),
          currency: 'GTQ',
          quantity: item.cantidad || 1
        })),
        success_url: 'https://oktobike.com/checkout.html?pago=exitoso',
        cancel_url: 'https://oktobike.com/checkout.html?pago=cancelado'
      })
    });

    const data = await response.json();

    if (data.checkout_url) {
      return {
        statusCode: 200,
        body: JSON.stringify({ checkout_url: data.checkout_url })
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No se pudo crear el checkout', details: data })
      };
    }
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
