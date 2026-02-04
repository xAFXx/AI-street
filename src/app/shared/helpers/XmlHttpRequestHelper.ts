/**
 * XmlHttpRequestHelper - Utility for making XHR requests before Angular bootstraps
 * 
 * This is used by AppPreBootstrap to load configuration before HttpClient is available.
 */
export class XmlHttpRequestHelper {
    /**
     * Make an AJAX request using XMLHttpRequest
     */
    static ajax(
        method: 'GET' | 'POST',
        url: string,
        customHeaders: { name: string; value: string }[] | null,
        data: string | null,
        successCallback: (result: any) => void,
        errorCallback?: (error: any) => void
    ): void {
        const xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        successCallback(result);
                    } catch (e) {
                        if (errorCallback) {
                            errorCallback(e);
                        } else {
                            console.error('[XmlHttpRequestHelper] Failed to parse response:', e);
                        }
                    }
                } else if (xhr.status !== 0) {
                    // Status 0 means request was aborted or network error
                    if (errorCallback) {
                        errorCallback({
                            status: xhr.status,
                            statusText: xhr.statusText,
                            responseText: xhr.responseText
                        });
                    } else {
                        console.error(`[XmlHttpRequestHelper] Request failed with status ${xhr.status}`);
                    }
                }
            }
        };

        xhr.onerror = function () {
            if (errorCallback) {
                errorCallback({
                    status: 0,
                    statusText: 'Network Error',
                    responseText: ''
                });
            } else {
                console.error('[XmlHttpRequestHelper] Network error');
            }
        };

        xhr.open(method, url, true);

        // Set default headers
        if (method === 'POST' && data) {
            xhr.setRequestHeader('Content-Type', 'application/json');
        }

        // Set custom headers
        if (customHeaders) {
            for (const header of customHeaders) {
                xhr.setRequestHeader(header.name, header.value);
            }
        }

        xhr.send(data);
    }
}
