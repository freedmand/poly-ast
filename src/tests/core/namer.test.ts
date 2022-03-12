import * as ast from "../../core/ast";
import {
  AppendNumberStrategy,
  digit,
  IncrementalStrategy,
  lower,
  Namer,
  setCharAt,
  UnderscorePrependStrategy,
} from "../../core/namer";
import { Scope } from "../../core/scope";
import { normalizeProgramTest } from "./testUtil";

test("set char at", () => {
  expect(setCharAt("dog", 2, "t")).toEqual("dot");
  expect(setCharAt("dog", 1, "i")).toEqual("dig");
  expect(setCharAt("dog", 0, "b")).toEqual("bog");
});

test("incremental strategy", () => {
  // Only increment with letters in the first position
  // and numbers in remaining positions
  // e.g. we might iterate something like:
  //   a, b, c, ..., x, y, z, a0, ...
  //   a9, b0, ... z9, a00, a01, ...
  const incrementer = new IncrementalStrategy(lower, digit);

  expect(incrementer.resolveName(null)).toEqual("a");
  expect(incrementer.resolveName("a")).toEqual("b");
  expect(incrementer.resolveName("b")).toEqual("c");
  expect(incrementer.resolveName("x")).toEqual("y");
  expect(incrementer.resolveName("y")).toEqual("z");
  expect(incrementer.resolveName("z")).toEqual("a0");
  expect(incrementer.resolveName("a0")).toEqual("a1");
  expect(incrementer.resolveName("a1")).toEqual("a2");
  expect(incrementer.resolveName("a8")).toEqual("a9");
  expect(incrementer.resolveName("a9")).toEqual("b0");
  expect(incrementer.resolveName("b0")).toEqual("b1");
  expect(incrementer.resolveName("b9")).toEqual("c0");
  expect(incrementer.resolveName("z9")).toEqual("a00");
  expect(incrementer.resolveName("a00")).toEqual("a01");
  expect(incrementer.resolveName("a01")).toEqual("a02");
  expect(incrementer.resolveName("a09")).toEqual("a10");
  expect(incrementer.resolveName("a10")).toEqual("a11");
  expect(incrementer.resolveName("a11")).toEqual("a12");
  expect(incrementer.resolveName("a19")).toEqual("a20");
  expect(incrementer.resolveName("a99")).toEqual("b00");
  expect(incrementer.resolveName("b98")).toEqual("b99");
  expect(incrementer.resolveName("z99")).toEqual("a000");
});

test("underscore prepend strategy", () => {
  const incrementer = new UnderscorePrependStrategy();

  expect(incrementer.resolveName(null)).toEqual("_");
  expect(incrementer.resolveName("myMethod")).toEqual("_myMethod");
  expect(incrementer.resolveName("_")).toEqual("__");
  expect(incrementer.resolveName("___helloThere99")).toEqual(
    "____helloThere99"
  );
});

test("append number strategy", () => {
  const incrementer = new AppendNumberStrategy("__", 1);

  expect(incrementer.resolveName(null)).toEqual("__1");
  expect(incrementer.resolveName("__1")).toEqual("__2");
  expect(incrementer.resolveName("__0")).toEqual("__1");
  expect(incrementer.resolveName("__9")).toEqual("__10");
  expect(incrementer.resolveName("__123")).toEqual("__124");
  expect(incrementer.resolveName("__999")).toEqual("__1000");
  expect(incrementer.resolveName("___0")).toEqual("___1");
  expect(incrementer.resolveName("dog__9")).toEqual("dog__10");
  expect(incrementer.resolveName("dog__1__1")).toEqual("dog__1__2");
  expect(incrementer.resolveName("_1")).toEqual("_1__1");
  expect(incrementer.resolveName("dog__")).toEqual("dog__1");
  expect(incrementer.resolveName("__")).toEqual("__1");
});

