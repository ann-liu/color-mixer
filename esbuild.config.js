import * as esbuild from "esbuild";
import fs from "fs";
import { transform } from "lightningcss";
import { minifyHTMLLiterals } from "minify-html-literals";

const isProd = process.argv.includes("--prod");

const cssPlugin = {
  name: "css-plugin",
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      let contents = await fs.promises.readFile(args.path, "utf8");

      if (isProd) {
        const { code } = transform({
          filename: args.path,
          code: Buffer.from(contents),
          minify: true,
        });
        contents = code.toString();
      }

      return { contents, loader: "text" };
    });
  },
};

const htmlMinifyPlugin = {
  name: "html-minify-plugin",
  setup(build) {
    build.onLoad({ filter: /\.(ts|js)$/ }, async (args) => {
      let contents = await fs.promises.readFile(args.path, "utf8");

      if (isProd) {
        const result = minifyHTMLLiterals(contents, {
          fileName: args.path,
          shouldMinify: () => true,
          minify: {
            collapseWhitespace: true,
            conservativeCollapse: true,
            minifyCSS: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeEmptyAttributes: true,
            caseSensitive: true,
          },
        });

        if (result && result.code !== contents) {
          contents = contents.replace(/\n\s*/g, "");
        }
      }

      const loader = args.path.endsWith(".ts") ? "ts" : "js";
      return { contents, loader };
    });
  },
};

const buildOptions = {
  entryPoints: ["src/color-mixer.ts", "src/color-input.ts"],
  bundle: true,
  outdir: "www",
  plugins: [cssPlugin, htmlMinifyPlugin],
  minify: isProd,
  treeShaking: isProd,
  target: ["es2020"],
  format: "iife",
};

if (isProd) {
  await esbuild.build(buildOptions);
  console.log("☑️ build complete");
} else {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  const { port } = await ctx.serve({
    servedir: "www",
    port: 3000,
  });
  console.log(`➡️ http://localhost:${port}`);
}
