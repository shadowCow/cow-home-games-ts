export class Graph {
  private nodes: Map<string, Set<string>> = new Map();

  addNode(id: string): void {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, new Set());
    }
  }

  addEdge(from: string, to: string): void {
    this.addNode(from);
    this.addNode(to);
    this.nodes.get(from)!.add(to);
  }

  topologicalSort(): string[] {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const result: string[] = [];

    const visit = (node: string): void => {
      if (temp.has(node)) {
        throw new Error(`Cycle detected at node: ${node}`);
      }
      if (visited.has(node)) {
        return;
      }

      temp.add(node);

      const deps = this.nodes.get(node);
      if (deps) {
        for (const dep of deps) {
          visit(dep);
        }
      }

      temp.delete(node);
      visited.add(node);
      result.push(node);
    };

    for (const node of this.nodes.keys()) {
      if (!visited.has(node)) {
        visit(node);
      }
    }

    return result;
  }

  getDependencies(id: string): Set<string> {
    return this.nodes.get(id) || new Set();
  }
}
