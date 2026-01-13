import Plugin from "./Plugin";
import { patch } from "../patch";

function applyEarlyPatches() {
  const patched = {
    editorUi: false,
    graph: false,
  };

  const tryPatchEditorUi = () => {
    if (patched.editorUi) {
      return true;
    }
    if (typeof EditorUi !== "undefined" && EditorUi.prototype) {
      patch(EditorUi.prototype, "setStatusText", (fn) => function (value: string) {
        if (!this.statusContainer) {
          return;
        }
        return fn.call(this, value);
      });
      patched.editorUi = true;
    }
    return patched.editorUi;
  };

  const tryPatchGraph = () => {
    if (patched.graph) {
      return true;
    }
    const graphConstructor = (window as any).Graph;
    if (graphConstructor && typeof graphConstructor.addLightDarkColors === "function") {
      patch(
        graphConstructor,
        "addLightDarkColors",
        (fn) =>
          function (
            node: Element,
            attrName: string,
            useLightColor: boolean,
            visitor: (elt: Element, key: string, value: string) => boolean
          ) {
            try {
              return fn.call(this, node, attrName, useLightColor, visitor);
            } catch (err) {
              console.warn("drawio addLightDarkColors failed", err);
              return false;
            }
          }
      );
      patched.graph = true;
    }
    return patched.graph;
  };

  const tryPatchAll = () => tryPatchEditorUi() && tryPatchGraph();

  if (tryPatchAll()) {
    return;
  }

  let attempts = 0;
  const retry = () => {
    if (tryPatchAll() || attempts >= 100) {
      return;
    }
    attempts += 1;
    setTimeout(retry, 50);
  };
  retry();
}

/**
 * This is the entry point that is loaded into the iframe.
 * It configures global variables and patches the DOM to intercept requests
 *
 * This file is built as an entry point and then the output is included in
 * the obsidian plugin code as a string so it can be injected into the iframe.
 **/
function app() {
  applyEarlyPatches();
  Menus.prototype.defaultMenuItems = Menus.prototype.defaultMenuItems.filter(
    (menuItem: string) => menuItem !== "help"
  );
  App.main(Plugin.plugin);
}

app();
