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

// A reusable program ast (specified as a closure
// since it gets modified in-place)
const insertTestProgram = () =>
  parseToAst(
    `
    let x = 1;
    let y = 2;
    let z = 3;
  `,
    true
  );

function extractDeclarations(program: ast.Program): ast.Name[] {
  // Extract the names of all the declarations in a program
  // in the order they occur
  const declarations: ast.Name[] = [];

  walk(program, {
    enter(walkObject) {
      if (
        walkObject.kind == "node" &&
        walkObject.value.type == "DeclareStatement"
      ) {
        declarations.push(walkObject.value.name);
      }
    },
  });

  return declarations;
}

function insertStatementBeforeDeclaration(
  program: ast.Program,
  name: ast.Name,
  statements: ast.Statement[]
): ast.Name[] {
  // Scans the source program until it finds a declaration statement with the specified name.
  // Then it will insert the statement before that declaration statement.
  // If no declaration statement is found or the same on is found twice, an error is thrown.
  // Returns all the declaration names encountered in order via the walk function.
  let found = false;
  const declarations: ast.Name[] = [];
  walk(program, {
    enter(walkObject) {
      if (
        walkObject.kind == "node" &&
        walkObject.value.type == "DeclareStatement" &&
        walkObject.value.name == name
      ) {
        if (found) {
          throw new Error(`${String(name)} found more than once`);
        }
        // Insert the statement
        walkObject.insertBefore(...statements);
        found = true;
      }
      // Insert the declaration
      if (
        walkObject.kind == "node" &&
        walkObject.value.type == "DeclareStatement"
      ) {
        declarations.push(walkObject.value.name);
      }
    },
  });
  if (!found) {
    throw new Error(`${String(name)} not found`);
  }
  return declarations;
}

function replaceDeclaration(
  program: ast.Program,
  name: ast.Name,
  statement: ast.Statement
): ast.Name[] {
  // Scans the source program until it finds a declaration statement with the specified name.
  // Then it will replace the declaration statement with the specified statement.
  // If no declaration statement is found or the same on is found twice, an error is thrown.
  // Returns all the declaration names encountered in order via the walk function.
  let found = false;
  const declarations: ast.Name[] = [];
  walk(program, {
    enter(walkObject) {
      if (
        walkObject.kind == "node" &&
        walkObject.value.type == "DeclareStatement" &&
        walkObject.value.name == name
      ) {
        if (found) {
          throw new Error(`${String(name)} found more than once`);
        }
        // Insert the statement
        walkObject.replace(statement);
        found = true;
      }
      // Insert the declaration
      if (
        walkObject.kind == "node" &&
        walkObject.value.type == "DeclareStatement"
      ) {
        declarations.push(walkObject.value.name);
      }
    },
  });
  if (!found) {
    throw new Error(`${String(name)} not found`);
  }
  return declarations;
}

function parseStatement(code: string): ast.Statement {
  // Extracts a single statement from code containing a statement
  const program = parseToAst(code, true);
  if (program.body.length != 1) {
    throw new Error("Expected a single statement");
  }
  return program.body[0];
}

test("insert before first statement", () => {
  const program = insertTestProgram();
  const declarations = insertStatementBeforeDeclaration(program, "x", [
    parseStatement("let a = 0;"),
  ]);
  expect(declarations).toEqual(["x", "y", "z"]);

  // Expect new declarations to have "a" inserted before "x"
  expect(extractDeclarations(program)).toEqual(["a", "x", "y", "z"]);

  expect(program).toEqual(
    parseToAst(
      `
        let a = 0;
        let x = 1;
        let y = 2;
        let z = 3;
      `,
      true
    )
  );
});

test("insert before second statement", () => {
  const program = insertTestProgram();
  const declarations = insertStatementBeforeDeclaration(program, "y", [
    parseStatement("let a = 0;"),
  ]);
  expect(declarations).toEqual(["x", "y", "z"]);

  // Expect new declarations to have "a" inserted before "y"
  expect(extractDeclarations(program)).toEqual(["x", "a", "y", "z"]);

  expect(program).toEqual(
    parseToAst(
      `
        let x = 1;
        let a = 0;
        let y = 2;
        let z = 3;
      `,
      true
    )
  );
});

test("insert before third statement", () => {
  const program = insertTestProgram();
  const declarations = insertStatementBeforeDeclaration(program, "z", [
    parseStatement("let a = 0;"),
  ]);
  expect(declarations).toEqual(["x", "y", "z"]);

  // Expect new declarations to have "a" inserted before "z"
  expect(extractDeclarations(program)).toEqual(["x", "y", "a", "z"]);

  expect(program).toEqual(
    parseToAst(
      `
        let x = 1;
        let y = 2;
        let a = 0;
        let z = 3;
      `,
      true
    )
  );
});

