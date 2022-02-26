import { parseToAst } from "../../js/parse";
import { programToSource } from "../../js/translate";
import * as ast from "../../core/ast";
import { analyzeScopes, normalizeProgram } from "../../core/namer";

export function expectProgramToEqualSource(
  program: ast.Program,
  source: string
) {
  try {
    expect(program).toEqual(parseToAst(source));
  } catch (e) {
    console.warn(`Program:\n--------\n${programToSource(program)}`);
    throw e;
  }
}

export function assertNameInvariantEquality(
  program1: ast.Program,
  program2: ast.Program
) {
  // Rename both programs to normalized names
  normalizeProgram(program1);
  normalizeProgram(program2);
  try {
    expect(program1).toEqual(program2);
  } catch (e) {
    console.warn(
      `Program 1:\n--------\n${programToSource(
        program1
      )}\n\nProgram 2:\n--------\n${programToSource(program2)}`
    );
    throw e;
  }
}

export function scopeAnalysisTest(source1: string, source2: string) {
  const program = parseToAst(source1);
  analyzeScopes(program);

  assertNameInvariantEquality(program, parseToAst(source2));
}

export function normalizeProgramTest(source: string, outputSource: string) {
  const program = parseToAst(source);
  normalizeProgram(program);
  expectProgramToEqualSource(program, outputSource);
}
