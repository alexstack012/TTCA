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

      return fetch(new Request(targetUrl, request));
    }

    return env.ASSETS.fetch(request);
  },
};
