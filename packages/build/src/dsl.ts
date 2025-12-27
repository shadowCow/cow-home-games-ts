import { Job, JobFn } from './job';
import { TaskRunner } from './runner';

export class BuildDSL {
  private runner: TaskRunner = new TaskRunner();

  job(name: string, fn: JobFn): Job {
    const job = new Job({ name, fn });
    this.runner.register(job);
    return job;
  }

  async run(jobName: string): Promise<void> {
    await this.runner.run(jobName);
  }
}

export function createBuild(): BuildDSL {
  return new BuildDSL();
}
