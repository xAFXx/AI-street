import * as pdfjsLib from 'pdfjs-dist';

/**
 * PDF.js Worker Configuration
 * 
 * Uses CDN by default for most reliable worker loading.
 * The worker is loaded as an ES module via dynamic import by pdfjs-dist.
 * Local paths often fail in deployed environments due to missing files or bundling issues.
 */

// Get the pdfjs version for CDN paths - must match the installed version
const PDFJS_VERSION = '5.4.530';

// Use unpkg as primary source - most reliable since it mirrors npm packages directly
const CDN_WORKER_SRC = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

let workerInitialized = false;

/**
 * Initialize the PDF.js worker
 * Uses CDN worker by default for maximum reliability
 */
export async function initializePdfWorker(): Promise<void> {
    if (workerInitialized) {
        return;
    }

    // Use CDN worker source directly - most reliable option
    // The local worker files often fail due to:
    // - Not being included in the build
    // - Path resolution issues in different environments  
    // - CORS or module loading issues
    pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_WORKER_SRC;
    console.log('[PDF Worker] ✓ Using CDN worker:', CDN_WORKER_SRC);
    workerInitialized = true;
}

/**
 * Get pdfjs-dist library with worker pre-configured
 * Use this instead of directly importing pdfjs-dist
 */
export async function getPdfJs(): Promise<typeof pdfjsLib> {
    await initializePdfWorker();
    return pdfjsLib;
}

/**
 * Synchronous worker source getter (for cases where async isn't possible)
 * Uses CDN as safe default if not yet initialized
 */
export function getWorkerSrc(): string {
    if (workerInitialized) {
        return pdfjsLib.GlobalWorkerOptions.workerSrc;
    }
    // Return CDN path as safe default for synchronous access
    return CDN_WORKER_SRC;
}

// Export pdfjs-dist types for convenience
export { pdfjsLib };
