/**
 * Compile a Poly program to pure JS (for now)
 * In the future, we will determine when/how to map
 * to HTML and static content
 */

import { ESTree } from "meriyah";
import { parse } from "../js/parse";
import * as ast from "./ast";
import { NotSupported } from "./util";

const dom = "POLY_dom";
const domAppend = "POLY_domAppend";

const helpers = parse(`
function ${domAppend}(elem, children) {
  if (Array.isArray(children)) {
    children.forEach((child) => ${domAppend}(elem, child));
  } else if (children instanceof HTMLElement) {
    elem.appendChild(children);
  } else if (children != null) {
    elem.textContent = children;
  }
}

function ${dom}(tag, attributes, events, children) {
  const elem = document.createElement(tag);
  attributes.forEach(([key, value]) => elem.setAttribute(key, value));
  events.forEach(([event, handler]) => elem.addEventListener(event, (...args) => {console.log(args);return handler(args);}));
  ${domAppend}(elem, children);
  return elem;
}
`).body;

function isNormalAttribute(
  attribute: ast.Attribute
): attribute is ast.NormalAttribute {
  return attribute.type == "NormalAttribute";
}

function isEventAttribute(
  attribute: ast.Attribute
): attribute is ast.EventAttribute {
  return attribute.type == "EventAttribute";
}

export function compile(program: ast.Program): ESTree.Program {
  return {
    type: "Program",
    sourceType: "module",
    body: [
      ...helpers,
      {
        type: "ExpressionStatement",
        expression: {
          type: "CallExpression",
          callee: {
            type: "Identifier",
            name: domAppend,
          },
          arguments: [
            {
              type: "MemberExpression",
              object: {
                type: "Identifier",
                name: "document",
              },
              property: {
                type: "Identifier",
                name: "body",
              },
            },
            {
              type: "CallExpression",
              callee: {
                type: "ArrowFunctionExpression",
                async: false,
                expression: false,
                params: [],
                body: {
                  type: "BlockStatement",
                  body: program.body.map((statement) =>
                    compileStatement(statement)
                  ),
                },
              },
              arguments: [],
            },
          ],
        },
      },
    ],
  };
}

export function compileStatement(statement: ast.Statement): ESTree.Statement {
  switch (statement.type) {
    case "BlockStatement":
      return {
        type: "BlockStatement",
        body: statement.body.map((statement) => compileStatement(statement)),
      };
    case "DeclareStatement":
      return {
        type: "VariableDeclaration",
        kind: "let",
        declarations: [
          {
            type: "VariableDeclarator",
            id: {
              type: "Identifier",
              name: statement.name,
            },
            init: compileExpression(statement.value),
          },
        ],
      };
    case "ReturnStatement":
      return {
        type: "ReturnStatement",
        argument:
          statement.value == null ? null : compileExpression(statement.value),
      };
    case "ExpressionStatement":
      return {
        type: "ExpressionStatement",
        expression: compileExpression(statement.value),
      };
  }
}

export function compileExpression(
  expression: ast.Expression
): ESTree.Expression {
  switch (expression.type) {
    case "Literal":
      return compileLiteral(expression);
    case "Identifier":
      return {
        type: "Identifier",
        name: expression.name,
      };
    case "Plus":
      return {
        type: "BinaryExpression",
        operator: "+",
        left: compileExpression(expression.left),
        right: compileExpression(expression.right),
      };
    case "Assign":
      return {
        type: "AssignmentExpression",
        operator: "=",
        left: compileExpression(expression.left),
        right: compileExpression(expression.right),
      };
    case "Reactive":
      throw new NotSupported("Reactive not supported yet");
    case "List":
      return {
        type: "ArrayExpression",
        elements: expression.value.map((expression) =>
          compileExpression(expression)
        ),
      };
    case "Element":
      return {
        type: "CallExpression",
        callee: {
          type: "Identifier",
          name: dom,
        } as any,
        arguments: [
          // Tag name
          {
            type: "Literal",
            value: expression.tag,
          },
          // Attributes
          {
            type: "ArrayExpression",
            elements: expression.attributes
              .filter<ast.NormalAttribute>(isNormalAttribute)
              .map<ESTree.Expression>((attribute) => ({
                type: "ArrayExpression",
                elements: [
                  {
                    type: "Literal",
                    value: attribute.key,
                  },
                  attribute.value == null
                    ? {
                        type: "Literal",
                        value: "",
                      }
                    : compileExpression(attribute.value),
                ],
              })),
          },
          // Events
          {
            type: "ArrayExpression",
            elements: expression.attributes
              .filter<ast.EventAttribute>(isEventAttribute)
              .map<ESTree.Expression>((attribute) => ({
                type: "ArrayExpression",
                elements: [
                  {
                    type: "Literal",
                    value: attribute.event,
                  },
                  compileExpression(attribute.eventHandler),
                ],
              })),
          },
          // Children
          {
            type: "ArrayExpression",
            elements: expression.children.map((expression) =>
              compileExpression(expression)
            ),
          },
        ],
      };
    case "Func":
      return {
        type: "ArrowFunctionExpression",
        async: false,
        expression:
          expression.body.type == "ReturnStatement" &&
          expression.body.value != null,
        params: expression.params.map<ESTree.Identifier>((param) => ({
          type: "Identifier",
          name: param,
        })),
        body:
          expression.body.type == "BlockStatement"
            ? {
                type: "BlockStatement",
                body: expression.body.body.map((statement) =>
                  compileStatement(statement)
                ),
              }
            : expression.body.type == "ReturnStatement" &&
              expression.body.value != null
            ? compileExpression(expression.body.value)
            : {
                type: "BlockStatement",
                body: [compileStatement(expression.body)],
              },
      };
    case "Call":
      return {
        type: "CallExpression",
        callee: compileExpression(expression.func),
        arguments: expression.arguments.map((expression) =>
          compileExpression(expression)
        ),
      };
  }
}

export function compileLiteral(literal: ast.Literal): ESTree.Literal {
  switch (literal.value.type) {
    case "NullLiteral":
      return {
        type: "Literal",
        value: null,
      };
    case "NumberLiteral":
      return {
        type: "Literal",
        value: literal.value.value,
      };
    case "StringLiteral":
      return {
        type: "Literal",
        value: literal.value.value,
      };
  }
}
