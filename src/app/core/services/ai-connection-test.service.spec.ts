import { TestBed } from '@angular/core/testing';
import { AiConnectionTestService, AIConnectionTestResult } from './ai-connection-test.service';

describe('AiConnectionTestService', () => {
    let service: AiConnectionTestService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(AiConnectionTestService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getDiagnostics', () => {
        it('should return diagnostic info', () => {
            const diagnostics = service.getDiagnostics();
            expect(diagnostics).toBeTruthy();
            expect(diagnostics).toHaveProperty('openAI');
            expect(diagnostics).toHaveProperty('localStorage');
        });
    });

    describe('testOpenAI', () => {
        it('should return error when no API key is set', async () => {
            // Clear any existing key
            localStorage.removeItem('ai_openai_key');

            const result = await service.testOpenAI();

            expect(result.provider).toBe('OpenAI');
            expect(result.apiKeySet).toBe(false);
            expect(result.connected).toBe(false);
            expect(result.error).toContain('API key not configured');
        });

        it('should attempt connection when API key is set', async () => {
            // Set a dummy key (will fail auth but tests the flow)
            localStorage.setItem('ai_openai_key', 'sk-test-key');

            const result = await service.testOpenAI();

            expect(result.provider).toBe('OpenAI');
            expect(result.apiKeySet).toBe(true);
            // Connection will fail with invalid key
            expect(result.responseTime).toBeGreaterThan(0);

            // Clean up
            localStorage.removeItem('ai_openai_key');
        });
    });

    describe('testAllConnections', () => {
        it('should test at least OpenAI', async () => {
            const results = await service.testAllConnections();

            expect(results.length).toBeGreaterThanOrEqual(1);
            expect(results[0].provider).toBe('OpenAI');
        });
    });

    describe('setOpenAIKey', () => {
        it('should set the API key in localStorage', () => {
            const testKey = 'sk-test-12345';
            service.setOpenAIKey(testKey);

            expect(localStorage.getItem('ai_openai_key')).toBe(testKey);

            // Clean up
            localStorage.removeItem('ai_openai_key');
        });
    });
});
