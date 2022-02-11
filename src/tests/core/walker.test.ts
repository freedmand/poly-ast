import { walk, WalkNode, WalkObject } from "../../core/walker";
import { parseToAst } from "../../js/parse";
import * as ast from "../../core/ast";
import counterSource from "./counter.source.js";

type SimplifiedWalkObject = SimplifiedWalkNode | SimplifiedWalkValue;

type SimplifiedWalkNode = {
  kind: "node";
  value: ast.Node;
};

type SimplifiedWalkValue = {
  kind: "value";
  value: any;
};

function simplifiedWalkNode(node: ast.Node): SimplifiedWalkNode {
  return {
    kind: "node",
    value: node,
  };
}

function simplifiedWalkValue(value: any): SimplifiedWalkValue {
  return {
    kind: "value",
    value,
  };
}

function toSimplified(walkObject: WalkObject): SimplifiedWalkObject {
  switch (walkObject.kind) {
    case "node":
      return {
        kind: "node",
        value: walkObject.value,
      };
    case "value":
      return {
        kind: "value",
        value: walkObject.value,
      };
  }
}

function extractNode(node: WalkNode | null): ast.Node | null {
  if (node == null) return null;
  return node.value;
}

type EventTuple = [
  "enter" | "leave",
  SimplifiedWalkObject,
  ast.Node | null,
  string | null,
  number | null
];

