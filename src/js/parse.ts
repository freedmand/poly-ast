/**
 * Parse code from string -> ESTree -> AST
 */

import * as ast from "../core/ast";
import { parseScript, ESTree } from "meriyah";
import { assert, assertNotNull, NotSupported } from "../core/util";

function isIdentifier(
  declarator: ESTree.VariableDeclarator["id"]
): declarator is ESTree.Identifier {
  return declarator.type == "Identifier";
}

export function parse(code: string, stripWhitespace = false): ESTree.Program {
  const parseResult: ESTree.Program = parseScript(code, {
    ranges: false,
    loc: false,
    globalReturn: true,
    preserveParens: false,
    jsx: true,
    module: true,
  });
  if (stripWhitespace) {
    return stripWhitespaceLiterals(parseResult);
  }
  return parseResult;
}

export function programToAst(program: ESTree.Program): ast.Program {
  return {
    type: "BlockStatement",
    body: program.body.map((statement) => statementToAst(statement)),
  };
}

export function parseToAst(code: string, stripWhitespace = false): ast.Program {
  return programToAst(parse(code, stripWhitespace));
}

export function parseStatement(code: string): ast.Statement {
  // Extracts a single statement from code containing a statement
  const program = parseToAst(code, true);
  if (program.body.length != 1) {
    throw new Error("Expected a single statement");
  }
  return program.body[0];
}

export function statementToAst(statement: ESTree.Statement): ast.Statement {
  switch (statement.type) {
    case "BlockStatement":
      return {
        type: "BlockStatement",
        body: statement.body.map((subStatement) =>
          statementToAst(subStatement)
        ),
      };
    case "VariableDeclaration":
      if (statement.kind != "let") {
        throw new NotSupported(
          `Only let declarations are supported, not ${statement.kind}`
        );
      }
      const declarations = statement.declarations;
      assert(
        declarations.length == 1,
        new NotSupported("Only 1 variable can be declared at once")
      );
      const declarator = declarations[0];
      if (!isIdentifier(declarator.id)) {
        throw new NotSupported("Variable declarators must be identifiers");
      }
      const name = declarator.id.name;
      const expression =
        declarator.init == null ? null : expressionToAst(declarator.init);
      return { type: "DeclareStatement", name, value: expression };
    case "ReturnStatement":
      if (statement.argument == null) {
        // Null return value
        return {
          type: "ReturnStatement",
          value: null,
        };
      }
      return {
        type: "ReturnStatement",
        value: expressionToAst(statement.argument),
      };
    case "ExpressionStatement":
      return {
        type: "ExpressionStatement",
        value: expressionToAst(statement.expression),
      };
  }
  throw new NotSupported(`Unsupported statement: ${statement.type}`);
}

export function expressionToAst(expression: ESTree.Expression): ast.Expression {
  switch (expression.type) {
    case "Literal":
      return {
        type: "Literal",
        value: literalToAst(expression.value),
      };
    case "Identifier":
      return {
        type: "Identifier",
        name: expression.name,
      };
    case "BinaryExpression":
      return binaryExpressionToAst(expression);
    case "AssignmentExpression":
      return assignmentExpressionToAst(expression);
    case "ArrayExpression":
      return {
        type: "List",
        value: expression.elements.map((element) => {
          if (element == null) {
            throw new NotSupported("Empty array elements not yet supported");
          }
          return expressionToAst(element);
        }),
      };
    case "JSXElement":
      const openingElementName = expression.openingElement.name;
      if (openingElementName.type != "JSXIdentifier") {
        throw new NotSupported(
          "Only simple identifiers are supported as tag names"
        );
      }
      const attributes: ast.Attribute[] = [];
      for (const attribute of expression.openingElement.attributes) {
        attributes.push(JSXAttributeToAst(attribute));
      }
      const children: ast.Expression[] = [];
      for (const child of expression.children) {
        const transformedChild = JSXChildToAst(child);
        if (transformedChild == null) {
          // Skip empty children
          continue;
        }
        children.push(transformedChild);
      }
      return {
        type: "Element",
        tag: openingElementName.name,
        attributes,
        children,
      };
    case "ArrowFunctionExpression":
      if (expression.async) {
        throw new NotSupported("Async arrow functions not yet supported");
      }
      return {
        type: "Func",
        params: expression.params.map((identifier) =>
          extractIdentifierName(identifier)
        ),
        body: functionBodyToAst(expression.body),
      };
    case "CallExpression":
      const callee = expression.callee as ESTree.Expression; // ESTree.CallExpression.callee is typed as any in meriyah
      if (callee.type == "Identifier" && callee.name == "reactive") {
        assert(
          expression.arguments.length == 1,
          new NotSupported("Reactives can only be applied to one expression")
        );
        // Return a reactive expression
        return {
          type: "Reactive",
          value: expressionToAst(expression.arguments[0]),
        };
      }

      return {
        type: "Call",
        func: expressionToAst(callee),
        arguments: expression.arguments.map((subExpression) =>
          expressionToAst(subExpression)
        ),
      };
  }
  throw new NotSupported(`Unsupported expression: ${expression.type}`);
}

