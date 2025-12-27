import { Job } from './job';
import { TaskRunner } from './runner';
import type { Action } from './actions';

export class JobGraphDSL {
  private runner: TaskRunner = new TaskRunner();

  job(name: string, actions: Action[]): Job {
    const job = new Job({ name, actions });
    this.runner.register(job);
    return job;
  }

  async run(jobName: string): Promise<void> {
    await this.runner.run(jobName);
  }
}

export function createJobGraph(): JobGraphDSL {
  return new JobGraphDSL();
}
