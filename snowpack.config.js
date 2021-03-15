module.exports = {
  mount: {
    public: "/",
    src: "/_dist_",
  },
  plugins: [
    "@snowpack/plugin-react-refresh",
    "@snowpack/plugin-dotenv",
    "@snowpack/plugin-typescript",
    "@snowpack/plugin-optimize",
    //"@snowpack/plugin-webpack",
  ],
  devOptions: {
    /* ... */
  },
  buildOptions: {
    clean: true,
  },
  alias: {
    /* ... */
  },
  optimize: {
    //bundle: true,
    minify: true,
    treeshake: true,
    target: "es2020",
  },
};
