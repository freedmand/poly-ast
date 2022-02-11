/**
 * A scoper for the Poly ast
 * (inspired by https://github.com/Rich-Harris/periscopic)
 */

import * as ast from "./ast";
import { walk } from "./walker";

export class VariableRedeclared extends Error {}
export class VariableUndeclared extends Error {}

export class Scope {
  declarations: { [name: string]: ast.Node } = {};
  children: Scope[] = [];
  references: { [name: string]: ast.Node[] } = {};

  constructor(readonly parent: Scope | null = null) {
    if (this.parent != null) {
      this.parent.children.push(this);
    }
  }

  has(name: string): boolean {
    if (this.declarations[name] != null) {
      return true;
    }
    if (this.parent != null) {
      return this.parent.has(name);
    }
    return false;
  }

  get(name: string): ast.Node {
    const node = this.declarations[name];
    if (node != null) {
      return node;
    }
    if (this.parent != null) {
      return this.parent.get(name);
    }
    throw new VariableUndeclared(`${name} has not been declared`);
  }

  add(name: string, node: ast.Node) {
    if (this.declarations[name] != null) {
      throw new VariableRedeclared(`${name} has already been declared`);
    }
    this.declarations[name] = node;
  }

  addReference(name: string, node: ast.Node) {
    if (!this.has(name)) {
      throw new VariableUndeclared(`${name} not found in scope`);
    }
    this.references[name] = (this.references[name] || []).concat([node]);
  }
}

export function analyzeScopes(program: ast.Program): Scope {
  const rootScope = new Scope();
  let scope = rootScope;

  walk(program, {
    enter(object) {
      // Only check nodes
      if (object.kind != "node") return;
      const node = object.value;
      if (node.type == "BlockStatement") {
        // Create a new scope
        if (object.parent == null || object.parent.value.type != "Func") {
          // ... but only if the parent node wasn't a function
          scope = new Scope(scope);
        }
      } else if (node.type == "DeclareStatement") {
        // Declare a variable in the scope
        scope.add(node.name, node);
      } else if (node.type == "Func") {
        // Create a new scope for functions
        // with all the parameters declared
        scope = new Scope(scope);
        for (const name of node.params) {
          scope.add(name, node);
        }
      } else if (node.type == "Identifier") {
        // Reference the variable in the scope
        scope.addReference(node.name, node);
      } else if (node.type == "Reactive") {
        // TODO: reactive
      }
    },
  });

  return rootScope;
}
