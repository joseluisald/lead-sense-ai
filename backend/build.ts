await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./build",
  target: "bun", //browser | bun
  minify: {
    whitespace: true,
    syntax: true,
  },
  compile: {
    target: "bun-windows-x64",
    outfile: "server-with-bun",
  },
});

export {};
