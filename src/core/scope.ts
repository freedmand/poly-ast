/**
 * A scoper for the Poly ast
 */

import * as ast from "./ast";
import type { Namer } from "./namer";
import {
  BaseWalkNode,
  getAncestorOfType,
  isTypeWalkNode,
  WalkNode,
  WalkObject,
} from "./walker";

export class VariableRedeclared extends Error {}
export class VariableUndeclared extends Error {}

type HasName = ast.DeclareStatement | ast.Identifier | ast.Func;

export class SubNameError extends Error {}

export function subName(
  node: HasName,
  placeholder: symbol,
  name: string
): null {
  switch (node.type) {
    case "DeclareStatement":
      node.name = name;
      return null;
    case "Identifier":
      node.name = name;
      return null;
    case "Func":
      let subbed = false;
      for (let i = 0; i < node.params.length; i++) {
        if (node.params[i] == placeholder) {
          node.params[i] = name;
          if (subbed) {
            throw new SubNameError("Expected just one param to be subbed");
          }
          subbed = true;
        }
      }
      if (!subbed) {
        throw new SubNameError("Expected one param to be subbed, got none");
      }
      return null;
  }
}

export type Placeholder = {
  type: "Placeholder";
};
export const scopePlaceholder: Placeholder = {
  type: "Placeholder",
};
export function isPlaceholder<T>(node: T | Placeholder): node is Placeholder {
  if (node != null && (node as Placeholder).type == "Placeholder") return true;
  return false;
}

export class Scope<T = WalkNode> {
  declarations: { [name: ast.Name]: T | Placeholder } = {};
  children: Scope<T>[] = [];
  references: { [name: ast.Name]: (T | Placeholder)[] } = {};
  assigns: { [name: ast.Name]: T[] } = {};
  // When the key name is updated (i.e. assigned to), call the
  // corresponding functions to reactively update
  reactiveAssigns: { [name: ast.Name]: [symbol, ast.Name[]][] } = {};
  // Placeholders that need resolving later
  placeholders: { [name: symbol]: HasName[] } = {};

  constructor(
    readonly parent: Scope<T> | null = null,
    readonly node: T | Placeholder
  ) {
    if (this.parent != null) {
      this.parent.children.push(this);
    }
  }

  /**
   * Returns whether the specified name is assigned in the scope
   * or any parent scopes
   */
  has(name: ast.Name): boolean {
    if (this.declarations[name] != null) {
      return true;
    }
    if (this.parent != null) {
      return this.parent.has(name);
    }
    return false;
  }

  /**
   * Returns whether the specified name is assigned in the immediate scope
   * (does not check any parent scopes)
   */
  hasImmediate(name: ast.Name): boolean {
    return this.declarations[name] != null;
  }

  /**
   * Grabs the value of the specified name in the scope or any parent scopes.
   * @throws {VariableUndeclared} If the name is not found in any scopes
   */
  get(name: ast.Name): T | Placeholder {
    const node = this.declarations[name];
    if (node != null) {
      return node;
    }
    if (this.parent != null) {
      return this.parent.get(name);
    }
    throw new VariableUndeclared(`${String(name)} has not been declared`);
  }

  /**
   * Declares the variable in the scope to the specified node
   * @throws {VariableRedeclared} If the name has already been declared in
   *     the immediate scope.
   */
  addDeclaration(name: ast.Name, node: T | Placeholder): ast.Name {
    if (this.declarations[name] != null) {
      throw new VariableRedeclared(`${String(name)} has already been declared`);
    }
    this.declarations[name] = node;
    return name;
  }

  /**
   * Adds a reference to the variable in the scope at a later node
   * @throws {VariableUndeclared} If the name is not declared
   */
  addReference(name: ast.Name, node: T | Placeholder): ast.Name {
    if (!this.has(name)) {
      throw new VariableUndeclared(`${String(name)} not found in scope`);
    }
    this.references[name] = (this.references[name] || []).concat([node]);
    return name;
  }

