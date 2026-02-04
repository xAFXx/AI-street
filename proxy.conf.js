/**
 * Proxy configuration for Angular dev server
 * 
 * Routes API requests to the specified target server.
 * Change the target URL and restart the dev server to switch tenants.
 */

// Target API server - change this to switch tenants
const TARGET_URL = 'https://74426834_connectapi.plattform.nl';

module.exports = {
    '/api': {
        target: TARGET_URL,
        secure: true,
        changeOrigin: true,
        logLevel: 'debug',
        on: {
            proxyReq: (proxyReq, req, res) => {
                console.log(`[Proxy] ${req.method} ${req.url} -> ${TARGET_URL}${req.url}`);
            },
            error: (err, req, res) => {
                console.error(`[Proxy] Error:`, err.message);
            }
        }
    },
    '/AbpUserConfiguration': {
        target: TARGET_URL,
        secure: true,
        changeOrigin: true,
        logLevel: 'debug'
    }
};
