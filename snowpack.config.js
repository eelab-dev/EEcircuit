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
  ],
  install: [
    /* ... */
  ],
  installOptions: {
    treeshake: true,
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
