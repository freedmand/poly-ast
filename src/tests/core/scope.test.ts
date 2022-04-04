import {
  Reactive,
  ReactiveTracker,
  Scope,
  ScopeContext,
  scopePlaceholder,
  VariableRedeclared,
  VariableUndeclared,
} from "../../core/scope";
import * as ast from "../../core/ast";
import { parseToAst } from "../../js/parse";
import { isDeclareWalkNode, walk, WalkObject } from "../../core/walker";
import { analyzeScopes } from "../../core/namer";
import { scopeAnalysisTest } from "./testUtil";

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
  const scope = new Scope<ast.Node>(null, nullNode);
  expect(scope.has("a")).toBeFalsy();

  // Set "a"
  scope.addDeclaration("a", scopePlaceholder);
  expect(scope.has("a")).toBeTruthy();

  // Cannot add "a" again
  expect(() => scope.addDeclaration("a", nullNode)).toThrowError(
    VariableRedeclared
  );
});

test("parent scopes", () => {
  const scope = new Scope<ast.Node>(null, nullNode);
  expect(() => scope.get("a")).toThrowError(VariableUndeclared);

  // Set "a" to 1
  scope.addDeclaration("a", oneNode);
  expect(scope.get("a")).toEqual(oneNode);

  // Cannot add "a" again
  expect(() => scope.addDeclaration("a", oneNode)).toThrowError(
    VariableRedeclared
  );

  // Create a child scope
  const childScope = new Scope<ast.Node>(scope, nullNode);
  // "a" is still 1
  expect(childScope.get("a")).toEqual(oneNode);
  // We can add "a" since it's in a child scope
  childScope.addDeclaration("a", twoNode);
  // Now "a" is 2
  expect(childScope.get("a")).toEqual(twoNode);
  // We cannot add "a" again
  expect(() => childScope.addDeclaration("a", twoNode)).toThrowError(
    VariableRedeclared
  );
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

test("redeclare variable outside of embedded block statement", () => {
  expect(() =>
    analyzeScopes(
      parseToAst(`
        let x = 1;
        {
          let x = 2;
        }
        let y = 1;
     `)
    )
  ).not.toThrow();

  expect(() =>
    analyzeScopes(
      parseToAst(`
        let x = 1;
        {
          let x = 2;
        }
        let x = 1;
     `)
    )
  ).toThrowError(VariableRedeclared);

  expect(() =>
    analyzeScopes(
      parseToAst(`
        let x = 1;
        {
          let y = 2;
        }
        let x = 1;
     `)
    )
  ).toThrowError(VariableRedeclared);
});

test("redeclare variable outside of embedded function", () => {
  expect(() =>
    analyzeScopes(
      parseToAst(`
        let x = 1;
        (x) => {
          let x = 2;
        }
        let y = 1;
     `)
    )
  ).toThrowError(VariableRedeclared);

  expect(() =>
    analyzeScopes(
      parseToAst(`
        let x = 1;
        (y) => {
          let x = 2;
        }
        let x = 1;
     `)
    )
  ).toThrowError(VariableRedeclared);

  expect(() =>
    analyzeScopes(
      parseToAst(`
        let x = 1;
        (x) => {
          let y = 2;
        }
        let x = 1;
     `)
    )
  ).toThrowError(VariableRedeclared);

  expect(() =>
    analyzeScopes(
      parseToAst(`
        let x = 1;
        (x) => {
          let y = 2;
        }
        let y = 1;
     `)
    )
  ).not.toThrow();
});

test("scope depth testing", () => {
  const depthTest = (code: string) => {
    const scopeDepth = (scope: Scope | null): number => {
      if (scope == null) return 0;
      return 1 + scopeDepth(scope.parent);
    };

    const scopeContext = new ScopeContext();
    const enterIndex = new WeakMap<WalkObject, number>();
    const beforeEnterDepths: number[] = [];
    const afterEnterDepths: number[] = [];
    const beforeLeaveDepths: number[] = [];
    const afterLeaveDepths: number[] = [];
    walk(parseToAst(code), {
      enter(walkObject) {
        enterIndex.set(walkObject, beforeEnterDepths.length);
        beforeEnterDepths.push(scopeDepth(scopeContext.scope));
        scopeContext.enter(walkObject);
        afterEnterDepths.push(scopeDepth(scopeContext.scope));
      },
      leave(walkObject) {
        const idx = enterIndex.get(walkObject);
        if (idx == null) {
          throw new Error("Mismatched leave object");
        }
        beforeLeaveDepths[idx] = scopeDepth(scopeContext.scope);
        scopeContext.leave(walkObject);
        afterLeaveDepths[idx] = scopeDepth(scopeContext.scope);
      },
    });

    expect(beforeEnterDepths).toEqual(afterLeaveDepths);
    expect(afterEnterDepths).toEqual(beforeLeaveDepths);

    return true;
  };

  expect(
    depthTest(`
      let x = 0;
      let y = 1;
      {
        let x = 0;
        let y = 1;
      }
      let z = 0;
  `)
  ).toBeTruthy();

  expect(
    depthTest(`
      let x = 0;
      let y = 1;
      (a, b, c) => {
        let x = 0;
        let y = (a, b, c) => {
          let x = 0;
          let z = 99;
        }
        let z = 1;
      }
      let z = 0;
  `)
  ).toBeTruthy();
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

function getReactives(reactives: Reactive[]): string[] {
  return reactives.map<string>((reactive) => {
    if (typeof reactive.name == "symbol") {
      throw new Error("Expecting non-placeholder reactives");
    }
    return reactive.name;
  });
}

type ReactiveNameMap = { [declareName: ast.Name]: string[] };

function reactiveTest(sourceCode: string, expectations: ReactiveNameMap) {
  // Create the program
  const program = parseToAst(sourceCode);
  // Lay out a reactive tracker
  const tracker = new ReactiveTracker();

  // Initialize the actual results map
  const results: { [declareName: ast.Name]: string[] } = {};

  walk(program, {
    enter(walkObject) {
      tracker.enter(walkObject);
    },
    leave(walkObject) {
      // Grab the reactives
      const reactives = tracker.leave(walkObject);
      const names = getReactives(reactives);
      if (isDeclareWalkNode(walkObject)) {
        // Associate the reactives with the names in the results
        results[walkObject.value.name] = names;
      }
    },
  });

  // Ensure the expectations match the results
  expect(expectations).toEqual(results);
}

test("reactive tracker simple", () => {
  reactiveTest(
    `
      let a = reactive(x);
      let b = reactive(a);
    `,
    {
      a: ["x"],
      b: ["a"],
    }
  );
});

test("reactive tracker function reactive declaration", () => {
  reactiveTest(
    `
      let x = 0;
      let y = () => {
        let a = reactive(x) + 1;
        return a;
      }
    `,
    {
      a: ["x"],
      // Non-reactives
      x: [],
      y: [],
    }
  );
});

test("reactive tracker function reactive return", () => {
  reactiveTest(
    `
      let x = 0;
      let y = () => {
        let a = reactive(x) + 1;
        return reactive(a);
      }
    `,
    {
      a: ["x"],
      y: ["a"],
      // Non-reactives
      x: [],
    }
  );
});

test("scope analysis simple reactive", () => {
  scopeAnalysisTest(
    `
      let y = 0;
      let x = reactive(y);
    `,
    `
      let y = 0;
      let x;
      let __setX = () => {
        x = y;
      }
      __setX();
    `
  );
});

test("scope analysis reactive assigns", () => {
  scopeAnalysisTest(
    `
      let x = 0;
      let a = reactive(x) + 1;
      x = 3;
      let y = 9;
      x = 5;
      y = 10;
      y = (x = 3) + (x = 4);
      x = 8;
    `,
    `
      let x = 0;
      let a;
      let __setX = () => {
        a = x + 1;
      }
      __setX();
      x = 3;
      __setX();
      let y = 9;
      x = 5;
      __setX();
      y = 10;
      let __intermediate1 = (x = 3);
      __setX();
      let __intermediate2 = (x = 4);
      __setX();
      y = __intermediate1 + __intermediate2;
      x = 8;
      __setX();
    `
  );
});

test("scope analysis reactive expressions", () => {
  scopeAnalysisTest(
    `
      let x = 0;
      let log = x => x;
      log(reactive(x));
    `,
    `
      let x = 0;
      let log = x => x;
      let __setX = () => {
        log(x);
      };
      __setX();
    `
  );

  scopeAnalysisTest(
    `
      let x = 0;
      let log = x => x;
      log(reactive(x));
      x = 9;
    `,
    `
      let x = 0;
      let log = x => x;
      let __setX = () => {
        log(x);
      };
      __setX();
      x = 9;
      __setX();
    `
  );
});

test("scope analysis multireactive expression", () => {
  scopeAnalysisTest(
    `
      let a = 1;
      let b = 2;
      let log = x => x;
      log(reactive(a) + reactive(b));
      let z = (a = 2) + (b = 3);
    `,
    `
      let a = 1;
      let b = 2;
      let log = x => x;
      let __set_a_or_b = () => {
        log(a + b);
      }
      __set_a_or_b();
      let _a = a = 2;
      __set_a_or_b();
      let _b = b = 3;
      __set_a_or_b();
      let z = _a + _b;
    `
  );
});

test("scope analysis reactive function return", () => {
  scopeAnalysisTest(
    `
      let x = 0;
      let getAnswer = () => {
        return reactive(x);
      }
    `,
    `
      let x = 0;
      let getAnswer;
      let __setX = () => {
        getAnswer = () => {
          return x;
        }
      };
      __setX();
    `
  );

  scopeAnalysisTest(
    `
      let x = 0;
      let getAnswer = () => {
        return reactive(x);
      }
      x = 9;
    `,
    `
      let x = 0;
      let getAnswer;
      let __setX = () => {
        getAnswer = () => {
          return x;
        }
      };
      __setX();
      x = 9;
      __setX();
    `
  );

  scopeAnalysisTest(
    `
      let x = 0;
      let getAnswer = () => {
        return reactive(x);
      };
      let y = getAnswer();
      x = 9;
    `,
    `
    let x = 0;
    let getAnswer;
    let __setX = () => {
      getAnswer = () => {
        return x;
      }
    };
    __setX();
    let y = getAnswer();
    x = 9;
    __setX();
    `
  );
});

test("scope analysis nested reactive function", () => {
  scopeAnalysisTest(
    `
      let x = 0;
      let getAnswer = () => {
        return reactive(x);
      };
      let y = reactive(getAnswer)();
      x = 9;
    `,
    `
    let x = 0;
    let getAnswer;
    let __setX = () => {
      getAnswer = () => {
        return x;
      }
    };
    __setX();
    let y;
    let __setY = () => {
      y = getAnswer();
    }
    __setY();
    x = 9;
    __setX();
    __setY();
    `
  );
});

test("scope analysis reactive dependency deep chaining", () => {
  scopeAnalysisTest(
    `
      let a = 0;
      let b = reactive(a) + 1;
      let c = reactive(b) + 2;
      let d = reactive(c) + 3;
      let e = reactive(d) + 4;
      a = 1;
    `,
    `
    let a = 0;
    let b;
    let __setB = () => {
      b = a + 1;
    }
    __setB();
    let c;
    let __setC = () => {
      c = b + 2;
    }
    __setC();
    let d;
    let __setD = () => {
      d = c + 3;
    }
    __setD();
    let e;
    let __setE = () => {
      e = d + 4;
    }
    __setE();
    a = 1;
    __setB();
    __setC();
    __setD();
    __setE();
    `
  );
});

test("scope analysis multiple reactive assigns for one variable", () => {
  scopeAnalysisTest(
    `
      let a = 0;
      let b = reactive(a) + 1;
      let c = reactive(a) + 2;
      a = 1;
    `,
    `
    let a = 0;
    let b;
    let __setB = () => {
      b = a + 1;
    }
    __setB();
    let c;
    let __setC = () => {
      c = a + 2;
    }
    __setC();
    a = 1;
    __setB();
    __setC();
    `
  );
});

test("scope analysis unset reactive", () => {
  scopeAnalysisTest(
    `
      let a = 0;
      let b = reactive(a) + 1;
      a = 1;
      b = 2;
      a = 3;
    `,
    `
    let a = 0;
    let b;
    let __setB = () => {
      b = a + 1;
    }
    __setB();
    a = 1;
    __setB();
    b = 2;
    a = 3;
    `
  );
});

// test("scope analysis different scopes", () => {
//   scopeAnalysisTest(
//     `
//       let x = 1;
//       {
//         let y = 2;
//         {
//           let a = reactive(x) + reactive(y);
//           let log = x => x;
//           log(reactive(a));
//         }

//         y = 3;
//         x = 2;
//       }
//       x = 3;
//     `,
//     `
//       let __setA;
//       let __updateA;
//       let x = 1;
//       {
//         let y = 2;
//         {
//           let a;
//           __setA = () => {
//             a = x + y;
//           }
//           __setA();
//           let log = x => x;
//           __updateA = () => {
//             log(a);
//           }
//           __updateA();
//         }
//         y = 3;
//         __setA();
//         __updateA();
//         x = 2;
//         __setA();
//         __updateA();
//       }
//       x = 3;
//       __setA();
//       __updateA();
//     `
//   );
// });
