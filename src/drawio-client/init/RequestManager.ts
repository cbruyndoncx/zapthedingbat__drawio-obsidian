import { patch } from "../patch";
type ResponseList = { mediaType: string; href: string; source: string }[];

export class RequestManager {
  blobCache: Map<string, string>;
  responses: ResponseList;

  private constructor(
    responses: {
      mediaType: string;
      href: string;
      source: string;
    }[]
  ) {
    this.responses = responses;
    this.blobCache = new Map();
  }

  public static interceptRequests(responses: ResponseList) {
    const requestManager = new RequestManager(responses);
    requestManager.interceptRequests();
    return requestManager;
  }

  private resolveResourceUrl(url: string) {
    // Serve local resources from the app
    if (url.startsWith("app://")) {
      return url;
    }

    // Allow data urls
    if (url.startsWith("data:")) {
      return url;
    }

    // TODO: catch http requests so we can work offline
    // Allow fully qualified online resources
    if (/^(https?:|\/\/)/.test(url)) {
      return url;
    }

    // Seems to be an IE support thing
    if (url === "#default#VML") {
      return url;
    }

    // Use cached results
    if (this.blobCache.has(url)) {
      return this.blobCache.get(url);
    }

    const file = this.responses.find((file) => file.href === url);
    if (typeof file === "undefined") {
      console.warn("Missing local resource", "https://app.diagrams.net/" + url);
      // TODO: catch http requests so we can work offline
      // Allow fully qualified online resources
      return "https://app.diagrams.net/" + url;
    } else {
      // console.info("Loading local resource", url);
    }

    const mediaType = file.mediaType;
    const source = file.source;
    const isBase64 = mediaType.endsWith(";base64");

    let blobUrl;

    if (isBase64 && source.length < 1024) {
      blobUrl = "data:" + mediaType + "," + source;
    } else {
      const blob = new Blob([isBase64 ? atob(source) : source], {
        type: mediaType,
      });
      blobUrl = URL.createObjectURL(blob);
    }

    // Add result to cache
    this.blobCache.set(url, blobUrl);
    return blobUrl;
  }

  private interceptStylesheets() {
    const resolveResourceUrl = this.resolveResourceUrl.bind(this);
    const getCssSource = (href: string) => {
      const file = this.responses.find((item) => item.href === href);
      if (!file || !file.mediaType.startsWith("text/css")) {
        return null;
      }
      if (!file.source) {
        return "";
      }
      if (file.mediaType.endsWith(";base64")) {
        try {
          return atob(file.source);
        } catch (err) {
          console.warn("Unable to decode css response", err);
          return "";
        }
      }
      return file.source;
    };
    patch(
      HTMLLinkElement.prototype,
      "setAttribute",
      (fn) =>
        function (qualifiedName: string, value: string) {
          if (qualifiedName === "href") {
            const cssSource = getCssSource(value);
            if (cssSource !== null) {
              const styleElement = document.createElement("style");
              styleElement.textContent = cssSource;
              if (this.parentNode) {
                this.parentNode.insertBefore(styleElement, this);
              } else if (document.head) {
                document.head.appendChild(styleElement);
              }
              return;
            }
            value = resolveResourceUrl(value);
          }
          return fn.call(this, qualifiedName, value);
        }
    );
  }

  private interceptScripts() {
    const resolveResourceUrl = this.resolveResourceUrl.bind(this);
    patch(
      HTMLScriptElement.prototype,
      "setAttribute",
      (fn) =>
        function (qualifiedName: string, value: string) {
          if (qualifiedName === "src") {
            value = resolveResourceUrl(value);
          }
          return fn.call(this, qualifiedName, value);
        }
    );
    Object.defineProperty(HTMLScriptElement.prototype, "src", {
      set(value) {
        this.setAttribute("src", value);
      },
    });
  }

  private interceptImages() {
    const resolveResourceUrl = this.resolveResourceUrl.bind(this);
    patch(
      HTMLImageElement.prototype,
      "setAttribute",
      (fn) =>
        function (qualifiedName: string, value: string) {
          if (qualifiedName === "src") {
            value = resolveResourceUrl(value);
          }
          return fn.call(this, qualifiedName, value);
        }
    );
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      set(value) {
        this.setAttribute("src", value);
      },
    });
  }

  private interceptCss() {
    const resolveResourceUrl = this.resolveResourceUrl.bind(this);
    const urlPropertyPattern = /(url\([\'\"]?)([^\'\"\)]+)([\'\"]?\))/g;
    const rewriteUrls = (value: string) => {
      if (!value || value.indexOf("url(") === -1) {
        return value;
      }
      return value.replace(
        urlPropertyPattern,
        (_match, a, b, c) => `${a}${resolveResourceUrl(b)}${c}`
      );
    };

    patch(
      CSSStyleDeclaration.prototype,
      "setProperty",
      (fn) =>
        function (propertyName: string, value: string | null, priority?: string) {
          if (typeof value === "string") {
            value = rewriteUrls(value);
          }
          return fn.call(this, propertyName, value, priority);
        }
    );

    const cssTextDescriptor = Object.getOwnPropertyDescriptor(
      CSSStyleDeclaration.prototype,
      "cssText"
    );
    if (cssTextDescriptor && cssTextDescriptor.set) {
      Object.defineProperty(CSSStyleDeclaration.prototype, "cssText", {
        get: cssTextDescriptor.get,
        set(value: string) {
          if (typeof value === "string") {
            value = rewriteUrls(value);
          }
          return cssTextDescriptor.set.call(this, value);
        },
        configurable: cssTextDescriptor.configurable,
        enumerable: cssTextDescriptor.enumerable,
      });
    }
  }

  private interceptXhrRequests() {
    const resolveResourceUrl = this.resolveResourceUrl.bind(this);
    patch(
      XMLHttpRequest.prototype,
      "open",
      (fn) =>
        function (_method: string, url: string, ...args: any[]) {
          url = resolveResourceUrl(url);
          return fn.call(this, _method, url, ...args);
        }
    );
  }

  public interceptRequests() {
    this.interceptStylesheets();
    this.interceptScripts();
    this.interceptImages();
    this.interceptXhrRequests();
  }
}

export function loadScript(src: string, scriptLoadCallback?: () => void) {
  const script = document.createElement("script");
  if (scriptLoadCallback) {
    script.addEventListener("load", () => {
      scriptLoadCallback();
    });
  }
  script.setAttribute("src", src);
  document.head.appendChild(script);
}

export function loadStylesheet(href: string) {
  const link = document.createElement("link");
  link.setAttribute("rel", "stylesheet");
  link.setAttribute("href", href);
  document.head.appendChild(link);
}
