/**
 * Dynamic proxy configuration for Angular dev server
 * 
 * This proxy handles CORS by forwarding requests to the tenant-specific API endpoint.
 * The tenant is determined from the X-Tenant-Name header or defaults to 'demo'.
 */

const PROXY_CONFIG = [
    {
        context: ['/api'],
        target: 'https://dev_demo-connectapi.apprx.eu',
        secure: true,
        changeOrigin: true,
        logLevel: 'debug',
        router: function (req) {
            // Try to get tenant from custom header
            const tenant = req.headers['x-tenant-name'] || 'demo';
            const target = `https://dev_${tenant}-connectapi.apprx.eu`;
            console.log(`[Proxy] Routing to: ${target}`);
            return target;
        },
        onProxyReq: function (proxyReq, req, res) {
            // Log the proxied request for debugging
            console.log(`[Proxy] ${req.method} ${req.url} -> ${proxyReq.host}${proxyReq.path}`);
        }
    }
];

module.exports = PROXY_CONFIG;
