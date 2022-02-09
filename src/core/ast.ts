/**
 * The primary definition of the Poly AST
 */

export type Node = Statement | Expression | Attribute;

export type Program = BlockStatement;

export type Statement =
  | BlockStatement
  | DeclareStatement
  | ExpressionStatement
  | ReturnStatement;

export type Expression =
  | Literal
  | Identifier
  | Plus
  | Assign
  | Reactive
  | List
  | Element
  | Func
  | Call;

// Subtypes defined below

export type BlockStatement = {
  type: "BlockStatement";
  body: Statement[];
};

export type DeclareStatement = {
  type: "DeclareStatement";
  name: string;
  value: Expression;
};

export type ReturnStatement = {
  type: "ReturnStatement";
  value: Expression | null;
};

export type ExpressionStatement = {
  type: "ExpressionStatement";
  value: Expression;
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

export type Assign = {
  type: "Assign";
  left: Expression;
  right: Expression;
};

export type Reactive = {
  type: "Reactive";
  value: Expression;
};

export type List = {
  type: "List";
  value: Expression[];
};

export type Element = {
  type: "Element";
  tag: string;
  attributes: Attribute[];
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

export type Attribute = NormalAttribute | EventAttribute;

export type NormalAttribute = {
  type: "NormalAttribute";
  key: string;
  value: Expression | null;
};

export type EventAttribute = {
  type: "EventAttribute";
  event: string;
  eventHandler: Expression;
};
