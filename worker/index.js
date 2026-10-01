export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      if (!env.API_ORIGIN) {
        return new Response('API origin is not configured.', {
          status: 500,
        });
      }

      const targetUrl = new URL(url.pathname + url.search, env.API_ORIGIN);

      const startedAt = Date.now();
      const upstream = await fetch(new Request(targetUrl, request));
      const response = new Response(upstream.body, upstream);
      response.headers.append('Server-Timing', `api;dur=${Date.now() - startedAt}`);
      return response;
    }

    return env.ASSETS.fetch(request);
  },
};
