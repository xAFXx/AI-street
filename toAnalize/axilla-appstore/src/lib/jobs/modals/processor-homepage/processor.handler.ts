import * as CryptoJS from 'crypto-js';
import { ProcessorStatistics, AggregatedStatistics, ObjectStatistics, ControlBlockInfo } from './processor-statistics.model';

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root', // This makes it a singleton service automatically available
})
export class ProcessorHandler {
  private cache = new Map<string, any>(); // Cache for storing statistics by hash key

  /**
   * Generates a unique hash for the given `executionDefinition`.
   */
  private getExecutionDefinitionHash(executionDefinition: string): string {
    return CryptoJS.SHA256(executionDefinition).toString();
  }

  /**
   * Calculates statistics for each processor and aggregates them.
   */
  private calculateProcessorStatistics(executionDefinition: string): ProcessorStatistics | null {
    try {
      const decoded = JSON.parse(executionDefinition);

      if (!Array.isArray(decoded)) {
        throw new Error('executionDefinition should be an array of objects.');
      }

      let aggregateProcesses = 0;
      let aggregateDataCount = 0;
      let aggregateActionsCount = 0;
      let aggregateOutputsCount = 0;

      // Variables for first object details (used in aggregated structure)
      let firstObjectName: string | null = null;
      let firstObjectDescription: string | null = null;
      let firstControlBlockInfo: ControlBlockInfo | null = null;

      const perObjectStats: ObjectStatistics[] = decoded.map((item, index) => {
        const Name = item.Name || 'Unknown Name';
        const Description = item.Description || null;

        const processes = item.Process || [];
        const ProcessCount = processes.length;
        const TotalDataCount = processes.reduce(
          (sum, p) => sum + (p.Data?.length || 0),
          0
        );
        const TotalActionsCount = processes.reduce(
          (sum, p) => sum + (p.Actions?.length || 0),
          0
        );
        const TotalOutputsCount = processes.reduce(
          (sum, p) => sum + (p.Outputs?.length || 0),
          0
        );

        // Extract Control Block Details
        const control = item.Control || {};
        const DebugLog = control.DebugLog || false;
        const LoopEnabled = control.Loop?.Enable || false;
        const LoopFullReset = control.Loop?.FullReset || false;

        const controlBlockInfo = new ControlBlockInfo(
          DebugLog,
          LoopEnabled,
          LoopFullReset
        );

        // Capture first object details
        if (index === 0) {
          firstObjectName = Name;
          firstObjectDescription = Description;
          firstControlBlockInfo = controlBlockInfo;
        }

        // Aggregate statistics across all objects
        aggregateProcesses += ProcessCount;
        aggregateDataCount += TotalDataCount;
        aggregateActionsCount += TotalActionsCount;
        aggregateOutputsCount += TotalOutputsCount;

        // Return statistics for the current object
        return new ObjectStatistics(
          Name,
          Description,
          ProcessCount,
          TotalDataCount,
          TotalActionsCount,
          TotalOutputsCount,
          controlBlockInfo
        );
      });

      const aggregatedStats = new AggregatedStatistics(
        firstObjectName,
        firstObjectDescription,
        firstControlBlockInfo,
        aggregateProcesses,
        aggregateDataCount,
        aggregateActionsCount,
        aggregateOutputsCount
      );

      return new ProcessorStatistics(
        decoded.length, // Total number of objects in the array
        aggregatedStats,
        perObjectStats // Statistics for each object
      );
    } catch (error) {
      console.error('Failed to parse executionDefinition:', error);

      // Return a new instance with error details in the description
      const errorDescription = `Error: ${error.message}. Execution Definition: ${executionDefinition}`;

      const aggregatedStats = new AggregatedStatistics(
        'Error', // Use a placeholder as the name
        errorDescription, // Include the error message and the full execution definition
        null, // No ControlBlockInfo in case of an error
        0, // Aggregated TotalProcesses set to 1
        0, // Aggregated TotalDataCount set to 1
        0, // Aggregated TotalActionsCount set to 1
        0 // Aggregated TotalOutputsCount set to 1
      );

      return new ProcessorStatistics(
        0, // Total number of objects set to 1
        aggregatedStats,
        [] // Empty object list since parsing failed
      );
    }
  }
  /**
   * Retrieves processor statistics. If the statistics are not already cached, calculates them, stores them, and returns them.
   */
  public getProcessorStatistics(executionDefinition: string): ProcessorStatistics | null {
    // Generate a hash for caching
    const hash = this.getExecutionDefinitionHash(executionDefinition);

    // Check if the statistics are already cached
    if (this.cache.has(hash)) {
      return this.cache.get(hash); // Return the cached statistics
    }

    // Otherwise, calculate the statistics
    const statistics = this.calculateProcessorStatistics(executionDefinition);
    if (statistics) {
      this.cache.set(hash, statistics); // Cache the newly calculated statistics
    }

    return statistics; // Return the calculated statistics
  }
}
