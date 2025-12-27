import type { Action } from './actions';
import { ActionExecutor } from './executor';

export interface JobConfig {
  name: string;
  actions: Action[];
  dependencies?: Job[];
}

export class Job {
  public readonly name: string;
  private actions: Action[];
  private deps: Job[];
  private executor: ActionExecutor;

  constructor(config: JobConfig) {
    this.name = config.name;
    this.actions = config.actions;
    this.deps = config.dependencies || [];
    this.executor = new ActionExecutor();
  }

  async execute(): Promise<void> {
    console.log(`[${this.name}] Starting...`);
    const start = Date.now();

    try {
      for (const action of this.actions) {
        await this.executor.execute(action);
      }
      const duration = Date.now() - start;
      console.log(`[${this.name}] Completed in ${duration}ms`);
    } catch (error) {
      console.error(`[${this.name}] Failed:`, error);
      throw error;
    }
  }

  getDependencies(): Job[] {
    return this.deps;
  }

  dependsOn(...jobs: Job[]): this {
    this.deps.push(...jobs);
    return this;
  }
}
