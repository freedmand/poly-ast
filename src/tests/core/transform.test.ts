import { DeclareStatement } from "../../core/ast";
import * as transform from "../../core/transform";
import * as ast from "../../core/ast";
import { parseStatement } from "../../js/parse";

test("declare to assign", () => {
  expect(
    transform.expressionStatement(
      transform.declareToAssign(
        parseStatement("let x = 2 + 3") as DeclareStatement
      )
    )
  ).toEqual(parseStatement("x = 2 + 3"));
});

test("wrap in closure", () => {
  expect(
    transform.expressionStatement(
      transform.closure(parseStatement("x = 2 + 3"))
    )
  ).toEqual(
    parseStatement(`
        () => {
          x = 2 + 3;
        }
    `)
  );
});

test("transform chaining 1", () => {
  expect(
    transform.declare(
      "a",
      transform.closure(
        transform.expressionStatement(
          transform.declareToAssign(
            parseStatement("let x = 2 + 3") as DeclareStatement
          )
        )
      )
    )
  ).toEqual(
    parseStatement(`
      let a = () => {
        x = 2 + 3;
      };
    `)
  );
});

test("transform chaining 2", () => {
  expect(
    transform.declare(
      "a",
      transform.expression(
        parseStatement("x = 2 + 3") as ast.ExpressionStatement
      )
    )
  ).toEqual(parseStatement("let a = (x = 2 + 3)"));
});
