import eslintConfigSnordianH5P from 'eslint-config-snordian-h5p';

export default [
  eslintConfigSnordianH5P.configs['flat/recommended'],
  {
    // This library uses React, which the shared config does not cover.
    // `parserOptions` is replaced, not merged, by flat config cascade,
    // so the shared config's `impliedStrict` is repeated here.
    files: ['**/*.js'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          impliedStrict: true,
          jsx: true,
        },
      },
    },
  },
];
