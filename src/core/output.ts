/**
 * An AST for the output
 */

import { ESTree } from "meriyah";
import { Element } from "hast";
import { toHtml } from "hast-util-to-html";
import { ESTreeToSource } from "../js/translate";
import { StyleSheet, generate, List } from "css-tree";

export type Output = ConsolidatedHtmlFile;

export const emptyCss: StyleSheet = {
  type: "StyleSheet",
  children: new List(),
};

export const emptyJs: ESTree.Program = {
  type: "Program",
  sourceType: "module",
  body: [],
};

export interface ConsolidatedHtmlFile {
  type: "SingleHtmlFile";
  html: Element[];
  css: StyleSheet;
  javascript: ESTree.Program;
}

export function consolidatedHtmlFileToString(
  consolidatedHtmlFile: ConsolidatedHtmlFile
): string {
  // Generate stylesheet, or don't populate an element if empty
  const styleElement: Element[] = consolidatedHtmlFile.css.children.isEmpty
    ? []
    : [
        {
          type: "element",
          tagName: "style",
          properties: {},
          children: [
            {
              type: "text",
              value: generate(consolidatedHtmlFile.css),
            },
          ],
        },
      ];

  // Generate script element, or don't populate an element if empty
  const scriptElement: Element[] =
    consolidatedHtmlFile.javascript.body.length == 0
      ? []
      : [
          {
            type: "element",
            tagName: "script",
            children: [
              {
                type: "text",
                value: ESTreeToSource(consolidatedHtmlFile.javascript),
              },
            ],
          },
        ];

  // HTML template
  /**
      <!DOCTYPE html>

      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Poly AST</title>
          <style>
            {consolidatedHtml.css}
          </style>
        </head>

        <body>
          {consolidatedHtml.html}
          <script src="js/scripts.js">
            {consolidatedHtml.html}
          </script>
        </body>
      </html>
   */
  return toHtml({
    type: "root",
    children: [
      { type: "doctype", name: "doctype" },
      {
        type: "element",
        tagName: "html",
        properties: { lang: "en" },
        children: [
          {
            type: "element",
            tagName: "head",
            properties: {},
            children: [
              {
                type: "element",
                tagName: "meta",
                properties: { charSet: "utf-8" },
                children: [],
              },
              {
                type: "element",
                tagName: "meta",
                properties: {
                  name: "viewport",
                  content: "width=device-width, initial-scale=1",
                },
                children: [],
              },
              {
                type: "element",
                tagName: "title",
                properties: {},
                children: [{ type: "text", value: "Poly AST" }],
              },
              ...styleElement,
            ],
          },
          {
            type: "element",
            tagName: "body",
            properties: {},
            children: [...consolidatedHtmlFile.html, ...scriptElement],
          },
        ],
      },
    ],
  });
}
