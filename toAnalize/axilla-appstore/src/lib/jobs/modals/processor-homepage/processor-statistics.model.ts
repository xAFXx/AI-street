// processor-statistics.model.ts
export class ProcessorStatistics {
  TotalObjects: number;
  Aggregated: AggregatedStatistics;
  PerObject: ObjectStatistics[];

  constructor(
    totalObjects: number,
    aggregated: AggregatedStatistics,
    perObject: ObjectStatistics[]
  ) {
    this.TotalObjects = totalObjects;
    this.Aggregated = aggregated;
    this.PerObject = perObject;
  }
}

export class AggregatedStatistics {
  Name: string | null;
  Description: string | null;
  ControlBlockInfo: ControlBlockInfo | null;
  TotalProcesses: number;
  TotalDataCount: number;
  TotalActionsCount: number;
  TotalOutputsCount: number;

  constructor(
    name: string | null,
    description: string | null,
    controlBlockInfo: ControlBlockInfo | null,
    totalProcesses: number,
    totalDataCount: number,
    totalActionsCount: number,
    totalOutputsCount: number
  ) {
    this.Name = name;
    this.Description = description;
    this.ControlBlockInfo = controlBlockInfo;
    this.TotalProcesses = totalProcesses;
    this.TotalDataCount = totalDataCount;
    this.TotalActionsCount = totalActionsCount;
    this.TotalOutputsCount = totalOutputsCount;
  }
}

export class ObjectStatistics {
  Name: string;
  Description: string | null;
  ProcessCount: number;
  TotalDataCount: number;
  TotalActionsCount: number;
  TotalOutputsCount: number;
  ControlBlockInfo: ControlBlockInfo;

  constructor(
    name: string,
    description: string | null,
    processCount: number,
    totalDataCount: number,
    totalActionsCount: number,
    totalOutputsCount: number,
    controlBlockInfo: ControlBlockInfo
  ) {
    this.Name = name;
    this.Description = description;
    this.ProcessCount = processCount;
    this.TotalDataCount = totalDataCount;
    this.TotalActionsCount = totalActionsCount;
    this.TotalOutputsCount = totalOutputsCount;
    this.ControlBlockInfo = controlBlockInfo;
  }
}

export class ControlBlockInfo {
  DebugLog: boolean;
  LoopEnabled: boolean;
  LoopFullReset: boolean;

  constructor(debugLog: boolean, loopEnabled: boolean, loopFullReset: boolean) {
    this.DebugLog = debugLog;
    this.LoopEnabled = loopEnabled;
    this.LoopFullReset = loopFullReset;
  }
}
