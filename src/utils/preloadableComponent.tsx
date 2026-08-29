import React from "react";

type ComponentModule<Props> = {
  default: React.ComponentType<Props>;
};

export function createPreloadableComponent<Props extends object>(
  loader: () => Promise<ComponentModule<Props>>,
): {
  Component: React.FC<Props>;
  preload: () => Promise<ComponentModule<Props>>;
} {
  let status: "idle" | "pending" | "resolved" | "rejected" = "idle";
  let loadedComponent: React.ComponentType<Props> | undefined;
  let loadingError: unknown;
  let loadingPromise: Promise<ComponentModule<Props>> | undefined;

  const preload = (): Promise<ComponentModule<Props>> => {
    if (loadingPromise) return loadingPromise;
    status = "pending";
    loadingPromise = loader().then(
      (module) => {
        loadedComponent = module.default;
        status = "resolved";
        return module;
      },
      (error: unknown) => {
        loadingError = error;
        status = "rejected";
        throw error;
      },
    );
    return loadingPromise;
  };

  const Component: React.FC<Props> = (props) => {
    if (status === "resolved" && loadedComponent) {
      return React.createElement<Props>(loadedComponent, props);
    }
    if (status === "rejected") throw loadingError;
    throw preload();
  };

  return { Component, preload };
}
