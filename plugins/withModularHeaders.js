const { withPodfile } = require('@expo/config-plugins');

module.exports = function withModularHeaders(config) {
  return withPodfile(config, (config) => {
    const podfile = config.modResults.contents;
    if (!podfile.includes('use_modular_headers!')) {
      config.modResults.contents = podfile.replace(
        /^(platform :ios.*)/m,
        '$1\nuse_modular_headers!'
      );
    }
    return config;
  });
};
