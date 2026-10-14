const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const path = require("path");

const config = getDefaultConfig(__dirname);
// shared/sim (the network built into the app) lives next to mobile/ and is shared with the web console
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, "../shared")];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

module.exports = withNativeWind(config, { input: "./global.css", inlineRem: 16 });
