export async function onRequest(context) {
  const { request, env } = context;

  if (!env.API_ORIGIN) {
    return new Response('API origin is not configured.', {
      status: 500,
    });
  }

  const incomingUrl = new URL(request.url);

  const targetUrl = new URL(
    incomingUrl.pathname + incomingUrl.search,
    env.API_ORIGIN,
  );

  const proxyRequest = new Request(targetUrl, request);

  return fetch(proxyRequest);
}