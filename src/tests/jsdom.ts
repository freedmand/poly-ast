import { DOMWindow, JSDOM, VirtualConsole } from "jsdom";
import {
  ConsolidatedHtmlFile,
  consolidatedHtmlFileToString,
} from "../core/output";
import { prettifyHtml } from "../html/pretty";

export class JSDomTest {
  html: string;
  prettyHtml: string;
  jsdom: JSDOM;
  virtualConsole: VirtualConsole;
  window: DOMWindow;
  document: Document;
  console: string = "";

  constructor(readonly consolidatedHtmlFile: ConsolidatedHtmlFile) {
    this.html = consolidatedHtmlFileToString(consolidatedHtmlFile);
    this.prettyHtml = prettifyHtml(this.html);
    this.virtualConsole = new VirtualConsole();
    // Set up console event listener
    this.virtualConsole.on("log", (...data) => {
      this.console += `${data}`;
    });
    // Initialize JSDOM
    this.jsdom = new JSDOM(this.html, {
      virtualConsole: this.virtualConsole,
      runScripts: "dangerously",
    });
    // Grab window/document from jsdom
    this.window = this.jsdom.window;
    this.document = this.window.document;
  }
}
