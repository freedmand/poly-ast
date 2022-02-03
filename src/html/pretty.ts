import prettier from "prettier";

export function prettifyHtml(html: string): string {
  return prettier.format(html, { parser: "html" });
}
