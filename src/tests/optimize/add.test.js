import { optimize } from "../../core/optimize";
import { parseToAst } from "../../js/parse";

test("simple constant number add", () => {
  expect(optimize(parseToAst("let x = 1 + 2;"))).toEqual(
    parseToAst("let x = 3;")
  );
});

test("simple constant number add", () => {
  expect(optimize(parseToAst('let x = "1" + "2";'))).toEqual(
    parseToAst('let x = "12"')
  );
});
