/**
 * A walker for the Poly ast
 * (inspired by https://github.com/Rich-Harris/estree-walker)
 */

import * as ast from "./ast";

export interface Walker {
  enter(
    object: WalkObject,
    parent: ast.Node | null,
    property: string | null,
    index: number | null
  ): void;
  leave?(
    object: WalkObject,
    parent: ast.Node | null,
    property: string | null,
    index: number | null
  ): void;
}

export type WalkObject = WalkNode | WalkValue;

export type WalkNode = {
  kind: "node";
  value: ast.Node;
};

export type WalkValue = {
  kind: "value";
  value: any;
};

export function walkNode(node: ast.Node): WalkNode {
  return {
    kind: "node",
    value: node,
  };
}

type NotNode<T> = T extends ast.Node ? never : T;

// Don't allow this function to get called on an ast.Node
export function walkValue<T>(value: NotNode<T>): WalkValue {
  return {
    kind: "value",
    value,
  };
}

export function walkNull<T>(node: ast.Node | null): WalkObject {
  if (node == null) return walkValue(null);
  return walkNode(node);
}

type ExcludeType<T> = Exclude<keyof T, "type" | number | symbol>;

function nodeKeys<T extends ast.Node>(node: T): Array<ExcludeType<T>> {
  return Object.keys(node).filter((k) => k != "type") as Array<ExcludeType<T>>;
}

function nodeKeyMap<T extends ast.Node>(
  node: T,
  fn: (key: ExcludeType<T>) => null
): null {
  nodeKeys(node).map(fn);
  return null;
}

class WalkContext {
  public skipped = false;
  // TODO: remove/replaced
  // public removed = false;
  // public replaced = false;
  // public replaceObject: WalkObject | null = null;

  constructor() {}

  skip() {
    this.skipped = true;
  }

  // // TODO: remove and replace methods
  // remove() {
  //   this.removed = true;
  // }

  // replace(replaceObject: WalkObject) {
  //   this.replaced = true;
  //   this.replaceObject = replaceObject;
  // }
}

export function walk(node: ast.Node, walker: Walker) {
  // Set up helper functions
  function visitArrayNode<T extends ast.Node, U extends ExcludeType<T>>(
    node: T,
    property: U,
    array: Array<ast.Node>
  ): null {
    for (let i = 0; i < array.length; i++) {
      visit(walkNode(array[i]), node, property, i, walker);
    }
    return null;
  }

  function visitArrayValue<T extends ast.Node, U extends ExcludeType<T>>(
    node: T,
    property: U,
    array: Array<any>
  ): null {
    for (let i = 0; i < array.length; i++) {
      visit(walkValue(array[i]), node, property, i, walker);
    }
    return null;
  }

  function traverse(node: ast.Node): null {
    switch (node.type) {
      // Statements
      case "BlockStatement":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "body":
              return visitArrayNode(node, "body", node.body);
          }
        });
      case "DeclareStatement":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "name":
              return visit(walkValue(node.name), node, "name", null, walker);
            case "value":
              return visit(walkNode(node.value), node, "value", null, walker);
          }
        });
      case "ReturnStatement":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "value":
              return visit(walkNull(node.value), node, "value", null, walker);
          }
        });
      case "ExpressionStatement":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "value":
              return visit(walkNode(node.value), node, "value", null, walker);
          }
        });
      // Expressions
      case "Literal":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "value":
              return visit(walkValue(node.value), node, "value", null, walker);
          }
        });
      case "Identifier":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "name":
              return visit(walkValue(node.name), node, "name", null, walker);
          }
        });
      case "Plus":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "left":
              return visit(walkNode(node.left), node, "left", null, walker);
            case "right":
              return visit(walkNode(node.right), node, "right", null, walker);
          }
        });
      case "Assign":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "left":
              return visit(walkNode(node.left), node, "left", null, walker);
            case "right":
              return visit(walkNode(node.right), node, "right", null, walker);
          }
        });
      case "Reactive":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "value":
              return visit(walkNode(node.value), node, "value", null, walker);
          }
        });
      case "List":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "value":
              return visitArrayNode(node, "value", node.value);
          }
        });
      case "Element":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "tag":
              return visit(walkValue(node.tag), node, "tag", null, walker);
            case "attributes":
              return visitArrayNode(node, "attributes", node.attributes);
            case "children":
              return visitArrayNode(node, "children", node.children);
          }
        });
      case "NormalAttribute":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "key":
              return visit(walkValue(node.key), node, "key", null, walker);
            case "value":
              return visit(walkNull(node.value), node, "value", null, walker);
          }
        });
      case "EventAttribute":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "event":
              return visit(walkValue(node.event), node, "event", null, walker);
            case "eventHandler":
              return visit(
                walkNode(node.eventHandler),
                node,
                "eventHandler",
                null,
                walker
              );
          }
        });
      case "Func":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "params":
              return visitArrayValue(node, "params", node.params);
            case "body":
              return visit(walkNode(node.body), node, "body", null, walker);
          }
        });
      case "Call":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "func":
              return visit(walkNode(node.func), node, "func", null, walker);
            case "arguments":
              return visitArrayNode(node, "arguments", node.arguments);
          }
        });
    }
  }

  function visit<Parent extends ast.Node>(
    node: WalkObject,
    parent: Parent | null,
    property: ExcludeType<Parent> | null,
    index: number | null,
    walker: Walker
  ): null {
    const walkContext = new WalkContext();

    // Enter the node
    walker.enter.call(walkContext, node, parent, property, index);
    // Removed or skipped
    if (walkContext.skipped) {
      return null;
    }
    // TODO: remove/replace

    if (node.kind == "node") {
      traverse(node.value);
    }
    if (walker.leave != null) {
      walker.leave.call(walkContext, node, parent, property, index);
    }
    return null;
  }

  // Begin by visiting the passed in node
  visit(walkNode(node), null, null, null, walker);
}
