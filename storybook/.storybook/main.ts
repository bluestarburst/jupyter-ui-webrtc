/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import type { StorybookConfig } from '@storybook/react-webpack5';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): any {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return dirname(join(__dirname, '../../node_modules', value, 'package.json'));
}

const config: StorybookConfig = {
  stories: [
    '../src/stories/**/*.mdx',
    '../src/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    getAbsolutePath('@storybook/addon-links'),
    {
      name: getAbsolutePath('@storybook/addon-essentials'),
      options: {
        backgrounds: false,
      },
    },
    getAbsolutePath('@storybook/addon-interactions'),
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-webpack5'),
    options: {
      builder: {
//        useSWC: true,
      },
    },
  },
  webpackFinal: config => {
    // Add module resolution configuration
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        '@datalayer/jupyter-lexical': join(dirname(fileURLToPath(import.meta.url)), '../../node_modules/@datalayer/jupyter-lexical'),
        '@jupyterlab/application': join(dirname(fileURLToPath(import.meta.url)), '../../node_modules/@jupyterlab/application'),
        '@jupyterlab/notebook': join(dirname(fileURLToPath(import.meta.url)), '../../node_modules/@jupyterlab/notebook'),
        '@jupyterlab/console': join(dirname(fileURLToPath(import.meta.url)), '../../node_modules/@jupyterlab/console'),
        // Mock JupyterLite assets
        '../style/icons/logo-32x32.png': join(dirname(fileURLToPath(import.meta.url)), '../src/mock-assets/mock-logo.png'),
        '../style/icons/logo-64x64.png': join(dirname(fileURLToPath(import.meta.url)), '../src/mock-assets/mock-logo.png'),
      },
      fallback: {
        ...config.resolve?.fallback,
        path: join(dirname(fileURLToPath(import.meta.url)), '../../node_modules/path-browserify'),
        fs: false,
        os: false,
      },
    };

    config.module?.rules?.push(
      {
        test: /\.tsx?$/,
        loader: 'babel-loader',
        options: {
          plugins: [
            [
              '@babel/plugin-transform-typescript',
              {
                allowDeclareFields: true,
              },
            ],
            '@babel/plugin-proposal-class-properties',
          ],
          presets: [
            [
              '@babel/preset-react',
              {
                runtime: 'automatic',
                importSource: 'react',
              },
            ],
            '@babel/preset-typescript',
          ],
          cacheDirectory: true,
        },
        exclude: /node_modules/,
      },
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-react'],
          cacheDirectory: true
        }
      },
      // Handle all image assets
      {
        test: /\.(png|jpg|jpeg|gif|svg|ico)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'static/media/[name].[hash][ext]',
        },
      },
      /*
      TODO(ECH) Disable for now to show the Lexical SVG icons.
      {
        // In .css files, svg is loaded as a data URI.
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        issuer: /\.css$/,
        use: {
          loader: 'svg-url-loader',
          options: { encoding: 'none', limit: 10000 },
        },
      },
      */
      {
        // In .ts and .tsx files (both of which compile to .js), svg files
        // must be loaded as a raw string instead of data URIs.
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        issuer: /\.js$/,
        type: 'asset/source',
      },
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.c?js/,
        resolve: {
          fullySpecified: false,
        },
      },
      // Rule for jupyterlite service worker
      {
        resourceQuery: /text/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]',
        },
      },
      // Rules for pyodide kernel assets
      {
        test: /pypi\/.*/,
        type: 'asset/resource',
        generator: {
          filename: 'pypi/[name][ext][query]',
        },
      },
      {
        test: /pyodide-kernel-extension\/schema\/.*/,
        type: 'asset/resource',
        generator: {
          filename: 'schema/[name][ext][query]',
        },
      }
    );
    return config;
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;
