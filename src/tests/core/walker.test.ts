import {
  BaseWalkNode,
  RemoveError,
  walk,
  Walker,
  WalkNode,
  WalkObject,
} from "../../core/walker";
import { parseStatement, parseToAst } from "../../js/parse";
import * as ast from "../../core/ast";
import counterSource from "./counter.source.js";
import { programToSource } from "../../js/translate";

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

function expectProgramToEqualSource(program: ast.Program, source: string) {
  try {
    expect(program).toEqual(parseToAst(source));
  } catch (e) {
    console.warn(`Program:\n--------\n${programToSource(program)}`);
    throw e;
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

function isWalkNode(walkObject: WalkObject): walkObject is WalkNode {
  return walkObject.kind == "node";
}

function isDeclareWalkNode(
  walkObject: WalkObject
): walkObject is BaseWalkNode<ast.DeclareStatement> {
  return (
    walkObject.kind == "node" && walkObject.value.type == "DeclareStatement"
  );
}

function isTypeWalkNode<T extends ast.Node>(
  walkObject: WalkObject,
  type: T["type"]
): walkObject is BaseWalkNode<T> {
  return walkObject.kind == "node" && walkObject.value.type == type;
}

function getAncestorOfType<T extends ast.Node>(
  walkNode: WalkNode,
  type: T["type"]
): BaseWalkNode<T> {
  if (isTypeWalkNode(walkNode, type)) {
    return walkNode;
  }
  if (walkNode.parent == null) {
    throw new Error("Ancestor not found");
  }
  return getAncestorOfType<T>(walkNode.parent, type);
}

function extractDeclaration(walkObject: WalkObject): ast.Name | null {
  if (isWalkNode(walkObject) && walkObject.value.type == "DeclareStatement") {
    return walkObject.value.name;
  }
  return null;
}

function walkDeclarations(
  program: ast.Program,
  walker: Walker<BaseWalkNode<ast.DeclareStatement>>
) {
  const startDeclarations: ast.Name[] = [];
  const endDeclarations: ast.Name[] = [];
  walk(program, {
    enter(walkObject) {
      const declaration = extractDeclaration(walkObject);
      if (isDeclareWalkNode(walkObject) && declaration != null) {
        startDeclarations.push(declaration);
        if (walker.enter != null) {
          walker.enter(walkObject);
        }
      }
    },
    leave(walkObject) {
      const declaration = extractDeclaration(walkObject);
      if (isDeclareWalkNode(walkObject) && declaration != null) {
        endDeclarations.push(declaration);
        if (walker.leave != null) {
          walker.leave(walkObject);
        }
      }
    },
  });
  return { startDeclarations, endDeclarations };
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
const rawTestProgram = `
  let x = 1;
  let y = 2;
  let z = 3;
`;
const insertTestProgram = () => parseToAst(rawTestProgram, true);

function extractDeclarations(program: ast.Program): ast.Name[] {
  // Extract the names of all the declarations in a program
  // in the order they occur
  const declarations: ast.Name[] = [];

  walk(program, {
    enter(walkObject) {
      const declaration = extractDeclaration(walkObject);
      if (declaration != null) {
        declarations.push(declaration);
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
  const startDeclarations: ast.Name[] = [];
  const endDeclarations: ast.Name[] = [];
  walk(program, {
    enter(walkObject) {
      const declaration = extractDeclaration(walkObject);
      if (isWalkNode(walkObject) && declaration == name) {
        if (found) {
          throw new Error(`${String(name)} found more than once`);
        }
        // Insert the statement
        walkObject.insertBefore(...statements);
        found = true;
      }
      // Insert the declaration
      if (isWalkNode(walkObject) && declaration != null) {
        startDeclarations.push(declaration);
      }
    },
    leave(walkObject) {
      // Insert the declaration
      const declaration = extractDeclaration(walkObject);
      if (declaration != null) {
        endDeclarations.push(declaration);
      }
    },
  });
  if (!found) {
    throw new Error(`${String(name)} not found`);
  }
  // Expect the declarations to match up
  expect(startDeclarations).toEqual(endDeclarations);
  return startDeclarations;
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
      const declaration = extractDeclaration(walkObject);
      if (isWalkNode(walkObject) && declaration == name) {
        if (found) {
          throw new Error(`${String(name)} found more than once`);
        }
        // Insert the statement
        walkObject.replace(statement);
        found = true;
      }
      // Insert the declaration
      if (declaration != null) {
        declarations.push(declaration);
      }
    },
  });
  if (!found) {
    throw new Error(`${String(name)} not found`);
  }
  return declarations;
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
      const declaration = extractDeclaration(walkObject);
      if (isWalkNode(walkObject) && declaration != null) {
        // Insert and replace depending on variable
        if (declaration == "x") {
          walkObject.insertBefore(
            parseStatement("let x1 = 0"),
            parseStatement("let x2 = 0")
          );
          walkObject.replace(parseStatement("let x3 = 0"));
        } else if (declaration == "z") {
          walkObject.replace(parseStatement("let z3 = 0"));
          walkObject.insertBefore(
            parseStatement("let z1 = 0"),
            parseStatement("let z2 = 0")
          );
        } else if (declaration != "y") {
          throw new Error(`Unexpected walk object ${String(declaration)}`);
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
      const declaration = extractDeclaration(walkObject);
      if (isWalkNode(walkObject) && declaration != null) {
        // Insert and replace depending on variable
        if (declaration == "x") {
          walkObject.insertBefore(parseStatement("let x1 = 0"));
          walkObject.replace(parseStatement("let x2 = 0"));
          walkObject.insertAfter(parseStatement("let x3 = 0"));
        } else if (declaration == "y") {
          walkObject.replace(parseStatement("let y1 = 0"));
          walkObject.insertAfter(parseStatement("let y2 = 0"));
        } else if (declaration == "z") {
          walkObject.insertBefore(parseStatement("let zPre = 0"));
        } else {
          throw new Error(`Unexpected walk object ${String(declaration)}`);
        }
      }
    },
  });

  // Expect new declarations to have many nodes inserted/replaced
  expect(extractDeclarations(program)).toEqual([
    "x1",
    "x2",
    "x3",
    "y1",
    "y2",
    "zPre",
    "z",
  ]);

  expect(program).toEqual(
    parseToAst(
      `
        let x1 = 0;
        let x2 = 0;
        let x3 = 0;
        let y1 = 0;
        let y2 = 0;
        let zPre = 0;
        let z = 3;
      `,
      true
    )
  );
});

test("replace and insert complex 3", () => {
  const program = insertTestProgram();

  walk(program, {
    enter(walkObject) {
      const declaration = extractDeclaration(walkObject);
      if (isWalkNode(walkObject) && declaration != null) {
        // Insert and replace depending on variable
        if (declaration == "x") {
          walkObject.remove();
        } else if (declaration == "y") {
          walkObject.remove();
        } else if (declaration == "z") {
          walkObject.insertBefore(parseStatement("let zPre = 0"));
        } else {
          throw new Error(`Unexpected walk object ${String(declaration)}`);
        }
      }
    },
  });

  // Expect new declarations to have many nodes inserted/replaced
  expect(extractDeclarations(program)).toEqual(["zPre", "z"]);

  expect(program).toEqual(
    parseToAst(
      `
        let zPre = 0;
        let z = 3;
      `,
      true
    )
  );
});

test("replace and insert complex 4", () => {
  const program = insertTestProgram();

  walk(program, {
    enter(walkObject) {
      const declaration = extractDeclaration(walkObject);
      if (isWalkNode(walkObject) && declaration != null) {
        // Insert and replace depending on variable
        if (declaration == "x") {
          walkObject.remove();
        } else if (declaration == "y") {
          walkObject.remove();
        } else if (declaration == "z") {
          walkObject.insertBefore(parseStatement("let zPre = 0"));
        } else {
          throw new Error(`Unexpected walk object ${String(declaration)}`);
        }
      }
    },
  });

  // Expect new declarations to have many nodes inserted/replaced
  expect(extractDeclarations(program)).toEqual(["zPre", "z"]);

  expect(program).toEqual(
    parseToAst(
      `
        let zPre = 0;
        let z = 3;
      `,
      true
    )
  );
});

test("replace and insert complex 5", () => {
  const program = insertTestProgram();

  walk(program, {
    enter(walkObject) {
      const declaration = extractDeclaration(walkObject);
      if (isWalkNode(walkObject) && declaration != null) {
        // Insert and replace depending on variable
        if (declaration == "x") {
          walkObject.remove();
          walkObject.insertBefore(
            parseStatement("let x1 = 0"),
            parseStatement("let x2 = 0")
          );
        } else if (declaration == "y") {
          walkObject.insertBefore(
            parseStatement("let y1 = 0"),
            parseStatement("let y2 = 0")
          );
          walkObject.replace(parseStatement("let y3 = 0"));
          walkObject.insertAfter(parseStatement("let y4 = 0"));
        } else if (declaration == "z") {
          walkObject.insertBefore(
            parseStatement("let z1 = 0"),
            parseStatement("let z2 = 0")
          );
          walkObject.remove();
        } else {
          throw new Error(`Unexpected walk object ${String(declaration)}`);
        }
      }
    },
  });

  // Expect new declarations to have many nodes inserted/replaced
  expect(extractDeclarations(program)).toEqual([
    "x1",
    "x2",
    "y1",
    "y2",
    "y3",
    "y4",
    "z1",
    "z2",
  ]);

  expect(program).toEqual(
    parseToAst(
      `
        let x1 = 0;
        let x2 = 0;
        let y1 = 0;
        let y2 = 0;
        let y3 = 0;
        let y4 = 0;
        let z1 = 0;
        let z2 = 0;
      `,
      true
    )
  );
});

test("replace and insert complex 6", () => {
  const program = insertTestProgram();

  walk(program, {
    enter(walkObject) {
      const declaration = extractDeclaration(walkObject);
      if (isWalkNode(walkObject) && declaration != null) {
        // Insert and replace depending on variable
        if (declaration == "x") {
          walkObject.remove();
          walkObject.insertAfter(
            parseStatement("let x1 = 0"),
            parseStatement("let x2 = 0")
          );
        } else if (declaration == "y") {
          walkObject.insertAfter(
            parseStatement("let y4 = 0"),
            parseStatement("let y5 = 0")
          );
          walkObject.insertAfter(parseStatement("let y6 = 0"));
          walkObject.replace(parseStatement("let y3 = 0"));
          walkObject.insertBefore(
            parseStatement("let y1 = 0"),
            parseStatement("let y2 = 0")
          );
        } else if (declaration == "z") {
          walkObject.insertBefore(parseStatement("let z1 = 0"));
          walkObject.insertBefore(parseStatement("let z2 = 0"));
          walkObject.remove();
          walkObject.insertAfter(parseStatement("let z3 = 0"));
        } else {
          throw new Error(`Unexpected walk object ${String(declaration)}`);
        }
      }
    },
  });

  // Expect new declarations to have many nodes inserted/replaced
  expect(extractDeclarations(program)).toEqual([
    "x1",
    "x2",
    "y1",
    "y2",
    "y3",
    "y4",
    "y5",
    "y6",
    "z1",
    "z2",
    "z3",
  ]);

  expect(program).toEqual(
    parseToAst(
      `
        let x1 = 0;
        let x2 = 0;
        let y1 = 0;
        let y2 = 0;
        let y3 = 0;
        let y4 = 0;
        let y5 = 0;
        let y6 = 0;
        let z1 = 0;
        let z2 = 0;
        let z3 = 0;
      `,
      true
    )
  );
});

test("multiple insert before", () => {
  const program = insertTestProgram();

  walk(program, {
    enter(walkObject) {
      const declaration = extractDeclaration(walkObject);
      if (isWalkNode(walkObject) && declaration != null) {
        if (declaration == "x") {
          walkObject.insertBefore(parseStatement("let a = 0"));
          walkObject.insertBefore(
            parseStatement("let b = 0"),
            parseStatement("let c = 0")
          );
          walkObject.insertBefore(parseStatement("let d = 0"));
        } else if (declaration != "y" && declaration != "z") {
          throw new Error(`Unexpected walk object ${String(declaration)}`);
        }
      }
    },
  });

  expect(program).toEqual(
    parseToAst(
      `
        let a = 0;
        let b = 0;
        let c = 0;
        let d = 0;
        ${rawTestProgram}
      `,
      true
    )
  );
});

test("multiple insert after", () => {
  const program = insertTestProgram();

  walk(program, {
    enter(walkObject) {
      const declaration = extractDeclaration(walkObject);
      if (isWalkNode(walkObject) && declaration != null) {
        if (declaration == "z") {
          walkObject.insertAfter(parseStatement("let a = 0"));
          walkObject.insertAfter(
            parseStatement("let b = 0"),
            parseStatement("let c = 0")
          );
          walkObject.insertAfter(parseStatement("let d = 0"));
        } else if (declaration != "x" && declaration != "y") {
          throw new Error(`Unexpected walk object ${String(declaration)}`);
        }
      }
    },
  });

  expect(program).toEqual(
    parseToAst(
      `
        ${rawTestProgram}
        let a = 0;
        let b = 0;
        let c = 0;
        let d = 0;
      `,
      true
    )
  );
});

test("multiple replace", () => {
  const program = insertTestProgram();

  walk(program, {
    enter(walkObject) {
      const declaration = extractDeclaration(walkObject);
      if (isWalkNode(walkObject) && declaration != null) {
        if (declaration == "z") {
          walkObject.replace(parseStatement("let a = 0"));
          walkObject.replace(parseStatement("let b = 0"));
          walkObject.replace(parseStatement("let c = 0"));
        } else if (declaration != "x" && declaration != "y") {
          throw new Error(`Unexpected walk object ${String(declaration)}`);
        }
      }
    },
  });

  expect(program).toEqual(
    parseToAst(
      `
        let x = 1;
        let y = 2;
        let c = 0;
      `,
      true
    )
  );
});

test("multiple remove", () => {
  const program = insertTestProgram();

  expect(() =>
    walk(program, {
      enter(walkObject) {
        const declaration = extractDeclaration(walkObject);
        if (isWalkNode(walkObject) && declaration != null) {
          if (declaration == "y") {
            walkObject.remove();
            walkObject.remove();
            walkObject.remove();
          } else if (declaration != "x" && declaration != "z") {
            throw new Error(`Unexpected walk object ${String(declaration)}`);
          }
        }
      },
    })
  ).toThrowError(RemoveError);
});

test("nested traversal skip", () => {
  const program = parseToAst(`
    let a = 0;
    let b = () => {
      let c = 0;
    }
    let d = 0;
  `);

  const { startDeclarations, endDeclarations } = walkDeclarations(program, {});

  expect(startDeclarations).toEqual(["a", "b", "c", "d"]);
  expect(endDeclarations).toEqual(["a", "c", "b", "d"]);
});

test("nested traversal skip", () => {
  const program = parseToAst(`
    let a = 0;
    let b = () => {
      let c = 0;
    }
    let d = 0;
  `);

  const { startDeclarations, endDeclarations } = walkDeclarations(program, {
    enter(declareNode) {
      if (declareNode.value.name == "b") {
        declareNode.skip();
      }
    },
  });

  expect(startDeclarations).toEqual(["a", "b", "d"]);
  expect(endDeclarations).toEqual(["a", "d"]);
});

test("nested traversal skip via remove", () => {
  const program = parseToAst(`
    let a = 0;
    let b = () => {
      let c = 0;
    }
    let d = 0;
  `);

  const { startDeclarations, endDeclarations } = walkDeclarations(program, {
    enter(declareNode) {
      if (declareNode.value.name == "b") {
        declareNode.remove();
      }
    },
  });

  expect(startDeclarations).toEqual(["a", "b", "d"]);
  expect(endDeclarations).toEqual(["a", "d"]);
});

test("reactive insertion", () => {
  const program = parseToAst(`
    let a = 0;
    let b = a + 1;
    a = 1;
  `);

  walk(program, {
    enter(walkObject) {
      if (
        walkObject.kind == "node" &&
        walkObject.value.type == "DeclareStatement" &&
        walkObject.value.name == "b"
      ) {
        // We're at this statement: let b = a + 1
        // Let's replace with a setter
        walkObject.insertBefore(parseStatement(`let b;`));
        walkObject.insertBefore(
          parseStatement(`let setB = () => {
          b = a + 1;
        }`)
        );
        walkObject.replace(parseStatement("setB()"));
      }
      if (
        walkObject.kind == "node" &&
        walkObject.value.type == "ExpressionStatement" &&
        walkObject.value.value.type == "Assign" &&
        walkObject.value.value.left.type == "Identifier" &&
        walkObject.value.value.left.name == "a"
      ) {
        // We're at this statement: a = 1
        // Let's add the setter afterwards
        walkObject.insertAfter(parseStatement("setB()"));
      }
    },
  });

  expect(program).toEqual(
    parseToAst(`
    let a = 0;
    let b;
    let setB = () => {
      b = a + 1;
    };
    setB();
    a = 1;
    setB();
  `)
  );
});

test("reactive insertion complex", () => {
  const program = parseToAst(`
    let x = 1;
    let getXPlus = () => {
      let a = reactive(x) + 1;
      return a;
    };
    let y = getXPlus();
    x = 2;
  `);

  walk(program, {
    enter(walkObject) {
      if (walkObject.kind == "node" && walkObject.value.type == "Reactive") {
        // Take the reactive `a` assignment and add a setter above,
        // wrap a function to assign it, call that function.
        const declareNode = getAncestorOfType<ast.DeclareStatement>(
          walkObject,
          "DeclareStatement"
        );
        declareNode.insertBefore(parseStatement("let a;"));
        declareNode.replace(
          parseStatement(`let setA = () => {
            a = x + 1;
          }`)
        );
        declareNode.insertAfter(parseStatement("setA();"));
      }
    },
    leave(walkObject) {
      if (
        isTypeWalkNode<ast.DeclareStatement>(walkObject, "DeclareStatement") &&
        walkObject.value.name == "getXPlus"
      ) {
        // As we leave `getXPlus`, make it reactive by setting
        // `y` above, wrapping a function to assign it, and adding
        // a setter call below
        walkObject.insertBefore(parseStatement("let y;"));
        walkObject.replace({
          type: "DeclareStatement",
          name: "setY",
          value: {
            type: "Func",
            params: [],
            body: {
              type: "BlockStatement",
              body: [walkObject.value, parseStatement("y = getXPlus();")],
            },
          },
        });
        walkObject.insertAfter(parseStatement("setY()"));
      }
      if (isDeclareWalkNode(walkObject) && walkObject.value.name == "y") {
        // Remove the set y upon leaving it
        walkObject.remove();
      }
      if (
        isTypeWalkNode<ast.ExpressionStatement>(
          walkObject,
          "ExpressionStatement"
        ) &&
        walkObject.value.value.type == "Assign" &&
        walkObject.value.value.left.type == "Identifier" &&
        walkObject.value.value.left.name == "x"
      ) {
        // Finally, add another `setY` after you change the value of `x`
        walkObject.insertAfter(parseStatement("setY()"));
      }
    },
  });

  expect(program).toEqual(
    parseToAst(`
    let x = 1;
    let y;
    let setY = () => {
      let getXPlus = () => {
        let a;
        let setA = () => {
          a = x + 1;
        }
        setA();
        return a;
      };
      y = getXPlus();
    };
    setY();
    x = 2;
    setY();
  `)
  );
});

test("insert before out of order", () => {
  const program = parseToAst(`
    let x = 0;
    let y = 0;
    let z = 0;
  `);

  let xDeclaration: WalkNode;

  const { startDeclarations, endDeclarations } = walkDeclarations(program, {
    enter(declarationNode) {
      if (declarationNode.value.name == "x") {
        xDeclaration = declarationNode;
      } else if (declarationNode.value.name == "y") {
        xDeclaration.insertBefore(parseStatement("let w = 0"));
      }
    },
  });
  expect(startDeclarations).toEqual(endDeclarations);
  expect(startDeclarations).toEqual(["x", "y", "z"]);
  expect(program).toEqual(
    parseToAst(`
    let w = 0;
    let x = 0;
    let y = 0;
    let z = 0;
  `)
  );
});

test("insert after out of order", () => {
  const program = parseToAst(`
    let x = 0;
    let y = 0;
    let z = 0;
  `);

  let xDeclaration: WalkNode;

  const { startDeclarations, endDeclarations } = walkDeclarations(program, {
    enter(declarationNode) {
      if (declarationNode.value.name == "x") {
        xDeclaration = declarationNode;
      } else if (declarationNode.value.name == "y") {
        xDeclaration.insertAfter(parseStatement("let w = 0"));
      }
    },
  });
  expect(startDeclarations).toEqual(endDeclarations);
  expect(startDeclarations).toEqual(["x", "y", "z"]);
  expectProgramToEqualSource(
    program,
    `
      let x = 0;
      let w = 0;
      let y = 0;
      let z = 0;
    `
  );
});

test("multiple insert before out of order", () => {
  const program = parseToAst(`
    let x = 0;
    let y = 0;
    let z = 0;
  `);

  let xDeclaration: WalkNode;

  const { startDeclarations, endDeclarations } = walkDeclarations(program, {
    enter(declarationNode) {
      if (declarationNode.value.name == "x") {
        xDeclaration = declarationNode;
      } else if (declarationNode.value.name == "y") {
        xDeclaration.insertBefore(parseStatement("let v = 0"));
        xDeclaration.insertBefore(parseStatement("let w = 0"));
      }
    },
  });
  expect(startDeclarations).toEqual(endDeclarations);
  expect(startDeclarations).toEqual(["x", "y", "z"]);
  expect(program).toEqual(
    parseToAst(`
    let v = 0;
    let w = 0;
    let x = 0;
    let y = 0;
    let z = 0;
  `)
  );
});

test("multiple insert after out of order", () => {
  const program = parseToAst(`
    let x = 0;
    let y = 0;
    let z = 0;
  `);

  let xDeclaration: WalkNode;

  const { startDeclarations, endDeclarations } = walkDeclarations(program, {
    enter(declarationNode) {
      if (declarationNode.value.name == "x") {
        xDeclaration = declarationNode;
      } else if (declarationNode.value.name == "y") {
        xDeclaration.insertAfter(parseStatement("let v = 0"));
        xDeclaration.insertAfter(parseStatement("let w = 0"));
      }
    },
  });
  expect(startDeclarations).toEqual(endDeclarations);
  expect(startDeclarations).toEqual(["x", "y", "z"]);
  expectProgramToEqualSource(
    program,
    `
      let x = 0;
      let v = 0;
      let w = 0;
      let y = 0;
      let z = 0;
    `
  );
});

test("insert out of order complex", () => {
  const program = parseToAst(`
    let x = 0;
    let y = 0;
    let z = 0;
  `);

  let xDeclaration: WalkNode;

  const { startDeclarations } = walkDeclarations(program, {
    enter(declarationNode) {
      if (declarationNode.value.name == "x") {
        xDeclaration = declarationNode;
        xDeclaration.insertAfter(parseStatement("let f = 0"));
        xDeclaration.replace(parseStatement("let _x = 0"));
        xDeclaration.insertBefore(parseStatement("let a = 0"));
        xDeclaration.insertAfter(parseStatement("let g = 0"));
      } else if (declarationNode.value.name == "y") {
        xDeclaration.insertBefore(parseStatement("let b = 0"));
        xDeclaration.insertAfter(parseStatement("let d = 0"));
        xDeclaration.replace(parseStatement("let __x = 0"));
        xDeclaration.insertAfter(parseStatement("let e = 0"));
        xDeclaration.insertBefore(parseStatement("let c = 0"));
      }
    },
  });
  expect(startDeclarations).toEqual(["x", "y", "z"]);
  expectProgramToEqualSource(
    program,
    `
      let a = 0;
      let b = 0;
      let c = 0;
      let __x = 0;
      let d = 0;
      let e = 0;
      let f = 0;
      let g = 0;
      let y = 0;
      let z = 0;
    `
  );
});
