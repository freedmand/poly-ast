/**
 * This test describes a counter web application
 *
 * let count = 0;
 * <h1>Counter</h1>
 * <p>Count: {count}</p>
 * <button on:click={() => count++}>+</button>
 *
 * Desired HTML output:
 *
 * <h1>Counter</h1>
 * <p>Count: 0</p>
 * <button>+</button>
 * <script>
 *   let count = 0;
 * </script>
 */

// import * as ast from "../../core/ast";
import { compile } from "../../core/compile";
import { parseToAst } from "../../js/parse";
import counterSource from "./counter.source.js";
import {
  ConsolidatedHtmlFile,
  consolidatedHtmlFileToString,
  emptyCss,
} from "../../core/output";
import { programToSource } from "../../js/translate";
import util from "util";

test("counter", () => {
  const program = parseToAst(counterSource, true);
  // console.log(util.inspect(program, false, null, true));
  // TODO: test functional counter app
});

test("source reconstruction", () => {
  const ast = parseToAst(counterSource);
  expect(programToSource(ast)).toEqual(counterSource);
});

test("compile", () => {
  const jsProgram = compile(parseToAst(counterSource, true));
  const file: ConsolidatedHtmlFile = {
    type: "SingleHtmlFile",
    html: [],
    css: emptyCss,
    javascript: jsProgram,
  };
});