  /**
   * Adds a reference to an assign of the variable in the scope at a later node
   * @throws {VariableUndeclared} If the name is not declared
   */
  addAssign(name: ast.Name, node: T) {
    if (!this.has(name)) {
      throw new VariableUndeclared(`${String(name)} not found in scope`);
    }
    this.assigns[name] = (this.assigns[name] || []).concat([node]);
  }

  /**
   * Tracks a reactive variable in the current scope by name and the symbol of
   * the update function to call if the variable is reassigned
   * @param name The name of the variable
   * @param updateFuncName The update function symbol to call when the variable
   *     is reassigned
   * @param dependencies What gets updated whenever the variable changes, i.e.
   *     what the updateFuncName updates
   * @throws {VariableUndeclared} If the name is not declared
   */
  trackReactiveAssign(
    name: ast.Name,
    updateFuncName: symbol,
    ...dependencies: ast.Name[]
  ) {
    if (!this.has(name)) {
      throw new VariableUndeclared(`${String(name)} not found in scope`);
    }
    this.reactiveAssigns[name] = (this.reactiveAssigns[name] || []).concat([
      [updateFuncName, dependencies],
    ]);
  }

  /**
   * Retrieves all the placeholder functions to reactively update when a
   * variable is assigned
   * @param assignName The name of the variable getting assigned
   * @returns An ordered list of all placeholder functions to call
   */
  getReactiveUpdates(
    assignName: ast.Name,
    _updateFuncs: symbol[] = []
  ): symbol[] {
    // Grab all the top-level reactive functions to run
    const reactiveAssigns = this.reactiveAssigns[assignName] || [];
    for (const [updateFuncName, dependencies] of reactiveAssigns) {
      // Iterate through all the functions, adding them to a list
      _updateFuncs.push(updateFuncName);
      for (const dependency of dependencies) {
        // Iterate through their dependencies, recursively including
        // any update functions from dependent updates
        this.getReactiveUpdates(dependency, _updateFuncs);
      }
    }
    return _updateFuncs;
  }

  /**
   * Tracks a new usage of a placeholder in the current scope. A placeholder is
   * typically auto-generated, so we need to explicitly track each of its uses
   * so they can be reoslved to a proper name post-analysis.
   * @param placeholder The placeholder symbol
   * @param node The node that uses the placeholder
   */
  trackPlaceholder(placeholder: symbol, node: HasName) {
    this.placeholders[placeholder] = (
      this.placeholders[placeholder] || []
    ).concat([node]);
  }

  /**
   * Substitutes all the placeholders in the scope with names
   * @param namer The namer instance that defines the strategy to use when
   *     resolving all the names
   */
  subPlaceholders(namer: Namer<T>) {
    for (const placeholder of Object.getOwnPropertySymbols(this.placeholders)) {
      const nodes = this.placeholders[placeholder];
      const name = namer.getName(this, placeholder);
      for (const node of nodes) {
        subName(node, placeholder, name);
      }
      this.addDeclaration(name, scopePlaceholder);
    }

    for (const child of this.children) {
      child.subPlaceholders(namer);
    }
  }
}

export class ScopeError extends Error {}

export function assertScope<T extends Scope>(
  scope: T | null
): asserts scope is T {
  if (scope == null) {
    throw new ScopeError("Expected scope to be non-null");
  }
}

export class ScopeContext<Scoper extends Scope<WalkNode>> {
  // The highest level scope
  public rootScope: Scoper | null = null;
  // Current scope as parsing
  public scope: Scoper | null = this.rootScope;

  constructor(
    readonly scopeProvider: (
      parent: Scoper | null,
      walkNode: WalkNode
    ) => Scoper = (parent, node) => new Scope(parent, node) as Scoper
  ) {}

  createNewScope(walkNode: WalkNode) {
    this.scope = this.scopeProvider(this.scope, walkNode);
    if (this.rootScope == null) {
      // First scope encountered is the root scope
      this.rootScope = this.scope;
    }
    return this.scope;
  }

