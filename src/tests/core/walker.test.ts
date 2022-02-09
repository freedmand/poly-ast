import { walk, walkNode, WalkObject, walkValue } from "../../core/walker";
import { parseToAst } from "../../js/parse";
import * as ast from "../../core/ast";
import counterSource from "./counter.source.js";

type EventTuple = [
  "enter" | "leave",
  WalkObject,
  ast.Node | null,
  string | null,
  number | null
];

test("tree walker", () => {
  const program = parseToAst(counterSource, true);
  const events: EventTuple[] = [];

  walk(program, {
    enter(object, parent, property, index) {
      events.push(["enter", object, parent, property, index]);
    },
    leave(object, parent, property, index) {
      events.push(["leave", object, parent, property, index]);
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
    ["enter", walkNode(program), null, null, null],

    // Count declare
    ["enter", walkNode(countDeclare), program, "body", 0],
    // Count name
    ["enter", walkValue(countName), countDeclare, "name", null],
    ["leave", walkValue(countName), countDeclare, "name", null],
    // Count value
    ["enter", walkNode(countValue), countDeclare, "value", null],
    // Count number literal
    ["enter", walkValue(countNumberLiteral), countValue, "value", null],
    ["leave", walkValue(countNumberLiteral), countValue, "value", null],
    ["leave", walkNode(countValue), countDeclare, "value", null],
    ["leave", walkNode(countDeclare), program, "body", 0],
    // Return statement
    ["enter", walkNode(returnStatement), program, "body", 1],

    // Div element
    ["enter", walkNode(divElement), returnStatement, "value", null],
    ["enter", walkValue(divTag), divElement, "tag", null],
    ["leave", walkValue(divTag), divElement, "tag", null],
    // H1 element
    ["enter", walkNode(h1Element), divElement, "children", 0],
    ["enter", walkValue(h1Tag), h1Element, "tag", null],
    ["leave", walkValue(h1Tag), h1Element, "tag", null],
    ["enter", walkNode(counterText), h1Element, "children", 0],
    ["enter", walkValue(counterStringLiteral), counterText, "value", null],
    ["leave", walkValue(counterStringLiteral), counterText, "value", null],
    ["leave", walkNode(counterText), h1Element, "children", 0],
    ["leave", walkNode(h1Element), divElement, "children", 0],
    // Paragraph
    ["enter", walkNode(pElement), divElement, "children", 1],
    ["enter", walkValue(pTag), pElement, "tag", null],
    ["leave", walkValue(pTag), pElement, "tag", null],
    ["enter", walkNode(countText), pElement, "children", 0],
    ["enter", walkValue(countStringLiteral), countText, "value", null],
    ["leave", walkValue(countStringLiteral), countText, "value", null],
    ["leave", walkNode(countText), pElement, "children", 0],
    ["enter", walkNode(countIdentifier), pElement, "children", 1],
    ["enter", walkValue(countIdentifierName), countIdentifier, "name", null],
    ["leave", walkValue(countIdentifierName), countIdentifier, "name", null],
    ["leave", walkNode(countIdentifier), pElement, "children", 1],
    ["leave", walkNode(pElement), divElement, "children", 1],
    // Button
    ["enter", walkNode(buttonElement), divElement, "children", 2],
    ["enter", walkValue(buttonTag), buttonElement, "tag", null],
    ["leave", walkValue(buttonTag), buttonElement, "tag", null],
    // Click event attribute
    ["enter", walkNode(clickEventAttribute), buttonElement, "attributes", 0],
    ["enter", walkValue(clickEventName), clickEventAttribute, "event", null],
    ["leave", walkValue(clickEventName), clickEventAttribute, "event", null],
    [
      "enter",
      walkNode(clickEventHandler),
      clickEventAttribute,
      "eventHandler",
      null,
    ],
    ["enter", walkNode(clickBody), clickEventHandler, "body", null],
    ["enter", walkNode(clickExpression), clickBody, "body", 0],
    ["enter", walkNode(clickAssign), clickExpression, "value", null],
    ["enter", walkNode(assignCountLeft), clickAssign, "left", null],
    ["enter", walkValue(assignCountLeftName), assignCountLeft, "name", null],
    ["leave", walkValue(assignCountLeftName), assignCountLeft, "name", null],
    ["leave", walkNode(assignCountLeft), clickAssign, "left", null],
    ["enter", walkNode(assignPlus), clickAssign, "right", null],
    ["enter", walkNode(assignCountRight), assignPlus, "left", null],
    ["enter", walkValue(assignCountRightName), assignCountRight, "name", null],
    ["leave", walkValue(assignCountRightName), assignCountRight, "name", null],
    ["leave", walkNode(assignCountRight), assignPlus, "left", null],
    ["enter", walkNode(assignCountNumber), assignPlus, "right", null],
    [
      "enter",
      walkValue(assignCountNumberLiteral),
      assignCountNumber,
      "value",
      null,
    ],
    [
      "leave",
      walkValue(assignCountNumberLiteral),
      assignCountNumber,
      "value",
      null,
    ],
    ["leave", walkNode(assignCountNumber), assignPlus, "right", null],
    ["leave", walkNode(assignPlus), clickAssign, "right", null],
    ["leave", walkNode(clickAssign), clickExpression, "value", null],
    ["leave", walkNode(clickExpression), clickBody, "body", 0],
    ["leave", walkNode(clickBody), clickEventHandler, "body", null],
    [
      "leave",
      walkNode(clickEventHandler),
      clickEventAttribute,
      "eventHandler",
      null,
    ],
    ["leave", walkNode(clickEventAttribute), buttonElement, "attributes", 0],
    ["enter", walkNode(plusText), buttonElement, "children", 0],
    ["enter", walkValue(plusStringLiteral), plusText, "value", null],
    ["leave", walkValue(plusStringLiteral), plusText, "value", null],
    ["leave", walkNode(plusText), buttonElement, "children", 0],
    ["leave", walkNode(buttonElement), divElement, "children", 2],
    // Leave top-level things
    ["leave", walkNode(divElement), returnStatement, "value", null],
    ["leave", walkNode(returnStatement), program, "body", 1],
    ["leave", walkNode(program), null, null, null],
  ] as EventTuple[]);
});
