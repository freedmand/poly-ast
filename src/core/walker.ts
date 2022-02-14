/**
 * A walker for the Poly ast
 * (inspired by https://github.com/Rich-Harris/estree-walker)
 */

import * as ast from "./ast";

export interface Walker {
  enter(object: WalkObject): void;
  leave?(object: WalkObject): void;
}

export type WalkObject = WalkNode | WalkValue;

export interface BaseWalkObject {
  parent: WalkNode | null;
  property: string | null;
  index: number | null;
  walker: Walker;
}

export class InsertError extends Error {}
export class ReplaceError extends Error {}

export class WalkNode implements BaseWalkObject {
  readonly kind = "node";
  public shift = 0;

  constructor(
    readonly value: ast.Node,
    readonly parent: WalkNode | null,
    readonly property: string | null,
    readonly index: number | null,
    readonly walker: Walker
  ) {}

  insertBefore(...nodes: ast.Node[]) {
    if (this.parent == null) {
      throw new InsertError("Cannot insert before a root node");
    }
    if (this.property == null) {
      throw new InsertError("Cannot insert non-propertied node");
    }
    if (this.index == null) {
      throw new InsertError("Cannot insert non-indexed node");
    }
    const children = (this.parent.value as any)[this.property] as any[];
    this.parent.shift += nodes.length; // shift the accounting of the traversal algorithm
    children.splice(this.index, 0, ...nodes);
  }

  replace(node: ast.Node) {
    if (this.parent == null) {
      throw new ReplaceError("Cannot replace a root node");
    }
    if (this.property == null) {
      throw new ReplaceError("Cannot replace non-propertied node");
    }

    if (this.index == null) {
      // Property replacement
      (this.parent.value as any)[this.property] = node;
    } else {
      // Child replacement
      (this.parent.value as any)[this.property][
        this.index + this.parent.shift
      ] = node;
    }
  }
}

// export interface WalkNode extends BaseWalkObject {
//   kind: "node";
//   value: ast.Node;
// }

export interface WalkValue extends BaseWalkObject {
  kind: "value";
  value: any;
}

export function walkNode(
  node: ast.Node,
  parent: WalkNode | null,
  property: string | null,
  index: number | null,
  walker: Walker
): WalkNode {
  return new WalkNode(node, parent, property, index, walker);
}

type NotNode<T> = T extends ast.Node ? never : T;

// Don't allow this function to get called on an ast.Node
export function walkValue<T>(
  value: NotNode<T>,
  parent: WalkNode | null,
  property: string | null,
  index: number | null,
  walker: Walker
): WalkValue {
  return {
    kind: "value",
    parent,
    property,
    index,
    walker,
    value,
  };
}

export function walkNull<T>(
  node: ast.Node | null,
  parent: WalkNode | null,
  property: string | null,
  index: number | null,
  walker: Walker
): WalkObject {
  if (node == null) return walkValue(null, parent, property, index, walker);
  return walkNode(node, parent, property, index, walker);
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
    nodeObject: WalkNode,
    node: T,
    property: U,
    array: Array<ast.Node>
  ): null {
    for (let i = 0; i < array.length; i++) {
      visit(walkNode(array[i], nodeObject, property, i, walker));
      if (nodeObject.shift > 0) {
        i += nodeObject.shift;
        nodeObject.shift = 0;
      }
    }
    return null;
  }

  function visitArrayValue<T extends ast.Node, U extends ExcludeType<T>>(
    nodeObject: WalkNode,
    _node: T,
    property: U,
    array: Array<any>
  ): null {
    for (let i = 0; i < array.length; i++) {
      visit(walkValue(array[i], nodeObject, property, i, walker));
    }
    return null;
  }

  function traverse(nodeObject: WalkNode): null {
    const node = nodeObject.value;
    switch (node.type) {
      // Statements
      case "BlockStatement":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "body":
              return visitArrayNode(nodeObject, node, "body", node.body);
          }
        });
      case "DeclareStatement":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "name":
              return visit(
                walkValue(node.name, nodeObject, "name", null, walker)
              );
            case "value":
              return visit(
                walkNode(node.value, nodeObject, "value", null, walker)
              );
          }
        });
      case "ReturnStatement":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "value":
              return visit(
                walkNull(node.value, nodeObject, "value", null, walker)
              );
          }
        });
      case "ExpressionStatement":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "value":
              return visit(
                walkNode(node.value, nodeObject, "value", null, walker)
              );
          }
        });
      // Expressions
      case "Literal":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "value":
              return visit(
                walkValue(node.value, nodeObject, "value", null, walker)
              );
          }
        });
      case "Identifier":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "name":
              return visit(
                walkValue(node.name, nodeObject, "name", null, walker)
              );
          }
        });
      case "Plus":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "left":
              return visit(
                walkNode(node.left, nodeObject, "left", null, walker)
              );
            case "right":
              return visit(
                walkNode(node.right, nodeObject, "right", null, walker)
              );
          }
        });
      case "Assign":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "left":
              return visit(
                walkNode(node.left, nodeObject, "left", null, walker)
              );
            case "right":
              return visit(
                walkNode(node.right, nodeObject, "right", null, walker)
              );
          }
        });
      case "Reactive":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "value":
              return visit(
                walkNode(node.value, nodeObject, "value", null, walker)
              );
          }
        });
      case "List":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "value":
              return visitArrayNode(nodeObject, node, "value", node.value);
          }
        });
      case "Element":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "tag":
              return visit(
                walkValue(node.tag, nodeObject, "tag", null, walker)
              );
            case "attributes":
              return visitArrayNode(
                nodeObject,
                node,
                "attributes",
                node.attributes
              );
            case "children":
              return visitArrayNode(
                nodeObject,
                node,
                "children",
                node.children
              );
          }
        });
      case "NormalAttribute":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "key":
              return visit(
                walkValue(node.key, nodeObject, "key", null, walker)
              );
            case "value":
              return visit(
                walkNull(node.value, nodeObject, "value", null, walker)
              );
          }
        });
      case "EventAttribute":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "event":
              return visit(
                walkValue(node.event, nodeObject, "event", null, walker)
              );
            case "eventHandler":
              return visit(
                walkNode(
                  node.eventHandler,
                  nodeObject,
                  "eventHandler",
                  null,
                  walker
                )
              );
          }
        });
      case "Func":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "params":
              return visitArrayValue(nodeObject, node, "params", node.params);
            case "body":
              return visit(
                walkNode(node.body, nodeObject, "body", null, walker)
              );
          }
        });
      case "Call":
        return nodeKeyMap(node, (key) => {
          switch (key) {
            case "func":
              return visit(
                walkNode(node.func, nodeObject, "func", null, walker)
              );
            case "arguments":
              return visitArrayNode(
                nodeObject,
                node,
                "arguments",
                node.arguments
              );
          }
        });
    }
  }

  function visit(walkObject: WalkObject): null {
    const walkContext = new WalkContext();

    // Enter the node
    walker.enter.call(walkContext, walkObject);
    // Removed or skipped
    if (walkContext.skipped) {
      return null;
    }
    // TODO: remove/replace

    if (walkObject.kind == "node") {
      traverse(walkObject);
    }
    if (walker.leave != null) {
      walker.leave.call(walkContext, walkObject);
    }
    return null;
  }

  // Begin by visiting the passed in node
  visit(walkNode(node, null, null, null, walker));
}
