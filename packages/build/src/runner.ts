import { Graph } from './graph';
import { Job } from './job';

export class TaskRunner {
  private jobs: Map<string, Job> = new Map();
  private graph: Graph = new Graph();

  register(job: Job): void {
    this.jobs.set(job.name, job);
    this.graph.addNode(job.name);

    for (const dep of job.getDependencies()) {
      this.graph.addEdge(job.name, dep.name);
      if (!this.jobs.has(dep.name)) {
        this.register(dep);
      }
    }
  }

  async run(jobName: string): Promise<void> {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job not found: ${jobName}`);
    }

    const executionOrder = this.graph.topologicalSort();
    const jobsToRun = this.getJobsToRun(jobName, executionOrder);

    console.log(`Execution plan: ${jobsToRun.map(j => j.name).join(' → ')}\n`);

    for (const jobToRun of jobsToRun) {
      await jobToRun.execute();
    }

    console.log('\n✓ All tasks completed successfully');
  }

  private getJobsToRun(targetJobName: string, executionOrder: string[]): Job[] {
    const visited = new Set<string>();
    const collect = (jobName: string): void => {
      if (visited.has(jobName)) return;
      visited.add(jobName);

      const job = this.jobs.get(jobName);
      if (!job) return;

      for (const dep of job.getDependencies()) {
        collect(dep.name);
      }
    };

    collect(targetJobName);

    return executionOrder
      .filter(name => visited.has(name))
      .map(name => this.jobs.get(name)!);
  }
}
