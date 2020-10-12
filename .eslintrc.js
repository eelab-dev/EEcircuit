module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    rules: {
      "@typescript-eslint/no-use-before-define": ["error", { "functions": false, "classes": true }]
    },
    plugins: [
      '@typescript-eslint',
    ],
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
    ]
};