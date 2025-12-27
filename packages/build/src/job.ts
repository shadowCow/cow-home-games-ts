export type JobFn = () => Promise<void> | void;

export interface JobConfig {
  name: string;
  fn: JobFn;
  dependencies?: Job[];
}

export class Job {
  public readonly name: string;
  private fn: JobFn;
  private deps: Job[];

  constructor(config: JobConfig) {
    this.name = config.name;
    this.fn = config.fn;
    this.deps = config.dependencies || [];
  }

  async execute(): Promise<void> {
    console.log(`[${this.name}] Starting...`);
    const start = Date.now();

    try {
      await this.fn();
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
