import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import jestPlugin from 'eslint-plugin-jest';

export default [
  js.configs.recommended,
  
  // Main configuration
  {
    plugins: {
      import: importPlugin
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script'
      }
    },
    rules: {
      'no-console': 'off',
      'import/no-commonjs': 'off',
      'no-undef': 'error'
    }
  },
  
  // Jest configuration (applies only to test files)
{
    files: ['**/*.test.js'],
    ...jestPlugin.configs['flat/recommended'],
    settings: {
      jest: {
        version: 30 // Use your actual Jest version here
      }
    }
  },
  
  // Ignore patterns
  {
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/'
    ]
  }
];