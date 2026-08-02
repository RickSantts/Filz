export async function loadConfig(request, env) {
  const kv = env.CONFIG_KV;
  if (kv) {
    try {
      const stored = await kv.get('config');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Falha ao ler config do KV:', e);
    }
  }
  const res = await fetch(new URL('/config.json', request.url));
  if (res.ok) return await res.json();
  return {};
}
