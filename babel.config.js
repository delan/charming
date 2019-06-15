module.exports = api => {
  api.cache(true);

  const presets = [
    ["@babel/preset-env", { useBuiltIns: "entry", corejs: 3 }],
    "@babel/preset-typescript",
    "@babel/preset-react",
  ];

  return { presets };
};
