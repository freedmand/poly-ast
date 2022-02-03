import { Element } from "hast-util-to-html/lib/types";
import { ConsolidatedHtmlFile, emptyCss, emptyJs } from "../../core/output";
import { parse } from "../../js/parse";
import { JSDomTest } from "../jsdom";

const helloH1: Element = {
  type: "element",
  tagName: "h1",
  children: [
    {
      type: "text",
      value: "Hello!",
    },
  ],
};

test("basic output works", () => {
  const file: ConsolidatedHtmlFile = {
    type: "SingleHtmlFile",
    html: [helloH1],
    css: emptyCss,
    javascript: parse("console.log('hello world!')"),
  };

  const dom = new JSDomTest(file);
  expect(dom.document.querySelector("h1")?.textContent).toEqual("Hello!");
  expect(dom.console).toEqual("hello world!");
});

test("no js or css output", () => {
  const emptyFile: ConsolidatedHtmlFile = {
    type: "SingleHtmlFile",
    html: [helloH1],
    css: emptyCss,
    javascript: emptyJs,
  };

  const nonEmptyFile: ConsolidatedHtmlFile = {
    ...emptyFile,
    javascript: parse("let x = 2 + 2"),
  };

  const emptyDom = new JSDomTest(emptyFile);
  expect(emptyDom.document.querySelector("script")).toBeNull();

  const nonEmptyDom = new JSDomTest(nonEmptyFile);
  expect(nonEmptyDom.document.querySelector("script")).not.toBeNull();
});