test("tree walker", () => {
  const program = parseToAst(counterSource, true);
  const events: EventTuple[] = [];

  walk(program, {
    enter(object) {
      events.push([
        "enter",
        toSimplified(object),
        extractNode(object.parent),
        object.property,
        object.index,
      ]);
    },
    leave(object) {
      events.push([
        "leave",
        toSimplified(object),
        extractNode(object.parent),
        object.property,
        object.index,
      ]);
    },
  });

  const countDeclare = program.body[0] as ast.DeclareStatement;
  const countName = countDeclare.name;
  const countValue = countDeclare.value as ast.Literal;
  const countNumberLiteral = countValue.value;
  const returnStatement = program.body[1] as ast.ReturnStatement;
  const divElement = returnStatement.value as ast.Element;
  const divTag = divElement.tag;
  const h1Element = divElement.children[0] as ast.Element;
  const h1Tag = h1Element.tag;
  const counterText = h1Element.children[0] as ast.Literal;
  const counterStringLiteral = counterText.value;
  const pElement = divElement.children[1] as ast.Element;
  const pTag = pElement.tag;
  const countText = pElement.children[0] as ast.Literal;
  const countStringLiteral = countText.value;
  const countIdentifier = pElement.children[1] as ast.Identifier;
  const countIdentifierName = countIdentifier.name;
  const buttonElement = divElement.children[2] as ast.Element;
  const buttonTag = buttonElement.tag;
  const clickEventAttribute = buttonElement.attributes[0] as ast.EventAttribute;
  const clickEventName = clickEventAttribute.event;
  const clickEventHandler = clickEventAttribute.eventHandler as ast.Func;
  const clickBody = clickEventHandler.body as ast.BlockStatement;
  const clickExpression = clickBody.body[0] as ast.ExpressionStatement;
  const clickAssign = clickExpression.value as ast.Assign;
  const assignCountLeft = clickAssign.left as ast.Identifier;
  const assignCountLeftName = assignCountLeft.name;
  const assignPlus = clickAssign.right as ast.Plus;
  const assignCountRight = assignPlus.left as ast.Identifier;
  const assignCountRightName = assignCountRight.name;
  const assignCountNumber = assignPlus.right as ast.Literal;
  const assignCountNumberLiteral = assignCountNumber.value;
  const plusText = buttonElement.children[0] as ast.Literal;
  const plusStringLiteral = plusText.value;

  expect(events).toEqual([
    // Program
    ["enter", simplifiedWalkNode(program), null, null, null],

    // Count declare
    ["enter", simplifiedWalkNode(countDeclare), program, "body", 0],
    // Count name
    ["enter", simplifiedWalkValue(countName), countDeclare, "name", null],
    ["leave", simplifiedWalkValue(countName), countDeclare, "name", null],
    // Count value
    ["enter", simplifiedWalkNode(countValue), countDeclare, "value", null],
    // Count number literal
    [
      "enter",
      simplifiedWalkValue(countNumberLiteral),
      countValue,
      "value",
      null,
    ],
    [
      "leave",
      simplifiedWalkValue(countNumberLiteral),
      countValue,
      "value",
      null,
    ],
    ["leave", simplifiedWalkNode(countValue), countDeclare, "value", null],
    ["leave", simplifiedWalkNode(countDeclare), program, "body", 0],
    // Return statement
    ["enter", simplifiedWalkNode(returnStatement), program, "body", 1],

    // Div element
    ["enter", simplifiedWalkNode(divElement), returnStatement, "value", null],
    ["enter", simplifiedWalkValue(divTag), divElement, "tag", null],
    ["leave", simplifiedWalkValue(divTag), divElement, "tag", null],
    // H1 element
    ["enter", simplifiedWalkNode(h1Element), divElement, "children", 0],
    ["enter", simplifiedWalkValue(h1Tag), h1Element, "tag", null],
    ["leave", simplifiedWalkValue(h1Tag), h1Element, "tag", null],
    ["enter", simplifiedWalkNode(counterText), h1Element, "children", 0],
    [
      "enter",
      simplifiedWalkValue(counterStringLiteral),
      counterText,
      "value",
      null,
    ],
    [
      "leave",
      simplifiedWalkValue(counterStringLiteral),
      counterText,
      "value",
      null,
    ],
    ["leave", simplifiedWalkNode(counterText), h1Element, "children", 0],
    ["leave", simplifiedWalkNode(h1Element), divElement, "children", 0],
    // Paragraph
    ["enter", simplifiedWalkNode(pElement), divElement, "children", 1],
    ["enter", simplifiedWalkValue(pTag), pElement, "tag", null],
    ["leave", simplifiedWalkValue(pTag), pElement, "tag", null],
    ["enter", simplifiedWalkNode(countText), pElement, "children", 0],
    [
      "enter",
      simplifiedWalkValue(countStringLiteral),
      countText,
      "value",
      null,
    ],
    [
      "leave",
      simplifiedWalkValue(countStringLiteral),
      countText,
      "value",
      null,
    ],
    ["leave", simplifiedWalkNode(countText), pElement, "children", 0],
    ["enter", simplifiedWalkNode(countIdentifier), pElement, "children", 1],
    [
      "enter",
      simplifiedWalkValue(countIdentifierName),
      countIdentifier,
      "name",
      null,
    ],
    [
      "leave",
      simplifiedWalkValue(countIdentifierName),
      countIdentifier,
      "name",
      null,
    ],
    ["leave", simplifiedWalkNode(countIdentifier), pElement, "children", 1],
    ["leave", simplifiedWalkNode(pElement), divElement, "children", 1],
    // Button
    ["enter", simplifiedWalkNode(buttonElement), divElement, "children", 2],
    ["enter", simplifiedWalkValue(buttonTag), buttonElement, "tag", null],
    ["leave", simplifiedWalkValue(buttonTag), buttonElement, "tag", null],
    // Click event attribute
    [
      "enter",
      simplifiedWalkNode(clickEventAttribute),
      buttonElement,
      "attributes",
      0,
    ],
    [
      "enter",
      simplifiedWalkValue(clickEventName),
      clickEventAttribute,
      "event",
      null,
    ],
    [
      "leave",
      simplifiedWalkValue(clickEventName),
      clickEventAttribute,
      "event",
      null,
    ],
    [
      "enter",
      simplifiedWalkNode(clickEventHandler),
      clickEventAttribute,
      "eventHandler",
      null,
    ],
    ["enter", simplifiedWalkNode(clickBody), clickEventHandler, "body", null],
    ["enter", simplifiedWalkNode(clickExpression), clickBody, "body", 0],
    ["enter", simplifiedWalkNode(clickAssign), clickExpression, "value", null],
    ["enter", simplifiedWalkNode(assignCountLeft), clickAssign, "left", null],
    [
      "enter",
      simplifiedWalkValue(assignCountLeftName),
      assignCountLeft,
      "name",
      null,
    ],
    [
      "leave",
      simplifiedWalkValue(assignCountLeftName),
      assignCountLeft,
      "name",
      null,
    ],
    ["leave", simplifiedWalkNode(assignCountLeft), clickAssign, "left", null],
    ["enter", simplifiedWalkNode(assignPlus), clickAssign, "right", null],
    ["enter", simplifiedWalkNode(assignCountRight), assignPlus, "left", null],
    [
      "enter",
      simplifiedWalkValue(assignCountRightName),
      assignCountRight,
      "name",
      null,
    ],
    [
      "leave",
      simplifiedWalkValue(assignCountRightName),
      assignCountRight,
      "name",
      null,
    ],
    ["leave", simplifiedWalkNode(assignCountRight), assignPlus, "left", null],
    ["enter", simplifiedWalkNode(assignCountNumber), assignPlus, "right", null],
    [
      "enter",
      simplifiedWalkValue(assignCountNumberLiteral),
      assignCountNumber,
      "value",
      null,
    ],
    [
      "leave",
      simplifiedWalkValue(assignCountNumberLiteral),
      assignCountNumber,
      "value",
      null,
    ],
    ["leave", simplifiedWalkNode(assignCountNumber), assignPlus, "right", null],
    ["leave", simplifiedWalkNode(assignPlus), clickAssign, "right", null],
    ["leave", simplifiedWalkNode(clickAssign), clickExpression, "value", null],
    ["leave", simplifiedWalkNode(clickExpression), clickBody, "body", 0],
    ["leave", simplifiedWalkNode(clickBody), clickEventHandler, "body", null],
    [
      "leave",
      simplifiedWalkNode(clickEventHandler),
      clickEventAttribute,
      "eventHandler",
      null,
    ],
    [
      "leave",
      simplifiedWalkNode(clickEventAttribute),
      buttonElement,
      "attributes",
      0,
    ],
    ["enter", simplifiedWalkNode(plusText), buttonElement, "children", 0],
    ["enter", simplifiedWalkValue(plusStringLiteral), plusText, "value", null],
    ["leave", simplifiedWalkValue(plusStringLiteral), plusText, "value", null],
    ["leave", simplifiedWalkNode(plusText), buttonElement, "children", 0],
    ["leave", simplifiedWalkNode(buttonElement), divElement, "children", 2],
    // Leave top-level things
    ["leave", simplifiedWalkNode(divElement), returnStatement, "value", null],
    ["leave", simplifiedWalkNode(returnStatement), program, "body", 1],
    ["leave", simplifiedWalkNode(program), null, null, null],
  ] as EventTuple[]);
});

