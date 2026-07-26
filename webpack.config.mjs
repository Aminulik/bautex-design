import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import RefreshBabelPlugin from 'react-refresh/babel';
import webpack from 'webpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Читаем переменные окружения
const apiBaseUrl = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
const frontendPort = Number(process.env.FRONTEND_PORT || 3001);
const apiProxyTarget = process.env.API_PROXY_TARGET || apiBaseUrl || 'http://localhost:3003';
const yandexMapsApiKey =
  process.env.REACT_APP_YANDEX_MAPS_API_KEY || '0ac10ed4-b4d8-4d4f-bcfa-9f4150ca70e6';

// Базовый путь, по которому сайт отдаётся в production.
// По умолчанию '/bautex-design/' — project page на GitHub Pages,
// то есть https://aminulik.github.io/bautex-design/.
// Для сайта в корне домена достаточно задать PUBLIC_PATH=/ — код менять не нужно.
const rawPublicPath = process.env.PUBLIC_PATH || '/bautex-design/';
const normalizedPublicPath = rawPublicPath.endsWith('/') ? rawPublicPath : `${rawPublicPath}/`;

export default (_env, argv) => {
  const mode = argv.mode || process.env.NODE_ENV || 'development';
  const isDevelopment = mode !== 'production';
  const clientApiBaseUrl = isDevelopment ? '/api' : apiBaseUrl ? `${apiBaseUrl}/api` : '/api';
  const publicPath = isDevelopment ? '/' : normalizedPublicPath;

  // Статическое демо: production-сборка без адреса бэкенда (GitHub Pages и т.п.).
  // Как только задан REACT_APP_API_URL, флаг сам выключается.
  const isStaticDemo = !isDevelopment && !apiBaseUrl;

  return {
  mode: isDevelopment ? 'development' : 'production',
  entry: './src/index.tsx',
  performance: {
    maxAssetSize: 5 * 1024 * 1024, // 5MB
    maxEntrypointSize: 5 * 1024 * 1024, // 5MB
    hints: isDevelopment ? false : 'warning',
  },
  output: {
    filename: isDevelopment ? '[name].js' : '[name].[contenthash].js',
    chunkFilename: isDevelopment ? '[name].chunk.js' : '[name].[contenthash].chunk.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath,
    clean: true,
  },
  devServer: {
    port: frontendPort,
    hot: true,
    liveReload: true,
    historyApiFallback: true,
    open: true,
    client: {
      overlay: true,
      progress: true,
    },
    // Правильный формат proxy - массив объектов
    proxy: [
      {
        context: ['/api', '/results', '/wallpapers', '/uploads', '/debug'],
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx'],
    fallback: {
      process: false,
    },
  },
  optimization: {
    moduleIds: isDevelopment ? 'named' : 'deterministic',
    chunkIds: isDevelopment ? 'named' : 'deterministic',
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 12,
      maxAsyncRequests: 16,
      cacheGroups: {
        reactVendor: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/,
          name: 'react-vendor',
          chunks: 'all',
          priority: 30,
        },
        reduxVendor: {
          test: /[\\/]node_modules[\\/](@reduxjs|react-redux|redux|immer|reselect)[\\/]/,
          name: 'redux-vendor',
          chunks: 'all',
          priority: 20,
        },
        markdownVendor: {
          test: /[\\/]node_modules[\\/](react-markdown|remark-|rehype-|mdast-|hast-|unified|micromark|vfile|unist-)[\\/]/,
          name: 'markdown-vendor',
          chunks: 'async',
          priority: 15,
        },
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
          priority: -10,
          reuseExistingChunk: true,
        },
      },
    },
    runtimeChunk: 'single',
  },
  cache: isDevelopment
    ? {
        type: 'filesystem',
        name: 'development-cache',
        cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack'),
        compression: 'brotli',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      }
    : false,
  snapshot: {
    managedPaths: [path.resolve(__dirname, 'node_modules')],
    immutablePaths: [],
    buildDependencies: {
      hash: true,
      timestamp: true,
    },
  },
  module: {
    rules: [
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              svgo: false,
              titleProp: true,
              ref: true,
            },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 10 * 1024, // 10 KB
          },
        },
        generator: {
          filename: 'images/[name].[hash][ext]',
        },
        exclude: /\.svg$/i,
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: [
              [
                '@babel/plugin-transform-runtime',
                {
                  regenerator: true,
                  helpers: true,
                },
              ],
              isDevelopment && RefreshBabelPlugin,
            ].filter(Boolean),
            presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
            cacheDirectory: true,
          },
        },
      },
      {
        test: /\.css$/i,
        oneOf: [
          {
            test: /\.module\.css$/,
            use: [
              'style-loader',
              {
                loader: 'css-loader',
                options: {
                  esModule: true,
                  modules: {
                    namedExport: false,
                    exportLocalsConvention: 'asIs',
                    localIdentName: '[name]__[local]___[hash:base64:5]',
                  },
                  importLoaders: 1,
                },
              },
            ],
          },
          {
            use: [
              'style-loader',
              {
                loader: 'css-loader',
                options: {
                  esModule: true,
                },
              },
            ],
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      favicon: './src/assets/icon.png',
    }),
    // GitHub Pages не умеет отдавать index.html на произвольный путь.
    // Копия под именем 404.html делает так, что прямые ссылки и F5
    // на внутренних страницах (/catalog, /about/company) открываются, а не падают.
    !isDevelopment &&
      new HtmlWebpackPlugin({
        template: './src/index.html',
        filename: '404.html',
        favicon: './src/assets/icon.png',
      }),
    new webpack.DefinePlugin({
      'process.env.REACT_APP_API_URL': JSON.stringify(apiBaseUrl),
      'process.env.API_BASE_URL': JSON.stringify(clientApiBaseUrl),
      'process.env.REACT_APP_YANDEX_MAPS_API_KEY': JSON.stringify(yandexMapsApiKey),
      'process.env.PUBLIC_PATH': JSON.stringify(publicPath),
      'process.env.STATIC_DEMO': JSON.stringify(isStaticDemo ? 'true' : ''),
    }),
    isDevelopment && new webpack.HotModuleReplacementPlugin(),
    isDevelopment && new ReactRefreshWebpackPlugin(),
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
        mode: 'write-references',
      },
    }),
  ].filter(Boolean),
  devtool: isDevelopment ? 'eval-cheap-module-source-map' : 'source-map',
  };
};
