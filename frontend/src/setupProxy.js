const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://192.168.1.6:5000',
      changeOrigin: true,
      secure: false,
      ws: true,
    })
  );
  
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: 'https://192.168.1.6:5000',
      changeOrigin: true,
      secure: false,
      ws: true,
    })
  );
};
