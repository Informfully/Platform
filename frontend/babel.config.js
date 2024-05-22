module.exports = function(api) {
    api.cache(true);
    return {
        presets: ["module:metro-react-native-babel-preset"],
        // env: {
        //   "development": {
        //     "plugins": ["transform-react-jsx-source",
        //       ["module-resolver", {
        //         "root": ["./"]
        //       }]]
        //   }
        // }    
    };
  };