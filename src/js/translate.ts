/**
 * Translate code from AST -> ESTree -> string
 */

import * as ast from "../core/ast";
import { ESTree } from "meriyah";
import { generate, baseGenerator } from "astring";
import { JsxGenerator } from "astring-jsx";
import prettier from "prettier";

const extendedGenerator = { ...JsxGenerator, ...baseGenerator };

export function ESTreeToSource(program: ESTree.Program): string {
  return prettier.format(
    generate(program, {
      generator: extendedGenerator,
    }),
    { parser: "meriyah" }
  );
}

export function programToESTree(program: ast.Program): ESTree.Program {
  return {
    type: "Program",
    sourceType: "module",
    body: program.body.map((statement) => statementToESTree(statement)),
  };
}

export function programToSource(program: ast.Program): string {
  return ESTreeToSource(programToESTree(program));
}

export function statementToESTree(statement: ast.Statement): ESTree.Statement {
  switch (statement.type) {
    case "BlockStatement":
      return {
        type: "BlockStatement",
        body: statement.body.map((subStatement) =>
          statementToESTree(subStatement)
        ),
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
            init: expressionToESTree(statement.value),
          },
        ],
      };
    case "ReturnStatement":
      return {
        type: "ReturnStatement",
        argument:
          statement.value == null ? null : expressionToESTree(statement.value),
      };
    case "ExpressionStatement":
      return {
        type: "ExpressionStatement",
        expression: expressionToESTree(statement.value),
      };
  }
}

export function expressionToESTree(
  expression: ast.Expression
): ESTree.Expression {
  switch (expression.type) {
    case "Literal":
      return {
        type: "Literal",
        value: literalToValue(expression.value),
      };
    case "Identifier":
      return {
        type: "Identifier",
        name: expression.name,
      };
    case "Plus":
      return {
        type: "BinaryExpression",
        operator: operatorFromBinaryExpression(expression),
        left: expressionToESTree(expression.left),
        right: expressionToESTree(expression.right),
      };
    case "Assign":
      return {
        type: "AssignmentExpression",
        operator: "=",
        left: expressionToESTree(expression.left),
        right: expressionToESTree(expression.right),
      };
    case "Reactive":
      return {
        type: "CallExpression",
        callee: {
          type: "Identifier",
          name: "reactive",
        },
        arguments: [expressionToESTree(expression.value)],
      };
    case "List":
      return {
        type: "ArrayExpression",
        elements: expression.value.map((subExpression) =>
          expressionToESTree(subExpression)
        ),
      };
    case "Element":
      return elementToJSXElement(expression);
    case "Func":
      return {
        type: "ArrowFunctionExpression",
        async: false,
        expression: false,
        params: expression.params.map((param) => ({
          type: "Identifier",
          name: param,
        })),
        body: functionBodyToESTree(expression.body),
      };
    case "Call":
      return {
        type: "CallExpression",
        callee: expressionToESTree(expression.func),
        arguments: expression.arguments.map((subExpression) =>
          expressionToESTree(subExpression)
        ),
      };
  }
}

export function functionBodyToESTree(
  body: ast.Statement
): ESTree.Expression | ESTree.BlockStatement {
  if (body.type == "ReturnStatement" && body.value != null) {
    return expressionToESTree(body.value);
  }
  if (body.type == "BlockStatement") {
    return {
      type: "BlockStatement",
      body: body.body.map((statement) => statementToESTree(statement)),
    };
  }
  return {
    type: "BlockStatement",
    body: [statementToESTree(body)],
  };
}

export function literalToValue(
  literal: ast.Literal["value"]
): number | string | null {
  switch (literal.type) {
    case "NullLiteral":
      return null;
    case "NumberLiteral":
      return literal.value;
    case "StringLiteral":
      return literal.value;
  }
}

export function operatorFromBinaryExpression(expression: ast.Plus): string {
  switch (expression.type) {
    case "Plus":
      return "+";
  }
}

export function elementToJSXElement(element: ast.Element): ESTree.JSXElement {
  const children: ESTree.JSXChild[] = [];
  for (const child of element.children) {
    const transformedChild = expressionToJSXChild(child);
    if (transformedChild != null) {
      children.push(transformedChild);
    }
  }
  const attributes: ESTree.JSXAttribute[] = [];
  for (const attribute of element.attributes) {
    attributes.push(attributeToJSXAttribute(attribute));
  }
  const hasEndTag = children.length > 0;
  return {
    type: "JSXElement",
    openingElement: {
      type: "JSXOpeningElement",
      attributes,
      name: {
        type: "JSXIdentifier",
        name: element.tag,
      },
      selfClosing: !hasEndTag,
    },
    children,
    closingElement: hasEndTag
      ? {
          type: "JSXClosingElement",
          name: {
            type: "JSXIdentifier",
            name: element.tag,
          },
        }
      : null,
  };
}

export function attributeToJSXAttribute(
  attribute: ast.Attribute
): ESTree.JSXAttribute {
  switch (attribute.type) {
    case "NormalAttribute":
      return {
        type: "JSXAttribute",
        name: {
          type: "JSXIdentifier",
          name: attribute.key,
        },
        value: attributeValueToJSXAttributeValue(attribute.value),
      };
    case "EventAttribute":
      return {
        type: "JSXAttribute",
        name: {
          type: "JSXNamespacedName",
          namespace: {
            type: "JSXIdentifier",
            name: "on",
          },
          name: {
            type: "JSXIdentifier",
            name: attribute.event,
          },
        },
        value: attributeValueToJSXAttributeValue(attribute.eventHandler),
      };
  }
}

export function attributeValueToJSXAttributeValue(
  attributeValue: ast.Expression | null
): ESTree.JSXAttributeValue {
  if (attributeValue == null) return null;
  switch (attributeValue.type) {
    case "Literal":
    case "Element":
      return expressionToESTree(attributeValue) as
        | ESTree.Literal
        | ESTree.JSXElement;
  }
  return {
    type: "JSXExpressionContainer",
    expression: expressionToESTree(attributeValue),
  };
}

export function expressionToJSXChild(
  expression: ast.Expression
): ESTree.JSXChild | null {
  switch (expression.type) {
    case "Element":
      return elementToJSXElement(expression);
    case "Literal":
      switch (expression.value.type) {
        case "NullLiteral":
          return null;
        case "StringLiteral":
          return {
            type: "JSXText",
            value: expression.value.value,
          };
      }
  }
  return {
    type: "JSXExpressionContainer",
    expression: expressionToESTree(expression),
  };
}