test("namer scopes", () => {
  const namer = new Namer<ast.Node>({
    minimize: false,
    aggressive: false,
    resolver: new AppendNumberStrategy(),
  });

  const scope = new Scope<ast.Node>(null, ast.nullLiteral);

  expect(namer.getName(scope, Symbol())).toEqual("__1");
  expect(namer.getName(scope, Symbol("dog"))).toEqual("dog");

  // Add dog into the scope
  scope.addDeclaration("dog", ast.nullLiteral);
  // Now we should see a clash
  expect(namer.getName(scope, Symbol("dog"))).toEqual("dog__1");
  // If we add dog__1 in, we should have to keep going
  scope.addDeclaration("dog__1", ast.nullLiteral);
  expect(namer.getName(scope, Symbol("dog"))).toEqual("dog__2");
  expect(namer.getName(scope, Symbol("dog__1"))).toEqual("dog__2");
  // dog__4 is brand new so a symbol with that name will just work
  expect(namer.getName(scope, Symbol("dog__4"))).toEqual("dog__4");
  // An empty symbol still works fine
  expect(namer.getName(scope, Symbol())).toEqual("__1");

  // Create a child scope
  const childScope = new Scope(scope, ast.nullLiteral);
  // Since dog__1 appears in a parent scope and aggressive is false,
  // dog__2 is returned
  expect(namer.getName(childScope, Symbol("dog"))).toEqual("dog__2");

  // If we create an aggressive namer, that won't be the case
  const aggressiveNamer = new Namer<ast.Node>({
    ...namer.nameOptions,
    aggressive: true,
  });
  // The parent scope will be the same
  expect(aggressiveNamer.getName(scope, Symbol("dog"))).toEqual("dog__2");
  // But the child scope will have the ability to start dog anew
  expect(aggressiveNamer.getName(childScope, Symbol("dog"))).toEqual("dog");

  // If we create a minimizing namer, it will ignore our desired names
  const minimizeNamer = new Namer<ast.Node>({
    ...namer.nameOptions,
    minimize: true,
  });
  expect(minimizeNamer.getName(scope, Symbol("dog"))).toEqual("__1");
  expect(minimizeNamer.getName(childScope, Symbol("dog"))).toEqual("__1");

  // Lastly, let's have some fun with an aggressive, minizing namer
  const optimalNamer = new Namer<ast.Node>({
    ...namer.nameOptions,
    minimize: true,
    aggressive: true,
  });
  expect(optimalNamer.getName(scope, Symbol("dog"))).toEqual("__1");
  expect(optimalNamer.getName(childScope, Symbol("dog"))).toEqual("__1");
  // But if we add __1 to the parent scope
  scope.addDeclaration("__1", ast.nullLiteral);
  // Optimal namer returns __2 but is the same for the parent scope
  expect(optimalNamer.getName(scope, Symbol("dog"))).toEqual("__2");
  expect(optimalNamer.getName(childScope, Symbol("dog"))).toEqual("__1");
  // Minimal namer is tamer and returns __2 in all cases
  expect(minimizeNamer.getName(scope, Symbol("dog"))).toEqual("__2");
  expect(minimizeNamer.getName(childScope, Symbol("dog"))).toEqual("__2");

  // Finally, for fun, we add __2 just to the child scope
  childScope.addDeclaration("__2", ast.nullLiteral);
  // Optimal namer returns __2 for parent, __1 for child (same as before)
  expect(optimalNamer.getName(scope, Symbol("dog"))).toEqual("__2");
  expect(optimalNamer.getName(childScope, Symbol("dog"))).toEqual("__1");
  // Minimal namer returns __2 for parent, __3 for child
  expect(minimizeNamer.getName(scope, Symbol("dog"))).toEqual("__2");
  expect(minimizeNamer.getName(childScope, Symbol("dog"))).toEqual("__3");
});

test("normalize program name", () => {
  normalizeProgramTest(
    `
      let x = 1;
    `,
    `
      let __1 = 1;
    `
  );
});

test("normalize program name function", () => {
  normalizeProgramTest(
    `
      let x = 1;
      let z = 2;
      let c = 3;
      let y = (x, y) => {
        let z = x + y;
        let w = (a, b) => {
          let q = a + b + c;
        };
      };
      let w = 3;
      y();
    `,
    `
      let __1 = 1;
      let __2 = 2;
      let __3 = 3;
      let __4 = (__5, __6) => {
        let __7 = __5 + __6;
        let __8 = (__9, __10) => {
          let __11 = __9 + __10 + __3;
        };
      };
      let __5 = 3;
      __4();
    `
  );
});

test("normalize program name complex", () => {
  normalizeProgramTest(
    `
      let x = 1;
      let y = 2;
      {
        let x = 1;
        y = 3;
        let a = 5;
        x = 4;
        let b = 6;
        let c = 7;
      }
      x = 3;
      y = 4;
      let c = 8;
    `,
    `
      let __1 = 1;
      let __2 = 2;
      {
        let __3 = 1;
        __2 = 3;
        let __4 = 5;
        __3 = 4;
        let __5 = 6;
        let __6 = 7;
      }
      __1 = 3;
      __2 = 4;
      let __3 = 8;
    `
  );
});

test("normalize program name complex", () => {
  normalizeProgramTest(
    `
      let x = 1;
      let y = 2;
      {
        let x = 1;
        y = 3;
        let a = 5;
        x = 4;
        let b = 6;
        let c = 7;
      }
      x = 3;
      y = 4;
      let c = 8;
    `,
    `
      let __1 = 1;
      let __2 = 2;
      {
        let __3 = 1;
        __2 = 3;
        let __4 = 5;
        __3 = 4;
        let __5 = 6;
        let __6 = 7;
      }
      __1 = 3;
      __2 = 4;
      let __3 = 8;
    `
  );
});

test("normalize program name double nested", () => {
  normalizeProgramTest(
    `
      let x = 1;
      let y = 2;
      {
        let x = 1;
        y = 3;
        let a = 5;
        x = 4;
        let b = 6;
        let c = 7;
      }
      x = 3;
      y = 4;
      {
        let x = 1;
        y = 3;
        let a = 5;
        x = 4;
        let b = 6;
        let c = 7;
      }
      let c = 8;
    `,
    `
      let __1 = 1;
      let __2 = 2;
      {
        let __3 = 1;
        __2 = 3;
        let __4 = 5;
        __3 = 4;
        let __5 = 6;
        let __6 = 7;
      }
      __1 = 3;
      __2 = 4;
      {
        let __3 = 1;
        __2 = 3;
        let __4 = 5;
        __3 = 4;
        let __5 = 6;
        let __6 = 7;
      }
      let __3 = 8;
    `
  );
});