type path = [string, string | null, number | null];
function extractPath(walkObject: WalkNode | null): path[] {
  if (walkObject == null) return [];
  return (
    [[walkObject.value.type, walkObject.property, walkObject.index]] as path[]
  ).concat(extractPath(walkObject.parent));
}

test("parent path", async () => {
  const program = parseToAst(
    `
    let x = a => {
      let y = b => {
        let z = c => {
          return [a, b, c];
        }
      }
    }
  `,
    true
  );

  const cPath = await new Promise<WalkNode | null>((resolve) => {
    walk(program, {
      enter(node) {
        if (
          node.kind == "node" &&
          node.value.type == "Identifier" &&
          node.value.name == "c"
        ) {
          resolve(node);
        }
      },
    });
    resolve(null);
  });

  if (cPath == null) {
    fail("Expected cPath to be non-null");
  }
  expect(extractPath(cPath)).toEqual([
    ["Identifier", "value", 2],
    ["List", "value", null],
    ["ReturnStatement", "body", 0],
    ["BlockStatement", "body", null],
    ["Func", "value", null],
    ["DeclareStatement", "body", 0],
    ["BlockStatement", "body", null],
    ["Func", "value", null],
    ["DeclareStatement", "body", 0],
    ["BlockStatement", "body", null],
    ["Func", "value", null],
    ["DeclareStatement", "body", 0],
    ["BlockStatement", null, null],
  ]);
});
