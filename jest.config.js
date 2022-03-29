module.exports = {
  moduleNameMapper: {
    "[.](sass|woff|ttf|bin)$": "<rootDir>/__mocks__/file.js",
  },
  testPathIgnorePatterns: ["<rootDir>/helper/"],
};
