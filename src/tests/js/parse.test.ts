import simpleSource from "./simple.source.js";
import nullAndUndefinedSource from "./nullAndUndefined.source.js";
import { parse, parseToAst } from "../../js/parse";
import { programToSource } from "../../js/translate";

test("estree parsing", () => {
  expect(parse(simpleSource)).toEqual({
    type: "Program",
    sourceType: "module",
    body: [
      {
        type: "VariableDeclaration",
        kind: "let",
        declarations: [
          {
            type: "VariableDeclarator",
            id: { type: "Identifier", name: "a" },
            init: {
              type: "JSXElement",
              children: [
                { type: "JSXText", value: "3 + 2 = " },
                {
                  type: "JSXExpressionContainer",
                  expression: {
                    type: "BinaryExpression",
                    left: { type: "Literal", value: 3 },
                    right: { type: "Literal", value: 2 },
                    operator: "+",
                  },
                },
              ],
              openingElement: {
                type: "JSXOpeningElement",
                name: { type: "JSXIdentifier", name: "div" },
                attributes: [],
                selfClosing: false,
              },
              closingElement: {
                type: "JSXClosingElement",
                name: { type: "JSXIdentifier", name: "div" },
              },
            },
          },
        ],
      },
    ],
  });
});

test("source reconstruction", () => {
  const ast = parseToAst(simpleSource);
  expect(programToSource(ast)).toEqual(simpleSource);
});

test("null and undefined source reconstruction", () => {
  const ast = parseToAst(nullAndUndefinedSource);
  expect(programToSource(ast)).toEqual(nullAndUndefinedSource);
});
