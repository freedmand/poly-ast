import type { Config } from "@jest/types";

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
      },
    ],
  },
  testEnvironment: "node",
};
export default config;