export function extractIdentifierName(
  expression: ESTree.Expression | ESTree.Parameter
): string {
  if (expression.type == "Identifier") {
    return expression.name;
  }
  throw new NotSupported(`Expected identifier, got ${expression.type}`);
}

export function functionBodyToAst(
  body: ESTree.Expression | ESTree.BlockStatement
): ast.BlockStatement {
  if (body.type == "BlockStatement") {
    return {
      type: "BlockStatement",
      body: body.body.map((statement) => statementToAst(statement)),
    };
  }
  return {
    type: "BlockStatement",
    body: [{ type: "ReturnStatement", value: expressionToAst(body) }],
  };
}

export function literalToAst(
  expression: ESTree.Literal["value"]
): ast.Literal["value"] {
  if (expression == null)
    return {
      type: "NullLiteral",
    };
  switch (typeof expression) {
    case "string":
      return {
        type: "StringLiteral",
        value: expression,
      };
    case "number":
      return {
        type: "NumberLiteral",
        value: expression,
      };
  }
  throw new NotSupported(
    `Unsupported literal ${expression} (${typeof expression})`
  );
}

export function binaryExpressionToAst(
  expression: ESTree.BinaryExpression
): ast.Expression {
  switch (expression.operator) {
    case "+":
      return {
        type: "Plus",
        left: expressionToAst(expression.left),
        right: expressionToAst(expression.right),
      };
  }
  throw new NotSupported(
    `Unsupported binary expression (${expression.operator})`
  );
}

export function assignmentExpressionToAst(
  expression: ESTree.AssignmentExpression
): ast.Expression {
  switch (expression.operator) {
    case "=":
      return {
        type: "Assign",
        left: expressionToAst(expression.left),
        right: expressionToAst(expression.right),
      };
  }
  throw new NotSupported(
    `Unsupported assignment expression (${expression.operator})`
  );
}

export function JSXChildToAst(child: ESTree.JSXChild): ast.Expression | null {
  switch (child.type) {
    case "JSXEmptyExpression":
      return null;
    case "JSXElement":
      return expressionToAst(child);
    case "JSXText":
      return {
        type: "Literal",
        value: {
          type: "StringLiteral",
          value: child.value,
        },
      };
    case "JSXExpressionContainer":
      if (child.expression.type == "JSXEmptyExpression") {
        // Empty expressions evaluate to null
        return null;
      }
      return expressionToAst(child.expression);
    case "JSXFragment":
      throw new NotSupported("JSX fragments not yet supported");
    case "JSXSpreadChild":
      throw new NotSupported("JSX spread children not yet supported");
  }
}

export function JSXAttributeToAst(
  attribute: ESTree.JSXAttribute | ESTree.JSXSpreadAttribute
): ast.Attribute {
  switch (attribute.type) {
    case "JSXSpreadAttribute":
      throw new NotSupported("JSXSpreadAttribute not yet supported");
    case "JSXAttribute":
      switch (attribute.name.type) {
        case "JSXIdentifier":
          return {
            type: "NormalAttribute",
            key: attribute.name.name,
            value: JSXAttributeValueToAst(attribute.value),
          };
        case "JSXNamespacedName":
          switch (attribute.name.namespace.type) {
            case "JSXMemberExpression":
              throw new NotSupported("JSXMemberExpression not supported");
            case "JSXIdentifier":
              switch (attribute.name.namespace.name) {
                case "on":
                  return {
                    type: "EventAttribute",
                    event: attribute.name.name.name,
                    eventHandler: assertNotNull(
                      JSXAttributeValueToAst(attribute.value),
                      new NotSupported("Event handler cannot be empty")
                    ),
                  };
                default:
                  throw new NotSupported(
                    `Attribute namespace ${attribute.name.namespace.name} not supported`
                  );
              }
          }
      }
  }
}

export function JSXAttributeValueToAst(
  value: ESTree.JSXAttributeValue
): ast.Expression | null {
  if (value == null) return null;
  switch (value.type) {
    case "JSXElement":
    case "Literal":
      return expressionToAst(value);
    case "JSXExpressionContainer":
    case "JSXFragment":
    case "JSXSpreadChild":
      return JSXChildToAst(value);
    case "JSXIdentifier":
      throw new Error("JSXIdentifier not supported");
  }
}

export function stripWhitespaceLiterals(
  program: ESTree.Program
): ESTree.Program {
  return assertNotNull(
    stripWhitespaceLiteralNode(program),
    new Error("Program should not be only whitespace")
  );
}

export function stripWhitespaceLiteralNode<T extends ESTree.Node>(
  node: T
): T | null {
  if (node.type == "JSXText" && node.value.includes("\n")) {
    const trimmed = node.value.trim();
    if (trimmed.length == 0) return null;
    return {
      ...node,
      value: trimmed,
    };
  }
  const output: T = { ...node };
  for (const key in node) {
    const value = node[key];
    if (Array.isArray(value)) {
      const newArray = [];
      for (const subnode of value) {
        const strippedNode = stripWhitespaceLiteralNode(subnode);
        if (strippedNode != null) newArray.push(strippedNode);
      }
      output[key] = newArray as any;
    } else if (value != null && typeof value == "object" && "type" in value) {
      output[key] = stripWhitespaceLiteralNode(value as any);
    }
  }
  return output;
}
