module.exports = {
  mount: {
    public: "/",
    src: "/_dist_",
  },
  plugins: [
    "@snowpack/plugin-react-refresh",
    "@snowpack/plugin-dotenv",
    "@snowpack/plugin-typescript",
    //"@snowpack/plugin-optimize",
  ],
  install: [
    /* ... */
  ],
  installOptions: {
    treeshake: false,
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    clean: false,
  },
  proxy: {
    /* ... */
  },
  alias: {
    /* ... */
  },
};
