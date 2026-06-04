export async function onRequest(context) {
  const { env } = context;
  const { results } = await env.DB.prepare('SELECT name, role, avatar FROM team_members ORDER BY id').all();
  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' }
  });
}