  /**
   * Returns a scope if a new one is created, or else null
   */
  enter(object: WalkObject): Scope | null {
    // Only check nodes
    if (object.kind != "node") return null;
    if (isTypeWalkNode<ast.BlockStatement>(object, "BlockStatement")) {
      // Create a new scope
      if (object.parent == null || object.parent.value.type != "Func") {
        // ... but only if the parent node wasn't a function
        return this.createNewScope(object);
      }
    } else if (
      isTypeWalkNode<ast.DeclareStatement>(object, "DeclareStatement")
    ) {
      // Declare a variable in the scope
      assertScope(this.scope);
      object.value.name = this.scope.addDeclaration(object.value.name, object);
    } else if (isTypeWalkNode<ast.Func>(object, "Func")) {
      // Create a new scope for functions
      // with all the parameters declared
      assertScope(this.scope);
      this.createNewScope(object);
      for (let i = 0; i < object.value.params.length; i++) {
        object.value.params[i] = this.scope.addDeclaration(
          object.value.params[i],
          object
        );
      }
      return this.scope;
    } else if (isTypeWalkNode<ast.Identifier>(object, "Identifier")) {
      // Reference the variable in the scope
      assertScope(this.scope);
      object.value.name = this.scope.addReference(object.value.name, object);
    }
    return null;
  }

  popScope() {
    // Pop the scope by setting the current scope to the parent's
    assertScope(this.scope);
    this.scope = this.scope.parent as Scoper | null;
  }

  leave(object: WalkObject) {
    // Only check nodes
    if (object.kind != "node") return;
    if (isTypeWalkNode<ast.BlockStatement>(object, "BlockStatement")) {
      // Pop the scope
      if (object.parent == null || object.parent.value.type != "Func") {
        // ... but only if the parent node wasn't a function
        this.popScope();
      }
    } else if (isTypeWalkNode<ast.Func>(object, "Func")) {
      this.popScope();
    }
  }
}

export class ReactiveAssignContext {
  constructor(readonly scopeContext: ScopeContext<Scope<WalkNode>>) {}

  enter(object: WalkObject) {
    if (isTypeWalkNode<ast.Assign>(object, "Assign")) {
      // See if any reactives are affected
      if (object.value.left.type == "Identifier") {
        assertScope(this.scopeContext.scope);
        const funcsToUpdateReactives =
          this.scopeContext.scope.getReactiveUpdates(object.value.left.name);
        if (funcsToUpdateReactives.length > 0) {
          // Find the parent statement
          const parentStatement = getAncestorOfType<ast.Statement>(
            object,
            "DeclareStatement",
            "ExpressionStatement",
            "ReturnStatement"
          );
          if (
            parentStatement.value.type == "DeclareStatement" ||
            parentStatement.value.type == "ExpressionStatement"
          ) {
            if (object.parent == parentStatement) {
              // Call functions after normal statement
              for (const funcToUpdateReactive of funcsToUpdateReactives) {
                const identifier: ast.Identifier = {
                  type: "Identifier",
                  name: funcToUpdateReactive,
                };
                parentStatement.insertAfter({
                  type: "ExpressionStatement",
                  value: {
                    type: "Call",
                    func: identifier,
                    arguments: [],
                  },
                });
                this.scopeContext.scope.trackPlaceholder(
                  funcToUpdateReactive,
                  identifier
                );
              }
            } else {
              // Move assign to intermediate value
              const placeholder = Symbol("__intermediateValue");
              // Insert placeholder assign above
              const declareStatement: ast.DeclareStatement = {
                type: "DeclareStatement",
                name: placeholder,
                value: object.value,
              };
              parentStatement.insertBefore(declareStatement);
              this.scopeContext.scope.trackPlaceholder(
                placeholder,
                declareStatement
              );
              // Call update functions after placeholder assign,
              // before current statement
              for (const funcToUpdateReactive of funcsToUpdateReactives) {
                const identifier: ast.Identifier = {
                  type: "Identifier",
                  name: funcToUpdateReactive,
                };
                parentStatement.insertBefore({
                  type: "ExpressionStatement",
                  value: {
                    type: "Call",
                    func: identifier,
                    arguments: [],
                  },
                });
                this.scopeContext.scope.trackPlaceholder(
                  funcToUpdateReactive,
                  identifier
                );
              }
              // Replace assigns with intermediate placeholders
              const identifier: ast.Identifier = {
                type: "Identifier",
                name: placeholder,
              };
              object.replace(identifier);
              this.scopeContext.scope.trackPlaceholder(placeholder, identifier);
            }
          } else if (parentStatement.value.type == "ReturnStatement") {
            // In a return statement we have to split the return up
            if (parentStatement.value.value == null) {
              throw new ReactiveError(
                "Unexpected empty reactive return statement"
              );
            }
            const placeholder = Symbol("__returnValue");
            // Declare an intermediate placeholder
            const declareStatement: ast.DeclareStatement = {
              type: "DeclareStatement",
              name: placeholder,
              value: parentStatement.value.value,
            };
            parentStatement.replace(declareStatement);
            this.scopeContext.scope.trackPlaceholder(
              placeholder,
              declareStatement
            );
            // Call functions after placeholder declaration
            for (const funcToUpdateReactive of funcsToUpdateReactives) {
              parentStatement.insertAfter({
                type: "ExpressionStatement",
                value: {
                  type: "Call",
                  func: {
                    type: "Identifier",
                    name: funcToUpdateReactive,
                  },
                  arguments: [],
                },
              });
            }
            // Return the placeholder value
            const identifier: ast.Identifier = {
              type: "Identifier",
              name: placeholder,
            };
            parentStatement.insertAfter({
              type: "ReturnStatement",
              value: identifier,
            });
            this.scopeContext.scope.trackPlaceholder(placeholder, identifier);
          } else {
            throw new ReactiveError(
              `Unexpected statement type ${parentStatement.value.type}`
            );
          }
        }
      }
    }
  }
}

