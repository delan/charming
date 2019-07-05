module.exports = api => {
  const envPresetOptions = api.env("test")
    ? { targets: { node: "current" } }
    : { useBuiltIns: "entry", corejs: 3 };

  const presets = [
    ["@babel/preset-env", envPresetOptions],
    "@babel/preset-typescript",
    "@babel/preset-react",
  ];

  const parserOpts = {
    strictMode: true,
  };

  return { presets, parserOpts };
};
