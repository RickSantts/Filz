import { loadConfig } from '../lib/config.js';

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const config = await loadConfig(request, env);
    if (Object.keys(config).length === 0) {
      return new Response(JSON.stringify({ error: 'Config não encontrado' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store'
        }
      });
    }
    return new Response(JSON.stringify(config), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  }
}