export class Reactive {
  public name: ast.Name;
  public isAssign: boolean;
  public statement: BaseWalkNode<ast.Statement>;

  constructor(readonly walkNode: BaseWalkNode<ast.Reactive>) {
    if (walkNode.value.value.type != "Identifier") {
      throw new ReactiveError(
        "Only single identifier reactives supported right now"
      );
    }
    this.name = walkNode.value.value.name;
    this.isAssign =
      walkNode.parent != null &&
      walkNode.parent.value.type == "Assign" &&
      walkNode.property == "left";
    this.statement = getAncestorOfType(
      walkNode,
      "DeclareStatement",
      "ExpressionStatement"
    );
    // Remove reactive wrapper
    this.walkNode.replace(this.walkNode.value.value);
  }
}

export class ReactiveTracker {
  // Contains a stack of declare/expression statements to track which one contains reactives
  public reactiveStack: BaseWalkNode<
    ast.DeclareStatement | ast.ExpressionStatement
  >[] = [];
  // Maps declare/expression statements to reactives
  public reactiveMap: WeakMap<
    BaseWalkNode<ast.DeclareStatement | ast.ExpressionStatement>,
    Reactive[]
  > = new WeakMap();

  enter(walkObject: WalkObject) {
    if (walkObject.kind != "node") return;
    if (
      isTypeWalkNode<ast.DeclareStatement>(walkObject, "DeclareStatement") ||
      isTypeWalkNode<ast.ExpressionStatement>(walkObject, "ExpressionStatement")
    ) {
      // Inside something that could contain reactives!
      this.reactiveStack.push(walkObject);
    } else if (isTypeWalkNode<ast.Reactive>(walkObject, "Reactive")) {
      // Ensure we are inside a reactive
      if (this.reactiveStack.length == 0) {
        throw new Error("Encountered reactive outside of expected context");
      }
      // Grab end of stack
      const reactiveContainer =
        this.reactiveStack[this.reactiveStack.length - 1];
      if (!this.reactiveMap.has(reactiveContainer)) {
        // Create empty array if nothing is set yet
        this.reactiveMap.set(reactiveContainer, []);
      }
      const currentContents = this.reactiveMap.get(reactiveContainer)!;
      currentContents.push(new Reactive(walkObject));
    }
  }

