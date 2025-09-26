const { getDefaultConfig } = require('expo/metro-config');

// Import and run environment validation at Metro start
require('./config/env-validation.js');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;