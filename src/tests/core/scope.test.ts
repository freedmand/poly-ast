import {
  analyzeScopes,
  Scope,
  VariableRedeclared,
  VariableUndeclared,
} from "../../core/scope";
import * as ast from "../../core/ast";
import { parseToAst } from "../../js/parse";

const nullNode: ast.Literal = {
  type: "Literal",
  value: {
    type: "NullLiteral",
  },
};

const oneNode: ast.Literal = {
  type: "Literal",
  value: {
    type: "NumberLiteral",
    value: 1,
  },
};

const twoNode: ast.Literal = {
  type: "Literal",
  value: {
    type: "NumberLiteral",
    value: 1,
  },
};

test("scope basics", () => {
  const scope = new Scope();
  expect(scope.has("a")).toBeFalsy();

  // Set "a"
  scope.add("a", nullNode);
  expect(scope.has("a")).toBeTruthy();

  // Cannot add "a" again
  expect(() => scope.add("a", nullNode)).toThrowError(VariableRedeclared);
});

test("parent scopes", () => {
  const scope = new Scope();
  expect(() => scope.get("a")).toThrowError(VariableUndeclared);

  // Set "a" to 1
  scope.add("a", oneNode);
  expect(scope.get("a")).toEqual(oneNode);

  // Cannot add "a" again
  expect(() => scope.add("a", oneNode)).toThrowError(VariableRedeclared);

  // Create a child scope
  const childScope = new Scope(scope);
  // "a" is still 1
  expect(childScope.get("a")).toEqual(oneNode);
  // We can add "a" since it's in a child scope
  childScope.add("a", twoNode);
  // Now "a" is 2
  expect(childScope.get("a")).toEqual(twoNode);
  // We cannot add "a" again
  expect(() => childScope.add("a", twoNode)).toThrowError(VariableRedeclared);
});

test("redeclare variable", () => {
  expect(() => analyzeScopes(parseToAst(`let x = 1;`))).not.toThrow();
  expect(() => analyzeScopes(parseToAst(`let x = 1; let x = 2;`))).toThrow(
    VariableRedeclared
  );
  expect(() =>
    analyzeScopes(
      parseToAst(`
        let x = 1;
        {
          let x = 2;
        }
     `)
    )
  ).not.toThrow();
  expect(() =>
    analyzeScopes(
      parseToAst(`
        let x = 1;
        {
          let x = 2;
          let x = 3;
        }
     `)
    )
  ).toThrowError(VariableRedeclared);
  expect(() =>
    analyzeScopes(
      parseToAst(`
        let x = 1;
        {
          let x = 2;
          {
            let x = 3;
          }
        }
     `)
    )
  ).not.toThrow();
});

test("undeclared variable", () => {
  expect(() => analyzeScopes(parseToAst(`let x = 1;`))).not.toThrow();
  expect(() => analyzeScopes(parseToAst(`let x = 1 + a;`))).toThrowError(
    VariableUndeclared
  );
  expect(() => analyzeScopes(parseToAst(`a`))).toThrowError(VariableUndeclared);
});

test("reassign variable", () => {
  expect(() => analyzeScopes(parseToAst(`let x = 1; x = 2;`))).not.toThrow();
  expect(() => analyzeScopes(parseToAst(`x = 1;`))).toThrowError(
    VariableUndeclared
  );
  expect(() => analyzeScopes(parseToAst(`let y = (x = 1);`))).toThrowError(
    VariableUndeclared
  );
});

test("function parameters", () => {
  expect(() => analyzeScopes(parseToAst(`(a) => a`))).not.toThrow();
  expect(() => analyzeScopes(parseToAst(`let a = 1; (a) => a`))).not.toThrow();
  expect(() =>
    analyzeScopes(parseToAst(`let a = 1; (a, b) => a`))
  ).not.toThrow();
  expect(() =>
    analyzeScopes(parseToAst(`let a = 1; (a, b) => c`))
  ).toThrowError(VariableUndeclared);
  expect(() => analyzeScopes(parseToAst(`(a) => { let a = 1; }`))).toThrowError(
    VariableRedeclared
  );
  expect(() => analyzeScopes(parseToAst(`(a) => { a = 1; }`))).not.toThrow();
  expect(() => analyzeScopes(parseToAst(`(a) => { b = 1; }`))).toThrowError(
    VariableUndeclared
  );
  expect(() => analyzeScopes(parseToAst(`(a) => ( b = 1 )`))).toThrowError(
    VariableUndeclared
  );
});