  leave(walkObject: WalkObject): Reactive[] {
    if (
      this.reactiveStack.length > 0 &&
      this.reactiveStack[this.reactiveStack.length - 1] == walkObject
    ) {
      // Pop from the stack
      return this.reactiveMap.get(this.reactiveStack.pop()!) || [];
    }
    return [];
  }
}

export class ReactiveError extends Error {}

/**
 * A function to call when you leave a declare or expression statement
 * that will bind the reactives to the scope.
 * @param walkObject The reference to the node you are leaving in the walker
 * @param reactives A list of reactives that were encountered
 * @param scopeContext The current scope context
 */
export function handleReactives(
  walkObject: WalkObject,
  reactives: Reactive[],
  scopeContext: ScopeContext<Scope<WalkNode>>
) {
  if (reactives.length == 0) {
    // The function should not get called unless there are reactives
    throw new ReactiveError("No reactives to handle");
  }

  const reactiveNames = reactives
    .map((reactive) => String(reactive.name))
    .join("_");

  if (isTypeWalkNode<ast.DeclareStatement>(walkObject, "DeclareStatement")) {
    // Handle reactive declare
    if (walkObject.value.value == null) {
      throw new ReactiveError("Cannot handle reactive empty declaration");
    }
    assertScope(scopeContext.scope);

    const dependent = walkObject.value.name;
    // Insert empty declaration above
    walkObject.insertBefore({
      type: "DeclareStatement",
      name: walkObject.value.name,
      value: null,
    });
    // Replace with setVarName closure
    const updateClosureName = Symbol(
      `__update_${String(walkObject.value.name)}_with_${reactiveNames}`
    );
    const declareStatement: ast.DeclareStatement = {
      type: "DeclareStatement",
      name: updateClosureName,
      value: {
        type: "Func",
        params: [],
        body: {
          type: "BlockStatement",
          body: [
            {
              type: "ExpressionStatement",
              value: {
                type: "Assign",
                left: {
                  type: "Identifier",
                  name: walkObject.value.name,
                },
                right: walkObject.value.value,
              },
            },
          ],
        },
      },
    };
    walkObject.replace(declareStatement);
    scopeContext.scope.trackPlaceholder(updateClosureName, declareStatement);

    // Call closure afterwards
    const identifier: ast.Identifier = {
      type: "Identifier",
      name: updateClosureName,
    };
    walkObject.insertAfter({
      type: "ExpressionStatement",
      value: {
        type: "Call",
        func: identifier,
        arguments: [],
      },
    });
    scopeContext.scope.trackPlaceholder(updateClosureName, identifier);
    // Track future changes
    for (const reactive of reactives) {
      scopeContext.scope.trackReactiveAssign(
        reactive.name,
        updateClosureName,
        dependent
      );
    }
  } else if (
    isTypeWalkNode<ast.ExpressionStatement>(walkObject, "ExpressionStatement")
  ) {
    // Handle reactive expression
    assertScope(scopeContext.scope);

    // Replace with updateVarName closure
    const updateClosureName = Symbol(`__update_${reactiveNames}`);
    const declareStatement: ast.DeclareStatement = {
      type: "DeclareStatement",
      name: updateClosureName,
      value: {
        type: "Func",
        params: [],
        body: {
          type: "BlockStatement",
          body: [walkObject.value],
        },
      },
    };
    walkObject.replace(declareStatement);
    scopeContext.scope.trackPlaceholder(updateClosureName, declareStatement);
    // Call updateVarName closure
    const identifier: ast.Identifier = {
      type: "Identifier",
      name: updateClosureName,
    };
    walkObject.insertAfter({
      type: "ExpressionStatement",
      value: {
        type: "Call",
        func: identifier,
        arguments: [],
      },
    });
    scopeContext.scope.trackPlaceholder(updateClosureName, identifier);
    // Track future changes
    for (const reactive of reactives) {
      scopeContext.scope.trackReactiveAssign(reactive.name, updateClosureName);
    }
  } else {
    throw new ReactiveError(
      "Can only handle reactives in declare statements or expression statements"
    );
  }
}
