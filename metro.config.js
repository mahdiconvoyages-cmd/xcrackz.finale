const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

// Get default config for the project root
const config = getDefaultConfig(projectRoot);

// Allow Metro to watch files outside the mobile folder (shared code at repo root)
config.watchFolders = [workspaceRoot];

// Resolve node_modules from workspace root first so shared packages are found
config.resolver = config.resolver || {};
config.resolver.nodeModulesPaths = [
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(projectRoot, 'node_modules'),
];

// SVG transformer support
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

const assetExts = (config.resolver && config.resolver.assetExts) || [];
const sourceExts = (config.resolver && config.resolver.sourceExts) || [];

config.resolver.assetExts = assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = Array.from(new Set([...sourceExts, 'svg']));

module.exports = config;
