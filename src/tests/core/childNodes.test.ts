import { JSDomTest } from "../jsdom";
import NodeTypes from "jsdom/lib/jsdom/living/node-type";

test("distinguishing text nodes with comments", () => {
  const dom = new JSDomTest(`<div>hello<!-- -->there</div>`);
  const div = dom.document.querySelector("div") as HTMLDivElement;
  expect(div).not.toBeNull();
  expect(div.childNodes.length).toEqual(3);
  expect(div.childNodes[0].nodeType).toEqual(NodeTypes.TEXT_NODE);
  expect(div.childNodes[1].nodeType).toEqual(NodeTypes.COMMENT_NODE);
  expect(div.childNodes[2].nodeType).toEqual(NodeTypes.TEXT_NODE);
});