test("insert twice before first statement", () => {
  const program = insertTestProgram();
  const declarations = insertStatementBeforeDeclaration(program, "x", [
    parseStatement("let a = 0;"),
    parseStatement("let b = 0;"),
  ]);
  expect(declarations).toEqual(["x", "y", "z"]);

  // Expect new declarations to have "a" inserted before "z"
  expect(extractDeclarations(program)).toEqual(["a", "b", "x", "y", "z"]);

  expect(program).toEqual(
    parseToAst(
      `
        let a = 0;
        let b = 0;
        let x = 1;
        let y = 2;
        let z = 3;
      `,
      true
    )
  );
});

test("insert twice before last statement", () => {
  const program = insertTestProgram();
  const declarations = insertStatementBeforeDeclaration(program, "z", [
    parseStatement("let a = 0;"),
    parseStatement("let b = 0;"),
  ]);
  expect(declarations).toEqual(["x", "y", "z"]);

  // Expect new declarations to have "a" inserted before "z"
  expect(extractDeclarations(program)).toEqual(["x", "y", "a", "b", "z"]);

  expect(program).toEqual(
    parseToAst(
      `
        let x = 1;
        let y = 2;
        let a = 0;
        let b = 0;
        let z = 3;
      `,
      true
    )
  );
});

test("replace first statement", () => {
  const program = insertTestProgram();
  const declarations = replaceDeclaration(
    program,
    "x",
    parseStatement("let a = 0;")
  );
  expect(declarations).toEqual(["x", "y", "z"]);

  // Expect new declarations to have "x" replaced with "a"
  expect(extractDeclarations(program)).toEqual(["a", "y", "z"]);

  expect(program).toEqual(
    parseToAst(
      `
        let a = 0;
        let y = 2;
        let z = 3;
      `,
      true
    )
  );
});

test("replace last statement", () => {
  const program = insertTestProgram();
  const declarations = replaceDeclaration(
    program,
    "z",
    parseStatement("let a = 0;")
  );
  expect(declarations).toEqual(["x", "y", "z"]);

  // Expect new declarations to have "x" replaced with "a"
  expect(extractDeclarations(program)).toEqual(["x", "y", "a"]);

  expect(program).toEqual(
    parseToAst(
      `
        let x = 1;
        let y = 2;
        let a = 0;
      `,
      true
    )
  );
});

test("replace and insert complex 1", () => {
  const program = insertTestProgram();

  walk(program, {
    enter(walkObject) {
      if (
        walkObject.kind == "node" &&
        walkObject.value.type == "DeclareStatement"
      ) {
        // Insert and replace depending on variable
        if (walkObject.value.name == "x") {
          walkObject.insertBefore(
            parseStatement("let x1 = 0"),
            parseStatement("let x2 = 0")
          );
          walkObject.replace(parseStatement("let x3 = 0"));
        } else if (walkObject.value.name == "z") {
          walkObject.replace(parseStatement("let z3 = 0"));
          walkObject.insertBefore(
            parseStatement("let z1 = 0"),
            parseStatement("let z2 = 0")
          );
        }
      }
    },
  });

  // Expect new declarations to have many nodes inserted/replaced
  expect(extractDeclarations(program)).toEqual([
    "x1",
    "x2",
    "x3",
    "y",
    "z1",
    "z2",
    "z3",
  ]);

  expect(program).toEqual(
    parseToAst(
      `
        let x1 = 0;
        let x2 = 0;
        let x3 = 0;
        let y = 2;
        let z1 = 0;
        let z2 = 0;
        let z3 = 0;
      `,
      true
    )
  );
});

test("replace and insert complex 2", () => {
  const program = insertTestProgram();

  walk(program, {
    enter(walkObject) {
      if (
        walkObject.kind == "node" &&
        walkObject.value.type == "DeclareStatement"
      ) {
        // Insert and replace depending on variable
        if (walkObject.value.name == "x") {
          walkObject.insertBefore(parseStatement("let x1 = 0"));
          walkObject.replace(parseStatement("let x2 = 0"));
        } else if (walkObject.value.name == "y") {
          walkObject.replace(parseStatement("let y1 = 0"));
        } else if (walkObject.value.name == "z") {
          walkObject.insertBefore(parseStatement("let zPre = 0"));
        }
      }
    },
  });

  // Expect new declarations to have many nodes inserted/replaced
  expect(extractDeclarations(program)).toEqual(["x1", "x2", "y1", "zPre", "z"]);

  expect(program).toEqual(
    parseToAst(
      `
        let x1 = 0;
        let x2 = 0;
        let y1 = 0;
        let zPre = 0;
        let z = 3;
      `,
      true
    )
  );
});
