/**
 * The primary definition of the Poly AST
 */

export type Statement = Block | Declare | Return;

export type Expression =
  | Literal
  | Identifier
  | Plus
  | List
  | Element
  | Func
  | Call;

// Subtypes defined below

export type Block = {
  type: "Block";
  body: Statement[];
};

export type Declare = {
  type: "Declare";
  name: string;
  value: Expression;
};

export type Return = {
  type: "Return";
  value: Expression | null;
};

export type Literal = {
  type: "Literal";
  value: NumberLiteral | StringLiteral | NullLiteral;
};

export type NumberLiteral = {
  type: "NumberLiteral";
  value: number;
};

export type StringLiteral = {
  type: "StringLiteral";
  value: string;
};

export type NullLiteral = {
  type: "NullLiteral";
};

export type Identifier = {
  type: "Identifier";
  name: string;
};

export type Plus = {
  type: "Plus";
  left: Expression;
  right: Expression;
};

export type List = {
  type: "List";
  value: Expression[];
};

export type Element = {
  type: "Element";
  tag: string;
  children: Expression[];
};

export type Func = {
  type: "Func";
  params: string[];
  body: Statement;
};

export type Call = {
  type: "Call";
  func: Expression;
  arguments: Expression[];
};
