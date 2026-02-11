import { Injectable, signal, computed, inject } from '@angular/core';
import { AgentId, AIAgentMetricSummary, AIAgentMetric } from '../models/ai-chat.models';
import { AiChatHubService } from './ai-chat-hub.service';
import { DebugLogService } from './debug-log.service';

/**
 * AI Chat Metrics Service
 *
 * Manages agent performance metrics received from the SignalR hub.
 * Clean port of the legacy `AIChatMetricsService` (116 lines),
 * replacing BehaviorSubjects and lodash with Signals and native JS.
 */
@Injectable({ providedIn: 'root' })
export class AiChatMetricsService {

    private readonly hub = inject(AiChatHubService);
    private readonly debug = inject(DebugLogService);

    // ─── State ───────────────────────────────────────────────

    /** Current metric summary (agents + their metrics) */
    readonly metricSummary = signal<AIAgentMetricSummary | undefined>(undefined);

    /** Raw metrics array */
    readonly metrics = signal<any[]>([]);

    // ─── Computed ────────────────────────────────────────────

    /** Agent IDs from the current metric summary */
    readonly agentIds = computed(() => {
        const summary = this.metricSummary();
        if (!summary) return [];
        return summary.agentMetrics.map(item => item.agentId);
    });

    constructor() {
        // Listen for metric updates from SignalR hub
        this.hub.metricsUpdated$.subscribe(metrics => {
            if (metrics?.length) {
                this.updateMetrics(metrics);
            }
        });
    }

    // ─── Public API ──────────────────────────────────────────

    /**
     * Initialize metrics with a set of agents.
     * Each agent starts with `metric: undefined`.
     */
    init(agents: { id: string; name: string }[]): void {
        const current = this.metricSummary();

        if (!current) {
            // First initialization
            const summary: AIAgentMetricSummary = {
                sessionId: '',
                agentMetrics: agents.map(agent => ({
                    agentId: agent.id,
                    agentName: agent.name,
                    metric: undefined
                }))
            };
            this.metricSummary.set(summary);
            return;
        }

        // Merge new agents into existing summary
        const existingIds = new Set(current.agentMetrics.map(m => m.agentId));
        const newAgents = agents
            .filter(a => !existingIds.has(a.id))
            .map(a => ({ agentId: a.id, agentName: a.name, metric: undefined }));

        if (newAgents.length > 0) {
            this.metricSummary.set({
                ...current,
                agentMetrics: [...current.agentMetrics, ...newAgents]
            });
        }
    }

    /** Update metrics from incoming data */
    updateMetrics(metrics: any[]): void {
        this.metrics.set(metrics);
        this.debug.log('AiChatMetrics', `Updated ${metrics.length} metrics`);

        const summary = this.metricSummary();
        if (!summary) return;

        // Update each agent's metric
        const updatedAgentMetrics = summary.agentMetrics.map(am => {
            const match = metrics.find(m => m.aiAgentId === am.agentId);
            return match ? { ...am, metric: match } : am;
        });

        this.metricSummary.set({
            ...summary,
            agentMetrics: updatedAgentMetrics
        });
    }

    /** Reset all metrics */
    resetMetrics(): void {
        this.metricSummary.set(undefined);
        this.metrics.set([]);
    }
}
