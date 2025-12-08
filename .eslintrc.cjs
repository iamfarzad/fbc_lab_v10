module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
  ],
  ignorePatterns: [
    'dist',
    'build',
    'node_modules',
    '*.config.js',
    '*.config.cjs',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.eslint.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['react-refresh', '@typescript-eslint', 'react'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // CRITICAL: Prevent 'src/' imports in files that use ESM (Vercel, server)
    // This pattern caused 20+ fix commits in 2 weeks
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['src/*'],
            message: 'Use relative imports with .js extensions for ESM compatibility. Example: "../../../src/lib/foo.js"',
          },
        ],
      },
    ],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
}

