import type { Config } from "@jest/types";

const ignoreTransformPackages: string[] = [
  // Ignore transforming these esm modules
  "hast-util-to-html",
  "property-information",
  "html-void-elements",
  "hast-util-is-element",
  "unist-util-is",
  "hast-util-whitespace",
  "space-separated-tokens",
  "comma-separated-tokens",
  "stringify-entities",
  "character-entities-legacy",
  "character-entities-html4",
  "ccount",
];

const config: Config.InitialOptions = {
  testRegex: "src/tests/.*\\.test\\.[tj]sx?$",
  transform: {
    "^.+\\.[jt]sx?$": [
      "esbuild-jest",
      {
        loaders: {
          ".source.js": "text",
          ".dest.js": "text",
        },
        sourcemap: "both",
      },
    ],
  },
  transformIgnorePatterns: [
    `/node_modules/(?!(${ignoreTransformPackages.join("|")})/)`,
  ],
  testEnvironment: "node",
};
export default config;
