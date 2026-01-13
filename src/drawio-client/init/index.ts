import { Frame } from "./Frame";
import Responses from "./Responses";
import { RequestManager } from "./RequestManager";
import { ConfigurationManager } from "./ConfigurationManager";
import commonCss from "inline!./drawio/src/main/webapp/mxgraph/css/common.css";
import grapheditorCss from "inline!./drawio/src/main/webapp/styles/grapheditor.css";

/**
 * This is the entry point that is loaded into the iframe.
 * It configures global variables and patches the DOM to intercept requests
 *
 * This file is built as an entry point and then the output is included in
 * the obsidian plugin code as a string so it can be injected into the iframe.
 **/

function init(win: Window) {
  // draw.io expects this global when deciding platform features
  Object.defineProperty(win, "mxIsElectron", { value: false });
  // Avoid loading external stylesheets; CSP in Obsidian blocks blob: URLs.
  Object.defineProperty(win, "mxLoadStylesheets", { value: false });
  // Mirror draw.io's default HTML body classes for base layout styles.
  const applyBodyClasses = () => {
    if (!win.document.body) {
      return;
    }
    win.document.body.classList.add("geEditor", "geClassic");
  };
  if (win.document.body) {
    applyBodyClasses();
  } else {
    win.addEventListener("DOMContentLoaded", applyBodyClasses, { once: true });
  }
  // Intercept requests for resources made by drawio so it can run offline
  RequestManager.interceptRequests(Responses);
  // Prepare the window to inject the drawio application code into it.
  const frame = Frame.main(win, new ConfigurationManager(win));
  // load the css files in directly into to the frame
  // to get around obsidian's new content security policy
  frame.addCss(commonCss);
  frame.addCss(grapheditorCss);
}

init(window);
