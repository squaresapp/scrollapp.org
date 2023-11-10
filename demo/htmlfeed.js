"use strict";
var HtmlFeed;
(function (HtmlFeed) {
    /**
     * An enumeration that defines the CSS classes that are used
     * to control the behavior of a reel.
     */
    let StandardClasses;
    (function (StandardClasses) {
        /**
         * Applied to an HTML container element that is intended to
         * operate as a top-level scene-containing element, but is not
         * a <body> tag.
         */
        StandardClasses["body"] = "--body";
        /**
         * Applied to a <section> to indicate that it says fixed in place
         * during it's visiblity lifecycle, rather than scrolling with the page.
         */
        StandardClasses["fixed"] = "--fixed";
        /**
         * Applied to the element
         */
        StandardClasses["strip"] = "--strip";
        /**
         * Applied to a <section> to indicate that the scene is longer than
         * a full screen of height. Scenes with this class are at least 200vh
         * in height (which is necessary in order to avoid the undesirable
         * scroll-snap related jumping behavior that exists in browsers)
         */
        StandardClasses["long"] = "--long";
    })(StandardClasses = HtmlFeed.StandardClasses || (HtmlFeed.StandardClasses = {}));
    HtmlFeed.standardCss = `
		HTML, .${StandardClasses.body}
		{
			scroll-snap-type: y mandatory;
		}
		HTML, BODY, .${StandardClasses.body}
		{
			margin: 0;
			padding: 0;
			height: 100%;
		}
		HTML
		{
			overflow-y: auto;
			height: 100%;
		}
		SECTION
		{
			position: relative;
			scroll-snap-align: start;
			scroll-snap-stop: always;
			height: 100%;
		}
		[if*="0.2"] SECTION[src], SECTION[data-src]
		{
			background-color: black !important;
		}
		SECTION[src] *, SECTION[data-src] *
		{
			display: none !important;
		}
		SECTION.${StandardClasses.long}
		{
			height: auto;
			min-height: 200.1vh;
		}
		SECTION.${StandardClasses.long}::after
		{
			content: "";
			position: absolute;
			left: 0;
			right: 0;
			bottom: 0;
			height: 0;
			visibility: hidden;
			scroll-snap-align: end;
		}
		.${StandardClasses.strip}
		{
			position: fixed !important;
			top: 0 !important;
			left: 0 !important;
			width: 0 !important;
			height: 100% !important;
		}
		.${StandardClasses.fixed}
		{
			width: 100vw;
			height: 100vh;
			height: 100dvh;
			position: relative;
		}
		.${StandardClasses.strip}, .${StandardClasses.fixed}
		{
			background-color: inherit;
		}
		SECTION[src], SECTION[data-src]
		{
			display: none;
		}
	`.replace(/[\r\n\t]/g, "");
    //@ts-ignore
    if (typeof document === "undefined")
        return;
    /**
     * Returns the standard Reel CSS embedded within a <style> element.
     * This <style> element should be inserted somewhere into the document
     * in order for it to
     */
    function getStandardCss() {
        const style = document.createElement("style");
        style.textContent = HtmlFeed.standardCss;
        return style;
    }
    HtmlFeed.getStandardCss = getStandardCss;
    /**
     * Registers a particular node as the root DOM Node that
     * directly contains the sections to include in a reel.
     */
    function registerRoot(root) {
        new MutationObserver(records => {
            for (const rec of records)
                adjustNodes(rec.addedNodes);
        }).observe(root, { childList: true });
        adjustNodes(root.childNodes);
    }
    HtmlFeed.registerRoot = registerRoot;
    /** */
    function adjustNodes(nodes) {
        for (const node of Array.from(nodes)) {
            if (node instanceof HTMLElement && node.nodeName === "SECTION") {
                io.observe(node);
                if (node.classList.contains(StandardClasses.fixed))
                    toFixed(node);
            }
        }
        //captureTriggerClasses();
        captureRanges(document.body);
    }
    /** */
    function toFixed(section) {
        const strip = document.createElement("div");
        strip.classList.add(StandardClasses.strip);
        const fixed = document.createElement("div");
        fixed.classList.add(StandardClasses.fixed);
        fixed.append(...Array.from(section.childNodes));
        strip.append(fixed);
        section.append(strip);
    }
    //# Ranges
    /** */
    function captureRanges(container) {
        for (const rule of eachCssRule(container)) {
            const matches = rule.selectorText.match(reg);
            for (const match of matches || []) {
                const parts = match
                    .replace(/[^\.,\d]/g, "")
                    .split(`,`);
                let low = parts[0] === "" ? -1 : Number(parts[0]) || -1;
                let high = parts[1] === "" ? 1 : Number(parts[1]) || 1;
                low = Math.max(-1, Math.min(1, low));
                high = Math.min(1, Math.max(-1, high));
                if (high < low)
                    low = high;
                rangePairs.set(low + `,` + high, [low, high]);
            }
        }
    }
    const reg = /\[\s*if\s*~=("|')-?(1|0|0\.\d+),\-?(1|0|0\.\d+)("|')]/g;
    const rangePairs = new Map();
    /** */
    function* eachCssRule(container) {
        const sheetContainers = [
            ...Array.from(container.querySelectorAll("STYLE")),
            ...Array.from(container.querySelectorAll("LINK")),
        ];
        const sheets = sheetContainers
            .filter(e => !processedSheetContainers.has(e))
            .map(e => e.sheet)
            .filter((sh) => !!sh);
        sheetContainers.forEach(e => processedSheetContainers.add(e));
        function* recurse(rules) {
            for (let i = -1; ++i < rules.length;) {
                const rule = rules[i];
                if (rule instanceof CSSGroupingRule)
                    recurse(rule.cssRules);
                else if (rule instanceof CSSStyleRule)
                    yield rule;
            }
        }
        ;
        for (const sheet of sheets)
            yield* recurse(sheet.cssRules);
    }
    const processedSheetContainers = new WeakSet();
    //# Intersection Observer
    const threshold = new Array(1000).fill(0).map((_, i) => i / 1000);
    const io = new IntersectionObserver(records => {
        for (const rec of records) {
            // The target will be a different element when dealing
            // with position: fixed <section> elements.
            const e = rec.target;
            if (!(e instanceof HTMLElement))
                continue;
            let inc = rec.intersectionRatio;
            if (rec.boundingClientRect.top >= 0)
                inc -= 1;
            else
                inc = 1 - inc;
            if (inc >= -0.01 && inc <= 0.01)
                inc = 0;
            if (inc > 0.99 && inc < 1)
                inc = 1;
            if (inc < -0.99 && inc > -1)
                inc = -1;
            if (e.classList.contains(StandardClasses.fixed)) {
                const strip = Array.from(e.children).find(e => e.classList.contains(StandardClasses.strip));
                if (strip instanceof HTMLElement) {
                    if (Math.abs(inc) === 1)
                        strip.style.visibility = "hidden";
                    else if (strip.style.visibility === "hidden")
                        strip.style.removeProperty("visibility");
                }
            }
            const v100 = Math.abs(Math.min(inc, 0));
            const v010 = 1 - Math.abs(inc);
            const v001 = Math.max(0, inc);
            const v110 = 1 - Math.max(0, inc);
            const v011 = Math.min(1, inc + 1);
            const v101 = Math.abs(inc);
            e.style.setProperty("--100", v100.toString());
            e.style.setProperty("--010", v010.toString());
            e.style.setProperty("--001", v001.toString());
            e.style.setProperty("--110", v110.toString());
            e.style.setProperty("--011", v011.toString());
            e.style.setProperty("--101", v101.toString());
            e.style.setProperty("--inc", inc.toString());
            e.style.setProperty("--dec", (inc * -1).toString());
            const ifAttr = [];
            for (const [low, high] of rangePairs.values())
                if (inc >= low && inc <= high)
                    ifAttr.push(low + `,` + high);
            e.setAttribute("if", ifAttr.join(" "));
        }
    }, { threshold });
    if (document.readyState === "loading") {
        document.addEventListener("readystatechange", () => {
            registerRoot(document.body);
        });
    }
    else
        registerRoot(document.body);
})(HtmlFeed || (HtmlFeed = {}));
var HtmlFeed;
(function (HtmlFeed) {
    /**
     * A class that reads a raw HTML document, and provides
     * the ability to scan the document with registered "traps",
     * which allow the document's content to be modified.
     */
    class ForeignDocumentReader {
        rawDocument;
        /** */
        constructor(rawDocument) {
            this.rawDocument = rawDocument;
        }
        /** */
        trapElement(elementFn) {
            this.elementFn = elementFn;
        }
        elementFn = (element) => element;
        /** */
        trapAttribute(attributeFn) {
            this.attributeFn = attributeFn;
        }
        attributeFn = (name, value, element) => value;
        /** */
        trapProperty(propertyFn) {
            this.propertyFn = propertyFn;
        }
        propertyFn = (name, value) => name;
        /** */
        read() {
            const parser = new DOMParser();
            const doc = parser.parseFromString(this.rawDocument, "text/html");
            const trash = [];
            for (const walker = doc.createTreeWalker(doc);;) {
                let node = walker.nextNode();
                if (!node)
                    break;
                if (!(node instanceof Element))
                    continue;
                let element = node;
                const result = this.elementFn(element);
                if (!result) {
                    trash.push(element);
                    continue;
                }
                else if (result instanceof Node && result !== element) {
                    element.replaceWith(result);
                    element = result;
                }
                if (element instanceof HTMLStyleElement) {
                    if (element.sheet) {
                        this.readSheet(element.sheet);
                        const cssText = [];
                        for (let i = -1, len = element.sheet.cssRules.length; ++i < len;)
                            cssText.push(element.sheet.cssRules[i].cssText);
                        if (element instanceof HTMLStyleElement)
                            element.textContent = cssText.join("\n");
                    }
                }
                for (const attr of Array.from(element.attributes)) {
                    const newValue = this.attributeFn(attr.name, attr.value, element);
                    if (newValue === null || newValue === undefined)
                        element.removeAttributeNode(attr);
                    else
                        element.setAttribute(attr.name, newValue);
                }
                if (element instanceof HTMLElement && element.hasAttribute("style"))
                    this.readStyle(element.style);
            }
            for (const e of trash)
                e.remove();
            return doc;
        }
        /** */
        readSheet(sheet) {
            const recurse = (group) => {
                const len = group.cssRules.length;
                for (let i = -1; ++i < len;) {
                    const rule = group.cssRules.item(i);
                    if (rule instanceof CSSGroupingRule)
                        recurse(rule);
                    else if (rule instanceof CSSStyleRule)
                        this.readStyle(rule.style);
                }
            };
            recurse(sheet);
        }
        /** */
        readStyle(style) {
            const names = [];
            for (let n = -1; ++n < style.length;)
                names.push(style[n]);
            for (const name of names) {
                const value = style.getPropertyValue(name);
                const priority = style.getPropertyPriority(name);
                const resultValue = this.propertyFn(name, value);
                if (resultValue !== value) {
                    // The property has to be removed either way,
                    // because if we're setting a new property with
                    // a different URL, it won't get properly replaced.
                    style.removeProperty(name);
                    if (resultValue)
                        style.setProperty(name, resultValue, priority);
                }
            }
        }
    }
    HtmlFeed.ForeignDocumentReader = ForeignDocumentReader;
})(HtmlFeed || (HtmlFeed = {}));
var HtmlFeed;
(function (HtmlFeed) {
    /**
     * A class that wraps a ForeignDocumentReader, and which converts
     * the content of the specified raw HTML document into a format
     * which is acceptable for injection into a blog.
     */
    class ForeignDocumentSanitizer {
        rawDocument;
        baseHref;
        /** */
        constructor(rawDocument, baseHref) {
            this.rawDocument = rawDocument;
            this.baseHref = baseHref;
        }
        /** */
        read() {
            const reader = new HtmlFeed.ForeignDocumentReader(this.rawDocument);
            reader.trapElement(e => {
                const t = e.tagName.toLowerCase();
                if (t === "frame" || t === "frameset")
                    return;
                if (t === "script" || t === "iframe" || t === "portal")
                    return;
                if (t === "noscript") {
                    return Hot.div(Array.from(e.attributes), Array.from(e.children));
                }
                return e;
            });
            reader.trapAttribute((name, value, element) => {
                if (name.startsWith("on"))
                    return;
                const tag = element.tagName.toLowerCase();
                if (name === "srcset")
                    return this.resolveSourceSetUrls(value);
                if (name === "href" ||
                    name === "src" ||
                    (tag === "embed" && name === "source") ||
                    (tag === "video" && name === "poster") ||
                    (tag === "object" && name === "data") ||
                    (tag === "form" && name === "action"))
                    return this.resolvePlainUrl(value);
                return value;
            });
            reader.trapProperty((name, value) => {
                if (!urlProperties.has(name))
                    return value;
                return this.resolveCssUrls(value);
            });
            return reader.read();
        }
        /** */
        resolvePlainUrl(plainUrl) {
            if (plainUrl.startsWith("data:") ||
                plainUrl.startsWith("http:") ||
                plainUrl.startsWith("https:") ||
                plainUrl.startsWith("/") ||
                /^[a-z\-]+:/g.test(plainUrl))
                return plainUrl;
            return HtmlFeed.Url.resolve(plainUrl, this.baseHref);
        }
        /** */
        resolveCssUrls(cssValue) {
            const reg = /\burl\(["']?([^\s?"')]+)/gi;
            const replaced = cssValue.replace(reg, (substring, url) => {
                let resolved = this.resolvePlainUrl(url);
                if (substring.startsWith(`url("`))
                    resolved = `url("` + resolved;
                else if (substring.startsWith(`url(`))
                    resolved = `url(` + resolved;
                return resolved;
            });
            return replaced;
        }
        /**
         * Resolves URLs in a srcset attribute, using a make-shift algorithm
         * that doesn't support commas in the URL.
         */
        resolveSourceSetUrls(srcSetUrls) {
            const rawPairs = srcSetUrls.split(`,`);
            const pairs = rawPairs.map(rawPair => {
                const pair = rawPair.trim().split(/\s+/);
                if (pair.length === 1)
                    pair.push("");
                return pair;
            });
            for (const pair of pairs) {
                const [url] = pair;
                pair[0] = this.resolvePlainUrl(url);
            }
            return pairs.map(pair => pair.join(" ")).join(`, `);
        }
    }
    HtmlFeed.ForeignDocumentSanitizer = ForeignDocumentSanitizer;
    /** */
    const urlProperties = new Set([
        "background",
        "background-image",
        "border-image",
        "border-image-source",
        "list-style",
        "list-style-image",
        "mask",
        "mask-image",
        "-webkit-mask",
        "-webkit-mask-image",
        "content"
    ]);
})(HtmlFeed || (HtmlFeed = {}));
var HtmlFeed;
(function (HtmlFeed) {
    /**
     * A library which operates over the browser-supplied history.pushState()
     * methods. This library allows the usage of the browser's back and forward
     * buttons to be independently tracked. All history manipulation in the app
     * should pass through this layer rather than using the history.* methods
     * directly.
     */
    let History;
    (function (History) {
        /** */
        function back() {
            if (stackPosition < 0)
                return;
            disableEvents(() => {
                history.back();
                stackPosition--;
            });
        }
        History.back = back;
        /** */
        function forward() {
            if (stackPosition >= stack.length)
                return;
            disableEvents(() => {
                history.forward();
                stackPosition++;
            });
        }
        History.forward = forward;
        /** */
        function push(slug) {
            stack.length = stackPosition + 1;
            stackPosition = stack.length;
            const entry = { slug, stackPosition };
            stack.push(entry);
            history.pushState(entry, "", slug);
        }
        History.push = push;
        /** */
        function disableEvents(callback) {
            if (History.triggerProgrammaticEvents)
                disconnectHandler();
            try {
                callback();
            }
            catch (e) { }
            finally {
                maybeConnectHandler();
            }
        }
        /**
         * Indicates whether programmatic calls to history.back and history.forward()
         * should result in the back and forward events being triggered.
         */
        History.triggerProgrammaticEvents = false;
        /**
         * Installs an event handler that invokes when the
         * user presses either the back or forward button.
         */
        function on(event, fn) {
            maybeConnectHandler();
            event === "back" ?
                backHandlers.push(fn) :
                forwardHandlers.push(fn);
        }
        History.on = on;
        /** */
        function maybeConnectHandler() {
            if (!hasConnectedHandler) {
                window.addEventListener("popstate", handler);
                hasConnectedHandler = true;
            }
        }
        /** */
        function disconnectHandler() {
            window.removeEventListener("popstate", handler);
            hasConnectedHandler = false;
        }
        let hasConnectedHandler = false;
        /** */
        function handler(ev) {
            setTimeout(() => {
                const state = history.state;
                const newStackPosition = state?.stackPosition || -1;
                const handlers = newStackPosition > stackPosition ?
                    forwardHandlers :
                    backHandlers;
                for (const handler of handlers)
                    handler(ev);
            });
        }
        const backHandlers = [];
        const forwardHandlers = [];
        const stack = [];
        let stackPosition = -1;
    })(History = HtmlFeed.History || (HtmlFeed.History = {}));
})(HtmlFeed || (HtmlFeed = {}));
var HtmlFeed;
(function (HtmlFeed) {
    /**
     * Returns an Omniview class that gets populated with the
     * posters from the specified URLs.
     */
    function getOmniviewFromFeed(urls, omniviewOptions) {
        if (typeof Omniview === "undefined")
            throw new Error("Omniview library not found.");
        const hot = new Hot();
        const defaultOptions = {
            getPoster: index => {
                if (index >= urls.length)
                    return null;
                return new Promise(async (resolve) => {
                    const poster = await HtmlFeed.getPosterFromUrl(urls[index]);
                    resolve(poster || HtmlFeed.getErrorPoster());
                });
            },
            fillBody: async (fillElement, selectedElement, index) => {
                const url = urls[index];
                const reel = await HtmlFeed.getPageFromUrl(url);
                if (!reel)
                    return selectedElement.append(HtmlFeed.getErrorPoster());
                fillElement.append(HtmlFeed.getSandboxedElement([...reel.head, ...reel.sections], reel.url));
            }
        };
        const mergedOptions = Object.assign(omniviewOptions, defaultOptions);
        const omniview = new Omniview.Class(mergedOptions);
        hot.get(omniview)(hot.on("connected", () => omniview.gotoPosters()));
        return omniview;
    }
    HtmlFeed.getOmniviewFromFeed = getOmniviewFromFeed;
})(HtmlFeed || (HtmlFeed = {}));
var HtmlFeed;
(function (HtmlFeed) {
    /**
     * Returns an array of remote <section> elements that exist underneath
     * the specified container element. Defaults to the <body> element in the
     * current document if the container argument is omitted.
     */
    function getRemoteSectionElements(container = document.body) {
        return HtmlFeed.getElements("SECTION[src], SECTION[data-src]", container);
    }
    HtmlFeed.getRemoteSectionElements = getRemoteSectionElements;
    /**
     * Returns a fully-qualified version of the URI specified as the source
     * of the content in a <section> element.
     */
    function getRemoteSectionSource(section, documentUrl = HtmlFeed.Url.getCurrent()) {
        const src = section.getAttribute("src") || section.getAttribute("data-src") || "";
        return src ? HtmlFeed.Url.resolve(src, documentUrl) : "";
    }
    HtmlFeed.getRemoteSectionSource = getRemoteSectionSource;
    /**
     * Loads the content of any remote <section> elements
     * defined within the specified container element.
     */
    async function resolveRemoteSections(container = document, documentUrl = HtmlFeed.Url.getCurrent()) {
        const remoteSections = HtmlFeed.getRemoteSectionElements(container);
        for (const remoteSection of remoteSections) {
            block: {
                const remoteUrl = HtmlFeed.getRemoteSectionSource(remoteSection, documentUrl);
                if (!remoteUrl)
                    break block;
                const poster = await HtmlFeed.getPosterFromUrl(remoteUrl);
                if (!poster)
                    break block;
                remoteSection.replaceWith(poster);
                continue;
            }
            remoteSection.remove();
        }
    }
    HtmlFeed.resolveRemoteSections = resolveRemoteSections;
})(HtmlFeed || (HtmlFeed = {}));
var HtmlFeed;
(function (HtmlFeed) {
    /**
     * Main entry point for when the reals.js script is
     * embedded within a web page.
     */
    if (typeof document !== "undefined" &&
        typeof window !== "undefined" &&
        document.readyState !== "complete") {
        window.addEventListener("DOMContentLoaded", () => startup());
    }
    /** */
    async function startup() {
        HtmlFeed.resolveRemoteSections();
        let last = document.querySelector("BODY > SECTION:last-of-type");
        if (!(last instanceof HTMLElement))
            return;
        const feedInfos = HtmlFeed.getFeedsFromDocument();
        for (const feedInfo of feedInfos) {
            if (!feedInfo.visible)
                continue;
            const urls = await HtmlFeed.getFeedUrls(feedInfo.href);
            if (!urls)
                continue;
            const omniview = HtmlFeed.getEmbeddedOmniviewFromFeed(urls);
            last.insertAdjacentElement("afterend", omniview);
            last = omniview;
        }
    }
    typeof module === "object" && Object.assign(module.exports, { HtmlFeed });
})(HtmlFeed || (HtmlFeed = {}));
var HtmlFeed;
(function (HtmlFeed) {
    /**
     * A namespace of functions that perform URL manipulation.
     */
    let Url;
    (function (Url) {
        /**
         * Returns the URL of the containing folder of the specified URL.
         * The provided URL must be valid, or an exception will be thrown.
         */
        function folderOf(url) {
            const lo = new URL(url);
            const parts = lo.pathname.split("/").filter(s => !!s);
            const last = parts[parts.length - 1];
            if (/\.[a-z0-9]+$/i.test(last))
                parts.pop();
            const path = parts.join("/") + "/";
            return resolve(path, lo.protocol + "//" + lo.host);
        }
        Url.folderOf = folderOf;
        /**
         * Returns the URL provided in fully qualified form,
         * using the specified base URL.
         */
        function resolve(path, base) {
            if (/^[a-z]+:/.test(path))
                return path;
            try {
                if (!base.endsWith("/"))
                    base += "/";
                return new URL(path, base).toString();
            }
            catch (e) {
                debugger;
                return null;
            }
        }
        Url.resolve = resolve;
        /**
         * Gets the base URL of the document loaded into the current browser window.
         * Accounts for any HTML <base> tags that may be defined within the document.
         */
        function getCurrent() {
            if (storedUrl)
                return storedUrl;
            let url = Url.folderOf(document.URL);
            const base = document.querySelector("base[href]");
            if (base) {
                const href = base.getAttribute("href") || "";
                if (href)
                    url = Url.resolve(href, url);
            }
            return storedUrl = url;
        }
        Url.getCurrent = getCurrent;
        let storedUrl = "";
    })(Url = HtmlFeed.Url || (HtmlFeed.Url = {}));
})(HtmlFeed || (HtmlFeed = {}));
var HtmlFeed;
(function (HtmlFeed) {
    //# Pages
    /**
     * Organizes the specified element or elements into the
     * shadow root of a newly created <div> element.
     */
    function getSandboxedElement(contents, baseUrl) {
        const container = document.createElement("div");
        const head = [HtmlFeed.getStandardCss()];
        const body = [];
        const shadow = container.attachShadow({ mode: "open" });
        for (const element of Array.isArray(contents) ? contents : [contents]) {
            const n = element.nodeName;
            if (n === "SECTION")
                body.push(element);
            else if (n === "LINK" || n === "STYLE")
                head.push(element);
        }
        shadow.append(...head, ...body);
        baseUrl = HtmlFeed.Url.folderOf(baseUrl);
        convertEmbeddedUrlsToAbsolute(shadow, baseUrl);
        return container;
    }
    HtmlFeed.getSandboxedElement = getSandboxedElement;
    /**
     *
     */
    function convertEmbeddedUrlsToAbsolute(parent, baseUrl) {
        const elements = getElements(selectorForUrls, parent);
        if (parent instanceof HTMLElement)
            elements.unshift(parent);
        for (const element of elements) {
            const attrs = attrsWithUrls
                .map(a => element.getAttributeNode(a))
                .filter((a) => !!a);
            for (const attribute of attrs)
                attribute.value = HtmlFeed.Url.resolve(attribute.value, baseUrl);
            for (const p of cssPropertiesWithUrls) {
                let pv = element.style.getPropertyValue(p);
                if (pv === "")
                    continue;
                pv = pv.replace(/\burl\(".+?"\)/, substr => {
                    const unwrapUrl = substr.slice(5, -2);
                    const url = HtmlFeed.Url.resolve(unwrapUrl, baseUrl);
                    return `url("${url}")`;
                });
                element.style.setProperty(p, pv);
            }
        }
    }
    const attrsWithUrls = ["href", "src", "action", "data-src"];
    const selectorForUrls = "LINK[href], A[href], IMG[src], FORM[action], SCRIPT[src], [style]";
    const cssPropertiesWithUrls = [
        "background",
        "background-image",
        "border-image",
        "border-image-source",
        "content",
        "cursor",
        "list-style-image",
        "mask",
        "mask-image",
        "offset-path",
        "src",
    ];
    /**
     * Reads an HTML page from the specified URL, and returns an
     * object that contains the relevant content.
     */
    async function getPageFromUrl(url) {
        const baseUrl = HtmlFeed.Url.folderOf(url);
        const doc = await getDocumentFromUrl(url);
        if (!doc)
            return null;
        const sections = getElements("BODY > SECTION", doc);
        const feeds = getFeedsFromDocument(doc);
        const feedsUrls = feeds.map(f => f.href);
        const head = getElements("LINK, STYLE", doc.head)
            .filter(e => !feedsUrls.includes(e.getAttribute("href") || ""));
        for (const element of [...head, ...sections])
            convertEmbeddedUrlsToAbsolute(element, baseUrl);
        return {
            url,
            document: doc,
            head,
            feeds,
            sections,
        };
    }
    HtmlFeed.getPageFromUrl = getPageFromUrl;
    /**
     * Scans a document for <link> tags that refer to feeds of HTML HtmlFeed.
     */
    function getFeedsFromDocument(doc = document) {
        const feeds = [];
        const fe = getElements("LINK[rel=feed]", doc);
        for (const e of fe) {
            const href = e.getAttribute("href");
            if (!href)
                continue;
            const visibleAttr = e.getAttribute("disabled")?.toLowerCase();
            const visible = typeof visibleAttr === "string" && visibleAttr !== "false";
            const subscribableAttr = e.getAttribute("type")?.toLowerCase();
            const subscribable = subscribableAttr === "text/feed";
            feeds.push({ visible, subscribable, href });
        }
        return feeds;
    }
    HtmlFeed.getFeedsFromDocument = getFeedsFromDocument;
    /**
     * Reads a DOM Document object stored at the specified URL,
     * and returns a sanitized version of it.
     */
    async function getDocumentFromUrl(url) {
        const result = await getHttpContent(url);
        if (!result)
            return null;
        const docUri = HtmlFeed.Url.folderOf(url);
        const sanitizer = new HtmlFeed.ForeignDocumentSanitizer(result.text, docUri);
        return sanitizer.read();
    }
    HtmlFeed.getDocumentFromUrl = getDocumentFromUrl;
    //# Feeds
    /**
     * Returns a fully-qualified version of a feed URL defined within the specified
     * Node. If the within argument is omitted, the current document is used.
     */
    function getFeedUrl(within = document) {
        const link = within.querySelector(`LINK[rel="feed"][href]`);
        const href = link instanceof HTMLElement ? link.getAttribute("href") : "";
        return href ? HtmlFeed.Url.resolve(href, HtmlFeed.Url.getCurrent()) : "";
    }
    HtmlFeed.getFeedUrl = getFeedUrl;
    /**
     * Reads the URLs defined in the feed file located at the specified
     * URL. The function accepts a startingByte argument to allow for
     * partial downloads containing only the new content in the feed.
     */
    async function getFeedUrls(feedUrl) {
        const urls = [];
        const fetchResult = await getHttpContent(feedUrl);
        if (!fetchResult)
            return null;
        let bytesRead = -1;
        const type = (fetchResult.headers.get("Content-Type") || "").split(";")[0];
        if (type !== "text/plain") {
            console.error("Feed at URL: " + feedUrl + "was returned with an incorrect " +
                "mime type. Expected mime type is \"text/plain\", but the mime type \"" +
                type + "\" was returned.");
            return null;
        }
        else {
            urls.push(...fetchResult.text
                .split("\n")
                .map(s => s.trim())
                .filter(s => !!s)
                .filter(s => !s.startsWith("#"))
                .map(s => HtmlFeed.Url.resolve(s, HtmlFeed.Url.folderOf(feedUrl))));
            bytesRead = fetchResult.text.length || 0;
        }
        return urls;
    }
    HtmlFeed.getFeedUrls = getFeedUrls;
    /**
     * Finds the meta data associated with the feed at the specified URL.
     * The algorithm used is a upscan of the folder structure of the specified URL,
     * starting at it's base directory, and scanning upwards until the root
     * domain is reached.
     */
    async function getFeedMetaData(feedUrl) {
        let currentUrl = HtmlFeed.Url.folderOf(feedUrl);
        let author = "";
        let description = "";
        let icon = "";
        for (let safety = 1000; safety-- > 0;) {
            const httpContent = await HtmlFeed.getHttpContent(currentUrl, "quiet");
            if (httpContent) {
                const htmlContent = httpContent.text;
                const reader = new HtmlFeed.ForeignDocumentReader(htmlContent);
                reader.trapElement(element => {
                    if (element.nodeName === "META") {
                        const name = element.getAttribute("name")?.toLowerCase();
                        if (name === "description")
                            description = element.getAttribute("content") || "";
                        else if (name === "author")
                            author = element.getAttribute("content") || "";
                    }
                    else if (element.nodeName === "LINK") {
                        const rel = element.getAttribute("rel")?.toLowerCase();
                        if (rel === "icon")
                            icon = element.getAttribute("href") || "";
                    }
                });
                reader.read();
                if (author || description || icon)
                    break;
            }
            const url = new URL("..", currentUrl);
            if (currentUrl === url.toString())
                break;
            currentUrl = url.toString();
        }
        return { url: feedUrl, author, description, icon };
    }
    HtmlFeed.getFeedMetaData = getFeedMetaData;
    /**
     * Reads the poster <section> stored in the page at the specified URL.
     */
    async function getPosterFromUrl(pageUrl) {
        const page = await getPageFromUrl(pageUrl);
        return page?.sections.length ?
            HtmlFeed.getSandboxedElement([...page.head, page.sections[0]], page.url) :
            null;
    }
    HtmlFeed.getPosterFromUrl = getPosterFromUrl;
    /**
     * Reads posters from a feed text file located at the specified URL.
     *
     * @returns An async generator function that iterates through
     * every page specified in the specified feed URL, and returns
     * the poster associated with each page.
     */
    async function* getPostersFromFeed(feedUrl) {
        const urls = await HtmlFeed.getFeedUrls(feedUrl);
        if (!urls)
            return;
        for (const url of urls) {
            const page = await HtmlFeed.getPageFromUrl(url);
            const poster = page?.sections.length ?
                HtmlFeed.getSandboxedElement([...page.head, page.sections[0]], page.url) :
                null;
            if (poster)
                yield { poster, url };
        }
    }
    HtmlFeed.getPostersFromFeed = getPostersFromFeed;
    /**
     * Returns an Omniview that is automatically populated with the
     * posters from the specified URLs. The Omniview is wrapped inside
     * and element that makes the Omniview suitable for embedding on
     * a public website.
     */
    function getEmbeddedOmniviewFromFeed(urls, omniviewOptions = {}) {
        if (typeof Omniview === "undefined")
            throw new Error("Omniview library not found.");
        const hot = new Hot();
        const omniview = HtmlFeed.getOmniviewFromFeed(urls, omniviewOptions);
        const out = hot.div("omniview-container", {
            position: "relative",
            scrollSnapAlign: "start",
            scrollSnapStop: "always",
            minHeight: "200vh",
        }, 
        // This overrides the "position: fixed" setting which is the
        // default for an omniview. The omniview's default fixed
        // setting does seem a bit broken. Further investigation
        // is needed to determine if this is appropriate.
        hot.get(omniview)({ position: "relative" }), 
        // Places an extra div at the bottom of the posters list
        // so that scroll-snapping works better.
        hot.div({
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            scrollSnapAlign: "end",
            scrollSnapStop: "always",
        }));
        const head = omniview.head;
        let lastY = -1;
        let lastDirection = 0;
        window.addEventListener("scroll", () => window.requestAnimationFrame(() => {
            if (omniview.mode !== 1 /* Omniview.OmniviewMode.posters */)
                return;
            const y = window.scrollY;
            if (y === lastY)
                return;
            const direction = y > lastY ? 1 : -1;
            let omniviewVisible = head.getBoundingClientRect().top <= 0;
            if (omniviewVisible) {
                if (direction === 1)
                    omniview.scrollingAncestor.style.scrollSnapType = "none";
                else if (direction === -1 && lastDirection === 1)
                    omniview.scrollingAncestor.style.removeProperty("scroll-snap-type");
            }
            lastDirection = direction;
            lastY = y;
            // Expand the size of the omniview container, in order to push the
            // footer snapper div downward so that it aligns with the bottom
            // of the omniview posters.
            const rows = Math.ceil(omniview.posterCount / omniview.size);
            const vh = rows * (100 / omniview.size);
            out.style.minHeight = vh + "vh";
        }));
        return out;
    }
    HtmlFeed.getEmbeddedOmniviewFromFeed = getEmbeddedOmniviewFromFeed;
    /**
     * Renders a placeholder poster for when the item couldn't be loaded.
     */
    function getErrorPoster() {
        const div = document.createElement("div");
        const s = div.style;
        s.position = "absolute";
        s.top = "0";
        s.right = "0";
        s.bottom = "0";
        s.left = "0";
        s.width = "fit-content";
        s.height = "fit-content";
        s.margin = "auto";
        s.fontSize = "20vw";
        s.fontWeight = "900";
        div.append(new Text("✕"));
        return div;
    }
    HtmlFeed.getErrorPoster = getErrorPoster;
    //# Generic
    /**
     * Makes an HTTP request to the specified URI and returns
     * the headers and a string containing the body.
     */
    async function getHttpContent(relativeUri, quiet) {
        relativeUri = HtmlFeed.Url.resolve(relativeUri, HtmlFeed.Url.getCurrent());
        try {
            const headers = {
            //"pragma": "no-cache",
            //"cache-control": "no-cache",
            };
            const fetchResult = await window.fetch(relativeUri, {
                method: "GET",
                headers,
                mode: "cors",
            });
            if (!fetchResult.ok) {
                console.error("Fetch failed: " + relativeUri);
                return null;
            }
            let text = "";
            try {
                text = await fetchResult.text();
            }
            catch (e) {
                if (!quiet)
                    console.error("Fetch failed: " + relativeUri);
                return null;
            }
            return {
                headers: fetchResult.headers,
                text,
            };
        }
        catch (e) {
            if (!quiet)
                console.log("Error with request: " + relativeUri);
            return null;
        }
    }
    HtmlFeed.getHttpContent = getHttpContent;
    /**
     * Returns an array of HTMLElement objects that match the specified selector,
     * optionally within the specified parent node.
     */
    function getElements(selector, container = document) {
        return Array.from(container.querySelectorAll(selector));
    }
    HtmlFeed.getElements = getElements;
})(HtmlFeed || (HtmlFeed = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHRtbGZlZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9jb3JlL0VmZmVjdHMudHMiLCIuLi9jb3JlL0ZvcmVpZ25Eb2N1bWVudFJlYWRlci50cyIsIi4uL2NvcmUvRm9yZWlnbkRvY3VtZW50U2FuaXRpemVyLnRzIiwiLi4vY29yZS9IaXN0b3J5LnRzIiwiLi4vY29yZS9PbW5pdmlldy50cyIsIi4uL2NvcmUvUmVtb3RlLnRzIiwiLi4vY29yZS9TdGFydHVwLnRzIiwiLi4vY29yZS9VcmwudHMiLCIuLi9jb3JlL1V0aWxpdGllcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0EsSUFBVSxRQUFRLENBc1RqQjtBQXRURCxXQUFVLFFBQVE7SUFFakI7OztPQUdHO0lBQ0gsSUFBWSxlQTJCWDtJQTNCRCxXQUFZLGVBQWU7UUFFMUI7Ozs7V0FJRztRQUNILGtDQUFlLENBQUE7UUFFZjs7O1dBR0c7UUFDSCxvQ0FBaUIsQ0FBQTtRQUVqQjs7V0FFRztRQUNILG9DQUFpQixDQUFBO1FBRWpCOzs7OztXQUtHO1FBQ0gsa0NBQWUsQ0FBQTtJQUNoQixDQUFDLEVBM0JXLGVBQWUsR0FBZix3QkFBZSxLQUFmLHdCQUFlLFFBMkIxQjtJQUVZLG9CQUFXLEdBQUc7V0FDakIsZUFBZSxDQUFDLElBQUk7Ozs7aUJBSWQsZUFBZSxDQUFDLElBQUk7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O1lBMEJ6QixlQUFlLENBQUMsSUFBSTs7Ozs7WUFLcEIsZUFBZSxDQUFDLElBQUk7Ozs7Ozs7Ozs7O0tBVzNCLGVBQWUsQ0FBQyxLQUFLOzs7Ozs7OztLQVFyQixlQUFlLENBQUMsS0FBSzs7Ozs7OztLQU9yQixlQUFlLENBQUMsS0FBSyxNQUFNLGVBQWUsQ0FBQyxLQUFLOzs7Ozs7OztFQVFuRCxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFM0IsWUFBWTtJQUNaLElBQUksT0FBTyxRQUFRLEtBQUssV0FBVztRQUFFLE9BQU87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dCI6WyJcbm5hbWVzcGFjZSBIdG1sRmVlZFxue1xuXHQvKipcblx0ICogQW4gZW51bWVyYXRpb24gdGhhdCBkZWZpbmVzIHRoZSBDU1MgY2xhc3NlcyB0aGF0IGFyZSB1c2VkXG5cdCAqIHRvIGNvbnRyb2wgdGhlIGJlaGF2aW9yIG9mIGEgcmVlbC5cblx0ICovXG5cdGV4cG9ydCBlbnVtIFN0YW5kYXJkQ2xhc3Nlc1xuXHR7XG5cdFx0LyoqXG5cdFx0ICogQXBwbGllZCB0byBhbiBIVE1MIGNvbnRhaW5lciBlbGVtZW50IHRoYXQgaXMgaW50ZW5kZWQgdG9cblx0XHQgKiBvcGVyYXRlIGFzIGEgdG9wLWxldmVsIHNjZW5lLWNvbnRhaW5pbmcgZWxlbWVudCwgYnV0IGlzIG5vdFxuXHRcdCAqIGEgPGJvZHk+IHRhZy5cblx0XHQgKi9cblx0XHRib2R5ID0gXCItLWJvZHlcIixcblx0XHRcblx0XHQvKipcblx0XHQgKiBBcHBsaWVkIHRvIGEgPHNlY3Rpb24+IHRvIGluZGljYXRlIHRoYXQgaXQgc2F5cyBmaXhlZCBpbiBwbGFjZVxuXHRcdCAqIGR1cmluZyBpdCdzIHZpc2libGl0eSBsaWZlY3ljbGUsIHJhdGhlciB0aGFuIHNjcm9sbGluZyB3aXRoIHRoZSBwYWdlLlxuXHRcdCAqL1xuXHRcdGZpeGVkID0gXCItLWZpeGVkXCIsXG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQXBwbGllZCB0byB0aGUgZWxlbWVudCBcblx0XHQgKi9cblx0XHRzdHJpcCA9IFwiLS1zdHJpcFwiLFxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEFwcGxpZWQgdG8gYSA8c2VjdGlvbj4gdG8gaW5kaWNhdGUgdGhhdCB0aGUgc2NlbmUgaXMgbG9uZ2VyIHRoYW5cblx0XHQgKiBhIGZ1bGwgc2NyZWVuIG9mIGhlaWdodC4gU2NlbmVzIHdpdGggdGhpcyBjbGFzcyBhcmUgYXQgbGVhc3QgMjAwdmhcblx0XHQgKiBpbiBoZWlnaHQgKHdoaWNoIGlzIG5lY2Vzc2FyeSBpbiBvcmRlciB0byBhdm9pZCB0aGUgdW5kZXNpcmFibGVcblx0XHQgKiBzY3JvbGwtc25hcCByZWxhdGVkIGp1bXBpbmcgYmVoYXZpb3IgdGhhdCBleGlzdHMgaW4gYnJvd3NlcnMpXG5cdFx0ICovXG5cdFx0bG9uZyA9IFwiLS1sb25nXCIsXG5cdH1cblx0XG5cdGV4cG9ydCBjb25zdCBzdGFuZGFyZENzcyA9IGBcblx0XHRIVE1MLCAuJHtTdGFuZGFyZENsYXNzZXMuYm9keX1cblx0XHR7XG5cdFx0XHRzY3JvbGwtc25hcC10eXBlOiB5IG1hbmRhdG9yeTtcblx0XHR9XG5cdFx0SFRNTCwgQk9EWSwgLiR7U3RhbmRhcmRDbGFzc2VzLmJvZHl9XG5cdFx0e1xuXHRcdFx0bWFyZ2luOiAwO1xuXHRcdFx0cGFkZGluZzogMDtcblx0XHRcdGhlaWdodDogMTAwJTtcblx0XHR9XG5cdFx0SFRNTFxuXHRcdHtcblx0XHRcdG92ZXJmbG93LXk6IGF1dG87XG5cdFx0XHRoZWlnaHQ6IDEwMCU7XG5cdFx0fVxuXHRcdFNFQ1RJT05cblx0XHR7XG5cdFx0XHRwb3NpdGlvbjogcmVsYXRpdmU7XG5cdFx0XHRzY3JvbGwtc25hcC1hbGlnbjogc3RhcnQ7XG5cdFx0XHRzY3JvbGwtc25hcC1zdG9wOiBhbHdheXM7XG5cdFx0XHRoZWlnaHQ6IDEwMCU7XG5cdFx0fVxuXHRcdFtpZio9XCIwLjJcIl0gU0VDVElPTltzcmNdLCBTRUNUSU9OW2RhdGEtc3JjXVxuXHRcdHtcblx0XHRcdGJhY2tncm91bmQtY29sb3I6IGJsYWNrICFpbXBvcnRhbnQ7XG5cdFx0fVxuXHRcdFNFQ1RJT05bc3JjXSAqLCBTRUNUSU9OW2RhdGEtc3JjXSAqXG5cdFx0e1xuXHRcdFx0ZGlzcGxheTogbm9uZSAhaW1wb3J0YW50O1xuXHRcdH1cblx0XHRTRUNUSU9OLiR7U3RhbmRhcmRDbGFzc2VzLmxvbmd9XG5cdFx0e1xuXHRcdFx0aGVpZ2h0OiBhdXRvO1xuXHRcdFx0bWluLWhlaWdodDogMjAwLjF2aDtcblx0XHR9XG5cdFx0U0VDVElPTi4ke1N0YW5kYXJkQ2xhc3Nlcy5sb25nfTo6YWZ0ZXJcblx0XHR7XG5cdFx0XHRjb250ZW50OiBcIlwiO1xuXHRcdFx0cG9zaXRpb246IGFic29sdXRlO1xuXHRcdFx0bGVmdDogMDtcblx0XHRcdHJpZ2h0OiAwO1xuXHRcdFx0Ym90dG9tOiAwO1xuXHRcdFx0aGVpZ2h0OiAwO1xuXHRcdFx0dmlzaWJpbGl0eTogaGlkZGVuO1xuXHRcdFx0c2Nyb2xsLXNuYXAtYWxpZ246IGVuZDtcblx0XHR9XG5cdFx0LiR7U3RhbmRhcmRDbGFzc2VzLnN0cmlwfVxuXHRcdHtcblx0XHRcdHBvc2l0aW9uOiBmaXhlZCAhaW1wb3J0YW50O1xuXHRcdFx0dG9wOiAwICFpbXBvcnRhbnQ7XG5cdFx0XHRsZWZ0OiAwICFpbXBvcnRhbnQ7XG5cdFx0XHR3aWR0aDogMCAhaW1wb3J0YW50O1xuXHRcdFx0aGVpZ2h0OiAxMDAlICFpbXBvcnRhbnQ7XG5cdFx0fVxuXHRcdC4ke1N0YW5kYXJkQ2xhc3Nlcy5maXhlZH1cblx0XHR7XG5cdFx0XHR3aWR0aDogMTAwdnc7XG5cdFx0XHRoZWlnaHQ6IDEwMHZoO1xuXHRcdFx0aGVpZ2h0OiAxMDBkdmg7XG5cdFx0XHRwb3NpdGlvbjogcmVsYXRpdmU7XG5cdFx0fVxuXHRcdC4ke1N0YW5kYXJkQ2xhc3Nlcy5zdHJpcH0sIC4ke1N0YW5kYXJkQ2xhc3Nlcy5maXhlZH1cblx0XHR7XG5cdFx0XHRiYWNrZ3JvdW5kLWNvbG9yOiBpbmhlcml0O1xuXHRcdH1cblx0XHRTRUNUSU9OW3NyY10sIFNFQ1RJT05bZGF0YS1zcmNdXG5cdFx0e1xuXHRcdFx0ZGlzcGxheTogbm9uZTtcblx0XHR9XG5cdGAucmVwbGFjZSgvW1xcclxcblxcdF0vZywgXCJcIik7XG5cdFxuXHQvL0B0cy1pZ25vcmVcblx0aWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuO1xuXHRcblx0LyoqXG5cdCAqIFJldHVybnMgdGhlIHN0YW5kYXJkIFJlZWwgQ1NTIGVtYmVkZGVkIHdpdGhpbiBhIDxzdHlsZT4gZWxlbWVudC5cblx0ICogVGhpcyA8c3R5bGU+IGVsZW1lbnQgc2hvdWxkIGJlIGluc2VydGVkIHNvbWV3aGVyZSBpbnRvIHRoZSBkb2N1bWVudFxuXHQgKiBpbiBvcmRlciBmb3IgaXQgdG8gXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gZ2V0U3RhbmRhcmRDc3MoKVxuXHR7XG5cdFx0Y29uc3Qgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG5cdFx0c3R5bGUudGV4dENvbnRlbnQgPSBzdGFuZGFyZENzcztcblx0XHRyZXR1cm4gc3R5bGU7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBSZWdpc3RlcnMgYSBwYXJ0aWN1bGFyIG5vZGUgYXMgdGhlIHJvb3QgRE9NIE5vZGUgdGhhdCBcblx0ICogZGlyZWN0bHkgY29udGFpbnMgdGhlIHNlY3Rpb25zIHRvIGluY2x1ZGUgaW4gYSByZWVsLlxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyUm9vdChyb290OiBOb2RlKVxuXHR7XG5cdFx0bmV3IE11dGF0aW9uT2JzZXJ2ZXIocmVjb3JkcyA9PlxuXHRcdHtcblx0XHRcdGZvciAoY29uc3QgcmVjIG9mIHJlY29yZHMpXG5cdFx0XHRcdGFkanVzdE5vZGVzKHJlYy5hZGRlZE5vZGVzKVxuXHRcdFx0XG5cdFx0fSkub2JzZXJ2ZShyb290LCB7IGNoaWxkTGlzdDogdHJ1ZSB9KTtcblx0XHRcblx0XHRhZGp1c3ROb2Rlcyhyb290LmNoaWxkTm9kZXMpO1xuXHR9XG5cdFxuXHQvKiogKi9cblx0ZnVuY3Rpb24gYWRqdXN0Tm9kZXMobm9kZXM6IE5vZGVMaXN0KVxuXHR7XG5cdFx0Zm9yIChjb25zdCBub2RlIG9mIEFycmF5LmZyb20obm9kZXMpKVxuXHRcdHtcblx0XHRcdGlmIChub2RlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQgJiYgbm9kZS5ub2RlTmFtZSA9PT0gXCJTRUNUSU9OXCIpXG5cdFx0XHR7XG5cdFx0XHRcdGlvLm9ic2VydmUobm9kZSk7XG5cdFx0XHRcdGlmIChub2RlLmNsYXNzTGlzdC5jb250YWlucyhTdGFuZGFyZENsYXNzZXMuZml4ZWQpKVxuXHRcdFx0XHRcdHRvRml4ZWQobm9kZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8vY2FwdHVyZVRyaWdnZXJDbGFzc2VzKCk7XG5cdFx0Y2FwdHVyZVJhbmdlcyhkb2N1bWVudC5ib2R5KTtcblx0fVxuXHRcblx0LyoqICovXG5cdGZ1bmN0aW9uIHRvRml4ZWQoc2VjdGlvbjogSFRNTEVsZW1lbnQpXG5cdHtcblx0XHRjb25zdCBzdHJpcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG5cdFx0c3RyaXAuY2xhc3NMaXN0LmFkZChTdGFuZGFyZENsYXNzZXMuc3RyaXApO1xuXHRcdFxuXHRcdGNvbnN0IGZpeGVkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcblx0XHRmaXhlZC5jbGFzc0xpc3QuYWRkKFN0YW5kYXJkQ2xhc3Nlcy5maXhlZCk7XG5cdFx0XG5cdFx0Zml4ZWQuYXBwZW5kKC4uLkFycmF5LmZyb20oc2VjdGlvbi5jaGlsZE5vZGVzKSk7XG5cdFx0c3RyaXAuYXBwZW5kKGZpeGVkKTtcblx0XHRzZWN0aW9uLmFwcGVuZChzdHJpcCk7XG5cdH1cblx0XG5cdC8vIyBSYW5nZXNcblx0XG5cdC8qKiAqL1xuXHRmdW5jdGlvbiBjYXB0dXJlUmFuZ2VzKGNvbnRhaW5lcjogUGFyZW50Tm9kZSlcblx0e1xuXHRcdGZvciAoY29uc3QgcnVsZSBvZiBlYWNoQ3NzUnVsZShjb250YWluZXIpKVxuXHRcdHtcblx0XHRcdGNvbnN0IG1hdGNoZXMgPSBydWxlLnNlbGVjdG9yVGV4dC5tYXRjaChyZWcpO1xuXHRcdFx0Zm9yIChjb25zdCBtYXRjaCBvZiBtYXRjaGVzIHx8IFtdKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBwYXJ0cyA9IG1hdGNoXG5cdFx0XHRcdFx0LnJlcGxhY2UoL1teXFwuLFxcZF0vZywgXCJcIilcblx0XHRcdFx0XHQuc3BsaXQoYCxgKTtcblx0XHRcdFx0XG5cdFx0XHRcdGxldCBsb3cgPSBwYXJ0c1swXSA9PT0gXCJcIiA/IC0xIDogTnVtYmVyKHBhcnRzWzBdKSB8fCAtMTtcblx0XHRcdFx0bGV0IGhpZ2ggPSBwYXJ0c1sxXSA9PT0gXCJcIiA/IDEgOiBOdW1iZXIocGFydHNbMV0pIHx8IDE7XG5cdFx0XHRcdFxuXHRcdFx0XHRsb3cgPSBNYXRoLm1heCgtMSwgTWF0aC5taW4oMSwgbG93KSk7XG5cdFx0XHRcdGhpZ2ggPSBNYXRoLm1pbigxLCBNYXRoLm1heCgtMSwgaGlnaCkpO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKGhpZ2ggPCBsb3cpXG5cdFx0XHRcdFx0bG93ID0gaGlnaDtcblx0XHRcdFx0XG5cdFx0XHRcdHJhbmdlUGFpcnMuc2V0KGxvdyArIGAsYCArIGhpZ2gsIFtsb3csIGhpZ2hdKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblx0XG5cdGNvbnN0IHJlZyA9IC9cXFtcXHMqaWZcXHMqfj0oXCJ8JyktPygxfDB8MFxcLlxcZCspLFxcLT8oMXwwfDBcXC5cXGQrKShcInwnKV0vZztcblx0Y29uc3QgcmFuZ2VQYWlycyA9IG5ldyBNYXA8c3RyaW5nLCBbbnVtYmVyLCBudW1iZXJdPigpO1xuXHRcblx0LyoqICovXG5cdGZ1bmN0aW9uICogZWFjaENzc1J1bGUoY29udGFpbmVyOiBQYXJlbnROb2RlKVxuXHR7XG5cdFx0Y29uc3Qgc2hlZXRDb250YWluZXJzID0gW1xuXHRcdFx0Li4uQXJyYXkuZnJvbShjb250YWluZXIucXVlcnlTZWxlY3RvckFsbChcIlNUWUxFXCIpKSBhcyBIVE1MU3R5bGVFbGVtZW50W10sXG5cdFx0XHQuLi5BcnJheS5mcm9tKGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKFwiTElOS1wiKSkgYXMgSFRNTExpbmtFbGVtZW50W10sXG5cdFx0XTtcblx0XHRcblx0XHRjb25zdCBzaGVldHMgPSBzaGVldENvbnRhaW5lcnNcblx0XHRcdC5maWx0ZXIoZSA9PiAhcHJvY2Vzc2VkU2hlZXRDb250YWluZXJzLmhhcyhlKSlcblx0XHRcdC5tYXAoZSA9PiBlLnNoZWV0KVxuXHRcdFx0LmZpbHRlcigoc2gpOiBzaCBpcyBDU1NTdHlsZVNoZWV0ID0+ICEhc2gpO1xuXHRcdFxuXHRcdHNoZWV0Q29udGFpbmVycy5mb3JFYWNoKGUgPT4gcHJvY2Vzc2VkU2hlZXRDb250YWluZXJzLmFkZChlKSk7XG5cdFx0XG5cdFx0ZnVuY3Rpb24gKiByZWN1cnNlKHJ1bGVzOiBDU1NSdWxlTGlzdClcblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IHJ1bGVzLmxlbmd0aDspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHJ1bGUgPSBydWxlc1tpXTtcblx0XHRcdFx0aWYgKHJ1bGUgaW5zdGFuY2VvZiBDU1NHcm91cGluZ1J1bGUpXG5cdFx0XHRcdFx0cmVjdXJzZShydWxlLmNzc1J1bGVzKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKHJ1bGUgaW5zdGFuY2VvZiBDU1NTdHlsZVJ1bGUpXG5cdFx0XHRcdFx0eWllbGQgcnVsZTtcblx0XHRcdH1cblx0XHR9O1xuXHRcdFxuXHRcdGZvciAoY29uc3Qgc2hlZXQgb2Ygc2hlZXRzKVxuXHRcdFx0eWllbGQgKiByZWN1cnNlKHNoZWV0LmNzc1J1bGVzKTtcblx0fVxuXHRjb25zdCBwcm9jZXNzZWRTaGVldENvbnRhaW5lcnMgPSBuZXcgV2Vha1NldDxIVE1MRWxlbWVudD4oKTtcblx0XG5cdC8vIyBJbnRlcnNlY3Rpb24gT2JzZXJ2ZXJcblx0XG5cdGNvbnN0IHRocmVzaG9sZCA9IG5ldyBBcnJheSgxMDAwKS5maWxsKDApLm1hcCgoXywgaSkgPT4gaSAvIDEwMDApO1xuXHRjb25zdCBpbyA9IG5ldyBJbnRlcnNlY3Rpb25PYnNlcnZlcihyZWNvcmRzID0+XG5cdHtcblx0XHRmb3IgKGNvbnN0IHJlYyBvZiByZWNvcmRzKVxuXHRcdHtcblx0XHRcdC8vIFRoZSB0YXJnZXQgd2lsbCBiZSBhIGRpZmZlcmVudCBlbGVtZW50IHdoZW4gZGVhbGluZ1xuXHRcdFx0Ly8gd2l0aCBwb3NpdGlvbjogZml4ZWQgPHNlY3Rpb24+IGVsZW1lbnRzLlxuXHRcdFx0Y29uc3QgZSA9IHJlYy50YXJnZXQ7XG5cdFx0XHRpZiAoIShlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpKVxuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFxuXHRcdFx0bGV0IGluYyA9IHJlYy5pbnRlcnNlY3Rpb25SYXRpbztcblx0XHRcdFxuXHRcdFx0aWYgKHJlYy5ib3VuZGluZ0NsaWVudFJlY3QudG9wID49IDApXG5cdFx0XHRcdGluYyAtPSAxO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRpbmMgPSAxIC0gaW5jO1xuXHRcdFx0XG5cdFx0XHRpZiAoaW5jID49IC0wLjAxICYmIGluYyA8PSAwLjAxKVxuXHRcdFx0XHRpbmMgPSAwO1xuXHRcdFx0XG5cdFx0XHRpZiAoaW5jID4gMC45OSAmJiBpbmMgPCAxKVxuXHRcdFx0XHRpbmMgPSAxO1xuXHRcdFx0XG5cdFx0XHRpZiAoaW5jIDwgLTAuOTkgJiYgaW5jID4gLTEpXG5cdFx0XHRcdGluYyA9IC0xO1xuXHRcdFx0XG5cdFx0XHRpZiAoZS5jbGFzc0xpc3QuY29udGFpbnMoU3RhbmRhcmRDbGFzc2VzLmZpeGVkKSlcblx0XHRcdHtcblx0XHRcdFx0Y29uc3Qgc3RyaXAgPSBBcnJheS5mcm9tKGUuY2hpbGRyZW4pLmZpbmQoZSA9PiBlLmNsYXNzTGlzdC5jb250YWlucyhTdGFuZGFyZENsYXNzZXMuc3RyaXApKTtcblx0XHRcdFx0aWYgKHN0cmlwIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoTWF0aC5hYnMoaW5jKSA9PT0gMSlcblx0XHRcdFx0XHRcdHN0cmlwLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGVsc2UgaWYgKHN0cmlwLnN0eWxlLnZpc2liaWxpdHkgPT09IFwiaGlkZGVuXCIpXG5cdFx0XHRcdFx0XHRzdHJpcC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShcInZpc2liaWxpdHlcIik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Y29uc3QgdjEwMCA9IE1hdGguYWJzKE1hdGgubWluKGluYywgMCkpO1xuXHRcdFx0Y29uc3QgdjAxMCA9IDEgLSBNYXRoLmFicyhpbmMpO1xuXHRcdFx0Y29uc3QgdjAwMSA9IE1hdGgubWF4KDAsIGluYyk7XG5cdFx0XHRjb25zdCB2MTEwID0gMSAtIE1hdGgubWF4KDAsIGluYyk7XG5cdFx0XHRjb25zdCB2MDExID0gTWF0aC5taW4oMSwgaW5jICsgMSk7XG5cdFx0XHRjb25zdCB2MTAxID0gTWF0aC5hYnMoaW5jKTtcblx0XHRcdFxuXHRcdFx0ZS5zdHlsZS5zZXRQcm9wZXJ0eShcIi0tMTAwXCIsIHYxMDAudG9TdHJpbmcoKSk7XG5cdFx0XHRlLnN0eWxlLnNldFByb3BlcnR5KFwiLS0wMTBcIiwgdjAxMC50b1N0cmluZygpKTtcblx0XHRcdGUuc3R5bGUuc2V0UHJvcGVydHkoXCItLTAwMVwiLCB2MDAxLnRvU3RyaW5nKCkpO1xuXHRcdFx0ZS5zdHlsZS5zZXRQcm9wZXJ0eShcIi0tMTEwXCIsIHYxMTAudG9TdHJpbmcoKSk7XG5cdFx0XHRlLnN0eWxlLnNldFByb3BlcnR5KFwiLS0wMTFcIiwgdjAxMS50b1N0cmluZygpKTtcblx0XHRcdGUuc3R5bGUuc2V0UHJvcGVydHkoXCItLTEwMVwiLCB2MTAxLnRvU3RyaW5nKCkpO1xuXHRcdFx0ZS5zdHlsZS5zZXRQcm9wZXJ0eShcIi0taW5jXCIsIGluYy50b1N0cmluZygpKTtcblx0XHRcdGUuc3R5bGUuc2V0UHJvcGVydHkoXCItLWRlY1wiLCAoaW5jICogLTEpLnRvU3RyaW5nKCkpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBpZkF0dHI6IHN0cmluZ1tdID0gW107XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgW2xvdywgaGlnaF0gb2YgcmFuZ2VQYWlycy52YWx1ZXMoKSlcblx0XHRcdFx0aWYgKGluYyA+PSBsb3cgJiYgaW5jIDw9IGhpZ2gpXG5cdFx0XHRcdFx0aWZBdHRyLnB1c2gobG93ICsgYCxgICsgaGlnaCk7XG5cdFx0XHRcblx0XHRcdGUuc2V0QXR0cmlidXRlKFwiaWZcIiwgaWZBdHRyLmpvaW4oXCIgXCIpKTtcblx0XHR9XG5cdH0sXG5cdHsgdGhyZXNob2xkIH0pO1xuXHRcblx0aWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09IFwibG9hZGluZ1wiKVxuXHR7XG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInJlYWR5c3RhdGVjaGFuZ2VcIiwgKCkgPT5cblx0XHR7XG5cdFx0XHRyZWdpc3RlclJvb3QoZG9jdW1lbnQuYm9keSk7XG5cdFx0fSk7XG5cdH1cblx0ZWxzZSByZWdpc3RlclJvb3QoZG9jdW1lbnQuYm9keSk7XG59XG4iLCJcbm5hbWVzcGFjZSBIdG1sRmVlZFxue1xuXHQvKipcblx0ICogQSBjbGFzcyB0aGF0IHJlYWRzIGEgcmF3IEhUTUwgZG9jdW1lbnQsIGFuZCBwcm92aWRlc1xuXHQgKiB0aGUgYWJpbGl0eSB0byBzY2FuIHRoZSBkb2N1bWVudCB3aXRoIHJlZ2lzdGVyZWQgXCJ0cmFwc1wiLFxuXHQgKiB3aGljaCBhbGxvdyB0aGUgZG9jdW1lbnQncyBjb250ZW50IHRvIGJlIG1vZGlmaWVkLlxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIEZvcmVpZ25Eb2N1bWVudFJlYWRlclxuXHR7XG5cdFx0LyoqICovXG5cdFx0Y29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSByYXdEb2N1bWVudDogc3RyaW5nKSB7IH1cblx0XHRcblx0XHQvKiogKi9cblx0XHR0cmFwRWxlbWVudChlbGVtZW50Rm46IChlbGVtZW50OiBFbGVtZW50KSA9PiBFbGVtZW50IHwgdm9pZClcblx0XHR7XG5cdFx0XHR0aGlzLmVsZW1lbnRGbiA9IGVsZW1lbnRGbjtcblx0XHR9XG5cdFx0cHJpdmF0ZSBlbGVtZW50Rm4gPSAoZWxlbWVudDogRWxlbWVudCk6IEVsZW1lbnQgfCB2b2lkID0+IGVsZW1lbnQ7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0dHJhcEF0dHJpYnV0ZShhdHRyaWJ1dGVGbjogKG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZywgZWxlbWVudDogRWxlbWVudCkgPT4gc3RyaW5nIHwgdm9pZClcblx0XHR7XG5cdFx0XHR0aGlzLmF0dHJpYnV0ZUZuID0gYXR0cmlidXRlRm47XG5cdFx0fVxuXHRcdHByaXZhdGUgYXR0cmlidXRlRm4gPSAobmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nLCBlbGVtZW50OiBFbGVtZW50KTogc3RyaW5nIHwgdm9pZCA9PiB2YWx1ZTtcblx0XHRcblx0XHQvKiogKi9cblx0XHR0cmFwUHJvcGVydHkocHJvcGVydHlGbjogKG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZykgPT4gc3RyaW5nKVxuXHRcdHtcblx0XHRcdHRoaXMucHJvcGVydHlGbiA9IHByb3BlcnR5Rm47XG5cdFx0fVxuXHRcdHByaXZhdGUgcHJvcGVydHlGbiA9IChuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpID0+IG5hbWU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmVhZCgpXG5cdFx0e1xuXHRcdFx0Y29uc3QgcGFyc2VyID0gbmV3IERPTVBhcnNlcigpO1xuXHRcdFx0Y29uc3QgZG9jID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyh0aGlzLnJhd0RvY3VtZW50LCBcInRleHQvaHRtbFwiKTtcblx0XHRcdGNvbnN0IHRyYXNoOiBFbGVtZW50W10gPSBbXTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCB3YWxrZXIgPSBkb2MuY3JlYXRlVHJlZVdhbGtlcihkb2MpOzspXG5cdFx0XHR7XG5cdFx0XHRcdGxldCBub2RlID0gd2Fsa2VyLm5leHROb2RlKCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoIW5vZGUpXG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoIShub2RlIGluc3RhbmNlb2YgRWxlbWVudCkpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFxuXHRcdFx0XHRsZXQgZWxlbWVudCA9IG5vZGUgYXMgRWxlbWVudDtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IHRoaXMuZWxlbWVudEZuKGVsZW1lbnQpO1xuXHRcdFx0XHRpZiAoIXJlc3VsdClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRyYXNoLnB1c2goZWxlbWVudCk7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAocmVzdWx0IGluc3RhbmNlb2YgTm9kZSAmJiByZXN1bHQgIT09IGVsZW1lbnQpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRlbGVtZW50LnJlcGxhY2VXaXRoKHJlc3VsdCk7XG5cdFx0XHRcdFx0ZWxlbWVudCA9IHJlc3VsdDtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0aWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MU3R5bGVFbGVtZW50KVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKGVsZW1lbnQuc2hlZXQpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0dGhpcy5yZWFkU2hlZXQoZWxlbWVudC5zaGVldCk7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGNvbnN0IGNzc1RleHQ6IHN0cmluZ1tdID0gW107XG5cdFx0XHRcdFx0XHRmb3IgKGxldCBpID0gLTEsIGxlbiA9IGVsZW1lbnQuc2hlZXQuY3NzUnVsZXMubGVuZ3RoOyArK2kgPCBsZW47KVxuXHRcdFx0XHRcdFx0XHRjc3NUZXh0LnB1c2goZWxlbWVudC5zaGVldC5jc3NSdWxlc1tpXS5jc3NUZXh0KTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0aWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MU3R5bGVFbGVtZW50KVxuXHRcdFx0XHRcdFx0XHRlbGVtZW50LnRleHRDb250ZW50ID0gY3NzVGV4dC5qb2luKFwiXFxuXCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0Zm9yIChjb25zdCBhdHRyIG9mIEFycmF5LmZyb20oZWxlbWVudC5hdHRyaWJ1dGVzKSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IG5ld1ZhbHVlID0gdGhpcy5hdHRyaWJ1dGVGbihhdHRyLm5hbWUsIGF0dHIudmFsdWUsIGVsZW1lbnQpO1xuXHRcdFx0XHRcdGlmIChuZXdWYWx1ZSA9PT0gbnVsbCB8fCBuZXdWYWx1ZSA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0XHRcdFx0ZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGVOb2RlKGF0dHIpO1xuXHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdGVsZW1lbnQuc2V0QXR0cmlidXRlKGF0dHIubmFtZSwgbmV3VmFsdWUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50ICYmIGVsZW1lbnQuaGFzQXR0cmlidXRlKFwic3R5bGVcIikpXG5cdFx0XHRcdFx0dGhpcy5yZWFkU3R5bGUoZWxlbWVudC5zdHlsZSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgZSBvZiB0cmFzaClcblx0XHRcdFx0ZS5yZW1vdmUoKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGRvYztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSByZWFkU2hlZXQoc2hlZXQ6IENTU1N0eWxlU2hlZXQpXG5cdFx0e1xuXHRcdFx0Y29uc3QgcmVjdXJzZSA9IChncm91cDogQ1NTR3JvdXBpbmdSdWxlIHwgQ1NTU3R5bGVTaGVldCkgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgbGVuID0gZ3JvdXAuY3NzUnVsZXMubGVuZ3RoO1xuXHRcdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGxlbjspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBydWxlID0gZ3JvdXAuY3NzUnVsZXMuaXRlbShpKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAocnVsZSBpbnN0YW5jZW9mIENTU0dyb3VwaW5nUnVsZSlcblx0XHRcdFx0XHRcdHJlY3Vyc2UocnVsZSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0ZWxzZSBpZiAocnVsZSBpbnN0YW5jZW9mIENTU1N0eWxlUnVsZSlcblx0XHRcdFx0XHRcdHRoaXMucmVhZFN0eWxlKHJ1bGUuc3R5bGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0XG5cdFx0XHRyZWN1cnNlKHNoZWV0KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSByZWFkU3R5bGUoc3R5bGU6IENTU1N0eWxlRGVjbGFyYXRpb24pXG5cdFx0e1xuXHRcdFx0Y29uc3QgbmFtZXM6IHN0cmluZ1tdID0gW107XG5cdFx0XHRcblx0XHRcdGZvciAobGV0IG4gPSAtMTsgKytuIDwgc3R5bGUubGVuZ3RoOylcblx0XHRcdFx0bmFtZXMucHVzaChzdHlsZVtuXSk7XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgbmFtZSBvZiBuYW1lcylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdmFsdWUgPSBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKG5hbWUpO1xuXHRcdFx0XHRjb25zdCBwcmlvcml0eSA9IHN0eWxlLmdldFByb3BlcnR5UHJpb3JpdHkobmFtZSk7XG5cdFx0XHRcdGNvbnN0IHJlc3VsdFZhbHVlID0gdGhpcy5wcm9wZXJ0eUZuKG5hbWUsIHZhbHVlKTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChyZXN1bHRWYWx1ZSAhPT0gdmFsdWUpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHQvLyBUaGUgcHJvcGVydHkgaGFzIHRvIGJlIHJlbW92ZWQgZWl0aGVyIHdheSxcblx0XHRcdFx0XHQvLyBiZWNhdXNlIGlmIHdlJ3JlIHNldHRpbmcgYSBuZXcgcHJvcGVydHkgd2l0aFxuXHRcdFx0XHRcdC8vIGEgZGlmZmVyZW50IFVSTCwgaXQgd29uJ3QgZ2V0IHByb3Blcmx5IHJlcGxhY2VkLlxuXHRcdFx0XHRcdHN0eWxlLnJlbW92ZVByb3BlcnR5KG5hbWUpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmIChyZXN1bHRWYWx1ZSlcblx0XHRcdFx0XHRcdHN0eWxlLnNldFByb3BlcnR5KG5hbWUsIHJlc3VsdFZhbHVlLCBwcmlvcml0eSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIEh0bWxGZWVkXG57XG5cdC8qKlxuXHQgKiBBIGNsYXNzIHRoYXQgd3JhcHMgYSBGb3JlaWduRG9jdW1lbnRSZWFkZXIsIGFuZCB3aGljaCBjb252ZXJ0c1xuXHQgKiB0aGUgY29udGVudCBvZiB0aGUgc3BlY2lmaWVkIHJhdyBIVE1MIGRvY3VtZW50IGludG8gYSBmb3JtYXRcblx0ICogd2hpY2ggaXMgYWNjZXB0YWJsZSBmb3IgaW5qZWN0aW9uIGludG8gYSBibG9nLlxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIEZvcmVpZ25Eb2N1bWVudFNhbml0aXplclxuXHR7XG5cdFx0LyoqICovXG5cdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRwcml2YXRlIHJlYWRvbmx5IHJhd0RvY3VtZW50OiBzdHJpbmcsXG5cdFx0XHRwcml2YXRlIHJlYWRvbmx5IGJhc2VIcmVmOiBzdHJpbmcpXG5cdFx0eyB9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmVhZCgpXG5cdFx0e1xuXHRcdFx0Y29uc3QgcmVhZGVyID0gbmV3IEZvcmVpZ25Eb2N1bWVudFJlYWRlcih0aGlzLnJhd0RvY3VtZW50KTtcblx0XHRcdFxuXHRcdFx0cmVhZGVyLnRyYXBFbGVtZW50KGUgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdCA9IGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKHQgPT09IFwiZnJhbWVcIiB8fCB0ID09PSBcImZyYW1lc2V0XCIpXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKHQgPT09IFwic2NyaXB0XCIgfHwgdCA9PT0gXCJpZnJhbWVcIiB8fCB0ID09PSBcInBvcnRhbFwiKVxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XG5cdFx0XHRcdGlmICh0ID09PSBcIm5vc2NyaXB0XCIpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRyZXR1cm4gSG90LmRpdihcblx0XHRcdFx0XHRcdEFycmF5LmZyb20oZS5hdHRyaWJ1dGVzKSxcblx0XHRcdFx0XHRcdEFycmF5LmZyb20oZS5jaGlsZHJlbiksXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0cmV0dXJuIGU7XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0cmVhZGVyLnRyYXBBdHRyaWJ1dGUoKG5hbWUsIHZhbHVlLCBlbGVtZW50KSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRpZiAobmFtZS5zdGFydHNXaXRoKFwib25cIikpXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgdGFnID0gZWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAobmFtZSA9PT0gXCJzcmNzZXRcIilcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5yZXNvbHZlU291cmNlU2V0VXJscyh2YWx1ZSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAobmFtZSA9PT0gXCJocmVmXCIgfHwgXG5cdFx0XHRcdFx0bmFtZSA9PT0gXCJzcmNcIiB8fFxuXHRcdFx0XHRcdCh0YWcgPT09IFwiZW1iZWRcIiAmJiBuYW1lID09PSBcInNvdXJjZVwiKSB8fFxuXHRcdFx0XHRcdCh0YWcgPT09IFwidmlkZW9cIiAmJiBuYW1lID09PSBcInBvc3RlclwiKSB8fFxuXHRcdFx0XHRcdCh0YWcgPT09IFwib2JqZWN0XCIgJiYgbmFtZSA9PT0gXCJkYXRhXCIpIHx8XG5cdFx0XHRcdFx0KHRhZyA9PT0gXCJmb3JtXCIgJiYgbmFtZSA9PT0gXCJhY3Rpb25cIikpXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMucmVzb2x2ZVBsYWluVXJsKHZhbHVlKTtcblx0XHRcdFx0XG5cdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHRyZWFkZXIudHJhcFByb3BlcnR5KChuYW1lLCB2YWx1ZSkgPT5cblx0XHRcdHtcblx0XHRcdFx0aWYgKCF1cmxQcm9wZXJ0aWVzLmhhcyhuYW1lKSlcblx0XHRcdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0XHRcdFxuXHRcdFx0XHRyZXR1cm4gdGhpcy5yZXNvbHZlQ3NzVXJscyh2YWx1ZSk7XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIHJlYWRlci5yZWFkKCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgcmVzb2x2ZVBsYWluVXJsKHBsYWluVXJsOiBzdHJpbmcpXG5cdFx0e1xuXHRcdFx0aWYgKHBsYWluVXJsLnN0YXJ0c1dpdGgoXCJkYXRhOlwiKSB8fFxuXHRcdFx0XHRwbGFpblVybC5zdGFydHNXaXRoKFwiaHR0cDpcIikgfHxcblx0XHRcdFx0cGxhaW5Vcmwuc3RhcnRzV2l0aChcImh0dHBzOlwiKSB8fFxuXHRcdFx0XHRwbGFpblVybC5zdGFydHNXaXRoKFwiL1wiKSB8fFxuXHRcdFx0XHQvXlthLXpcXC1dKzovZy50ZXN0KHBsYWluVXJsKSlcblx0XHRcdFx0cmV0dXJuIHBsYWluVXJsO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gVXJsLnJlc29sdmUocGxhaW5VcmwsIHRoaXMuYmFzZUhyZWYpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIHJlc29sdmVDc3NVcmxzKGNzc1ZhbHVlOiBzdHJpbmcpXG5cdFx0e1xuXHRcdFx0Y29uc3QgcmVnID0gL1xcYnVybFxcKFtcIiddPyhbXlxccz9cIicpXSspL2dpO1xuXHRcdFx0Y29uc3QgcmVwbGFjZWQgPSBjc3NWYWx1ZS5yZXBsYWNlKHJlZywgKHN1YnN0cmluZywgdXJsKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRsZXQgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVQbGFpblVybCh1cmwpO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKHN1YnN0cmluZy5zdGFydHNXaXRoKGB1cmwoXCJgKSlcblx0XHRcdFx0XHRyZXNvbHZlZCA9IGB1cmwoXCJgICsgcmVzb2x2ZWQ7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmIChzdWJzdHJpbmcuc3RhcnRzV2l0aChgdXJsKGApKVxuXHRcdFx0XHRcdHJlc29sdmVkID0gYHVybChgICsgcmVzb2x2ZWQ7XG5cdFx0XHRcdFxuXHRcdFx0XHRyZXR1cm4gcmVzb2x2ZWQ7XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIHJlcGxhY2VkO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBSZXNvbHZlcyBVUkxzIGluIGEgc3Jjc2V0IGF0dHJpYnV0ZSwgdXNpbmcgYSBtYWtlLXNoaWZ0IGFsZ29yaXRobVxuXHRcdCAqIHRoYXQgZG9lc24ndCBzdXBwb3J0IGNvbW1hcyBpbiB0aGUgVVJMLlxuXHRcdCAqL1xuXHRcdHByaXZhdGUgcmVzb2x2ZVNvdXJjZVNldFVybHMoc3JjU2V0VXJsczogc3RyaW5nKVxuXHRcdHtcblx0XHRcdGNvbnN0IHJhd1BhaXJzID0gc3JjU2V0VXJscy5zcGxpdChgLGApO1xuXHRcdFx0Y29uc3QgcGFpcnMgPSByYXdQYWlycy5tYXAocmF3UGFpciA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBwYWlyID0gcmF3UGFpci50cmltKCkuc3BsaXQoL1xccysvKTtcblx0XHRcdFx0aWYgKHBhaXIubGVuZ3RoID09PSAxKVxuXHRcdFx0XHRcdHBhaXIucHVzaChcIlwiKTtcblx0XHRcdFx0XG5cdFx0XHRcdHJldHVybiBwYWlyIGFzIFtzdHJpbmcsIHN0cmluZ107XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBwYWlyIG9mIHBhaXJzKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBbdXJsXSA9IHBhaXI7XG5cdFx0XHRcdHBhaXJbMF0gPSB0aGlzLnJlc29sdmVQbGFpblVybCh1cmwpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gcGFpcnMubWFwKHBhaXIgPT4gcGFpci5qb2luKFwiIFwiKSkuam9pbihgLCBgKTtcblx0XHR9XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRjb25zdCB1cmxQcm9wZXJ0aWVzID0gbmV3IFNldChbXG5cdFx0XCJiYWNrZ3JvdW5kXCIsXG5cdFx0XCJiYWNrZ3JvdW5kLWltYWdlXCIsXG5cdFx0XCJib3JkZXItaW1hZ2VcIixcblx0XHRcImJvcmRlci1pbWFnZS1zb3VyY2VcIixcblx0XHRcImxpc3Qtc3R5bGVcIixcblx0XHRcImxpc3Qtc3R5bGUtaW1hZ2VcIixcblx0XHRcIm1hc2tcIixcblx0XHRcIm1hc2staW1hZ2VcIixcblx0XHRcIi13ZWJraXQtbWFza1wiLFxuXHRcdFwiLXdlYmtpdC1tYXNrLWltYWdlXCIsXG5cdFx0XCJjb250ZW50XCJcblx0XSk7XG59XG4iLCJcbm5hbWVzcGFjZSBIdG1sRmVlZFxue1xuXHQvKipcblx0ICogQSBsaWJyYXJ5IHdoaWNoIG9wZXJhdGVzIG92ZXIgdGhlIGJyb3dzZXItc3VwcGxpZWQgaGlzdG9yeS5wdXNoU3RhdGUoKVxuXHQgKiBtZXRob2RzLiBUaGlzIGxpYnJhcnkgYWxsb3dzIHRoZSB1c2FnZSBvZiB0aGUgYnJvd3NlcidzIGJhY2sgYW5kIGZvcndhcmRcblx0ICogYnV0dG9ucyB0byBiZSBpbmRlcGVuZGVudGx5IHRyYWNrZWQuIEFsbCBoaXN0b3J5IG1hbmlwdWxhdGlvbiBpbiB0aGUgYXBwXG5cdCAqIHNob3VsZCBwYXNzIHRocm91Z2ggdGhpcyBsYXllciByYXRoZXIgdGhhbiB1c2luZyB0aGUgaGlzdG9yeS4qIG1ldGhvZHNcblx0ICogZGlyZWN0bHkuXG5cdCAqL1xuXHRleHBvcnQgbmFtZXNwYWNlIEhpc3Rvcnlcblx0e1xuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBmdW5jdGlvbiBiYWNrKClcblx0XHR7XG5cdFx0XHRpZiAoc3RhY2tQb3NpdGlvbiA8IDApXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdFxuXHRcdFx0ZGlzYWJsZUV2ZW50cygoKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRoaXN0b3J5LmJhY2soKTtcblx0XHRcdFx0c3RhY2tQb3NpdGlvbi0tO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBmdW5jdGlvbiBmb3J3YXJkKClcblx0XHR7XG5cdFx0XHRpZiAoc3RhY2tQb3NpdGlvbiA+PSBzdGFjay5sZW5ndGgpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdFxuXHRcdFx0ZGlzYWJsZUV2ZW50cygoKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRoaXN0b3J5LmZvcndhcmQoKTtcblx0XHRcdFx0c3RhY2tQb3NpdGlvbisrO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBmdW5jdGlvbiBwdXNoKHNsdWc6IHN0cmluZylcblx0XHR7XG5cdFx0XHRzdGFjay5sZW5ndGggPSBzdGFja1Bvc2l0aW9uICsgMTtcblx0XHRcdHN0YWNrUG9zaXRpb24gPSBzdGFjay5sZW5ndGg7XG5cdFx0XHRjb25zdCBlbnRyeTogVEhpc3RvcnlFbnRyeSA9IHsgc2x1Zywgc3RhY2tQb3NpdGlvbiB9O1xuXHRcdFx0c3RhY2sucHVzaChlbnRyeSk7XG5cdFx0XHRoaXN0b3J5LnB1c2hTdGF0ZShlbnRyeSwgXCJcIiwgc2x1Zyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGZ1bmN0aW9uIGRpc2FibGVFdmVudHMoY2FsbGJhY2s6ICgpID0+IHZvaWQpXG5cdFx0e1xuXHRcdFx0aWYgKHRyaWdnZXJQcm9ncmFtbWF0aWNFdmVudHMpXG5cdFx0XHRcdGRpc2Nvbm5lY3RIYW5kbGVyKCk7XG5cdFx0XHRcblx0XHRcdHRyeVxuXHRcdFx0e1xuXHRcdFx0XHRjYWxsYmFjaygpO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGUpIHsgfVxuXHRcdFx0ZmluYWxseVxuXHRcdFx0e1xuXHRcdFx0XHRtYXliZUNvbm5lY3RIYW5kbGVyKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEluZGljYXRlcyB3aGV0aGVyIHByb2dyYW1tYXRpYyBjYWxscyB0byBoaXN0b3J5LmJhY2sgYW5kIGhpc3RvcnkuZm9yd2FyZCgpXG5cdFx0ICogc2hvdWxkIHJlc3VsdCBpbiB0aGUgYmFjayBhbmQgZm9yd2FyZCBldmVudHMgYmVpbmcgdHJpZ2dlcmVkLlxuXHRcdCAqL1xuXHRcdGV4cG9ydCBsZXQgdHJpZ2dlclByb2dyYW1tYXRpY0V2ZW50cyA9IGZhbHNlO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEluc3RhbGxzIGFuIGV2ZW50IGhhbmRsZXIgdGhhdCBpbnZva2VzIHdoZW4gdGhlXG5cdFx0ICogdXNlciBwcmVzc2VzIGVpdGhlciB0aGUgYmFjayBvciBmb3J3YXJkIGJ1dHRvbi5cblx0XHQgKi9cblx0XHRleHBvcnQgZnVuY3Rpb24gb24oZXZlbnQ6IFwiYmFja1wiIHwgXCJmb3J3YXJkXCIsIGZuOiAoKSA9PiB2b2lkKVxuXHRcdHtcblx0XHRcdG1heWJlQ29ubmVjdEhhbmRsZXIoKTtcblx0XHRcdFxuXHRcdFx0ZXZlbnQgPT09IFwiYmFja1wiID9cblx0XHRcdFx0YmFja0hhbmRsZXJzLnB1c2goZm4pIDpcblx0XHRcdFx0Zm9yd2FyZEhhbmRsZXJzLnB1c2goZm4pO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRmdW5jdGlvbiBtYXliZUNvbm5lY3RIYW5kbGVyKClcblx0XHR7XG5cdFx0XHRpZiAoIWhhc0Nvbm5lY3RlZEhhbmRsZXIpXG5cdFx0XHR7XG5cdFx0XHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicG9wc3RhdGVcIiwgaGFuZGxlcik7XG5cdFx0XHRcdGhhc0Nvbm5lY3RlZEhhbmRsZXIgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRmdW5jdGlvbiBkaXNjb25uZWN0SGFuZGxlcigpXG5cdFx0e1xuXHRcdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJwb3BzdGF0ZVwiLCBoYW5kbGVyKTtcblx0XHRcdGhhc0Nvbm5lY3RlZEhhbmRsZXIgPSBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdFx0bGV0IGhhc0Nvbm5lY3RlZEhhbmRsZXIgPSBmYWxzZTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRmdW5jdGlvbiBoYW5kbGVyKGV2OiBQb3BTdGF0ZUV2ZW50KVxuXHRcdHtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3Qgc3RhdGUgPSAoaGlzdG9yeS5zdGF0ZSBhcyBUSGlzdG9yeUVudHJ5IHwgbnVsbCk7XG5cdFx0XHRcdGNvbnN0IG5ld1N0YWNrUG9zaXRpb24gPSBzdGF0ZT8uc3RhY2tQb3NpdGlvbiB8fCAtMTtcblx0XHRcdFx0Y29uc3QgaGFuZGxlcnMgPSBuZXdTdGFja1Bvc2l0aW9uID4gc3RhY2tQb3NpdGlvbiA/XG5cdFx0XHRcdFx0Zm9yd2FyZEhhbmRsZXJzIDpcblx0XHRcdFx0XHRiYWNrSGFuZGxlcnM7XG5cdFx0XHRcdFxuXHRcdFx0XHRmb3IgKGNvbnN0IGhhbmRsZXIgb2YgaGFuZGxlcnMpXG5cdFx0XHRcdFx0aGFuZGxlcihldik7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0dHlwZSBUSGlzdG9yeUVudHJ5ID0geyBzbHVnOiBzdHJpbmcsIHN0YWNrUG9zaXRpb246IG51bWJlciB9O1xuXHRcdGNvbnN0IGJhY2tIYW5kbGVyczogKChldjogUG9wU3RhdGVFdmVudCkgPT4gdm9pZClbXSA9IFtdO1xuXHRcdGNvbnN0IGZvcndhcmRIYW5kbGVyczogKChldjogUG9wU3RhdGVFdmVudCkgPT4gdm9pZClbXSA9IFtdO1xuXHRcdGNvbnN0IHN0YWNrOiBUSGlzdG9yeUVudHJ5W10gPSBbXTtcblx0XHRsZXQgc3RhY2tQb3NpdGlvbiA9IC0xO1xuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBIdG1sRmVlZFxue1xuXHQvKipcblx0ICogUmV0dXJucyBhbiBPbW5pdmlldyBjbGFzcyB0aGF0IGdldHMgcG9wdWxhdGVkIHdpdGggdGhlXG5cdCAqIHBvc3RlcnMgZnJvbSB0aGUgc3BlY2lmaWVkIFVSTHMuXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gZ2V0T21uaXZpZXdGcm9tRmVlZChcblx0XHR1cmxzOiBzdHJpbmdbXSxcblx0XHRvbW5pdmlld09wdGlvbnM6IFBhcnRpYWw8SU9tbml2aWV3T3B0aW9ucz4pOiB1bmtub3duXG5cdHtcblx0XHRpZiAodHlwZW9mIE9tbml2aWV3ID09PSBcInVuZGVmaW5lZFwiKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiT21uaXZpZXcgbGlicmFyeSBub3QgZm91bmQuXCIpO1xuXHRcdFxuXHRcdGNvbnN0IGhvdCA9IG5ldyBIb3QoKTtcblx0XHRcblx0XHRjb25zdCBkZWZhdWx0T3B0aW9uczogSU9tbml2aWV3T3B0aW9ucyA9IHtcblx0XHRcdGdldFBvc3RlcjogaW5kZXggPT5cblx0XHRcdHtcblx0XHRcdFx0aWYgKGluZGV4ID49IHVybHMubGVuZ3RoKVxuXHRcdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0XHRcblx0XHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIHJlc29sdmUgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IHBvc3RlciA9IGF3YWl0IEh0bWxGZWVkLmdldFBvc3RlckZyb21VcmwodXJsc1tpbmRleF0pO1xuXHRcdFx0XHRcdHJlc29sdmUocG9zdGVyIHx8IGdldEVycm9yUG9zdGVyKCkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0XHRmaWxsQm9keTogYXN5bmMgKGZpbGxFbGVtZW50LCBzZWxlY3RlZEVsZW1lbnQsIGluZGV4KSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB1cmwgPSB1cmxzW2luZGV4XTtcblx0XHRcdFx0Y29uc3QgcmVlbCA9IGF3YWl0IEh0bWxGZWVkLmdldFBhZ2VGcm9tVXJsKHVybCk7XG5cdFx0XHRcdGlmICghcmVlbClcblx0XHRcdFx0XHRyZXR1cm4gc2VsZWN0ZWRFbGVtZW50LmFwcGVuZChnZXRFcnJvclBvc3RlcigpKTtcblx0XHRcdFx0XG5cdFx0XHRcdGZpbGxFbGVtZW50LmFwcGVuZChcblx0XHRcdFx0XHRIdG1sRmVlZC5nZXRTYW5kYm94ZWRFbGVtZW50KFsuLi5yZWVsLmhlYWQsIC4uLnJlZWwuc2VjdGlvbnNdLCByZWVsLnVybClcblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9O1xuXHRcdFxuXHRcdGNvbnN0IG1lcmdlZE9wdGlvbnMgPSBPYmplY3QuYXNzaWduKG9tbml2aWV3T3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuXHRcdGNvbnN0IG9tbml2aWV3ID0gbmV3IE9tbml2aWV3LkNsYXNzKG1lcmdlZE9wdGlvbnMpO1xuXHRcdFxuXHRcdGhvdC5nZXQob21uaXZpZXcpKFxuXHRcdFx0aG90Lm9uKFwiY29ubmVjdGVkXCIsICgpID0+IG9tbml2aWV3LmdvdG9Qb3N0ZXJzKCkpXG5cdFx0KTtcblx0XHRcblx0XHRyZXR1cm4gb21uaXZpZXc7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgaW50ZXJmYWNlIElPbW5pdmlld09wdGlvbnNcblx0e1xuXHRcdC8qKlxuXHRcdCAqIFNwZWNpZmllcyB0aGUgaW5kZXggb2YgdGhlIHRvcG1vc3QgYW5kIGxlZnRtb3N0IHBvc3RlciBpbiB0aGUgcG9zdGVyXG5cdFx0ICogbGlzdCB3aGVuIHRoZSBPbW5pdmlldyBpcyBmaXJzdCByZW5kZXJlZC4gTnVtYmVycyBncmVhdGVyIHRoYW4gemVyb1xuXHRcdCAqIGFsbG93IGJhY2stdHJhY2tpbmcuXG5cdFx0ICovXG5cdFx0YW5jaG9ySW5kZXg/OiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQSByZXF1aXJlZCBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIHBvc3RlciBmcmFtZSBmb3IgYSBnaXZlbiBwb3NpdGlvblxuXHRcdCAqIGluIHRoZSBPbW5pdmlldy5cblx0XHQgKi9cblx0XHRnZXRQb3N0ZXI6IEdldFBvc3RlckZuO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEEgcmVxdWlyZWQgZnVuY3Rpb24gdGhhdCBjYXVzZXMgYm9kaWVzIHRvIGJlIGZpbGxlZCB3aXRoIGNvbnRlbnRcblx0XHQgKiB3aGVuIHRoZSBwb3N0ZXIgaXMgc2VsZWN0ZWQuXG5cdFx0ICovXG5cdFx0ZmlsbEJvZHk6IEZpbGxGbjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBBbGxvd3MgQVBJIGNvbnN1bWVycyB0byBzdXBwbHkgdGhlaXIgb3duIGNvbnRhaW5lciBlbGVtZW50IGZvciBib2RpZXNcblx0XHQgKiB0byBiZSBwbGFjZWQgaW4gY3VzdG9tIGxvY2F0aW9ucy5cblx0XHQgKi9cblx0XHRnZXRCb2R5Q29udGFpbmVyPzogKCkgPT4gSFRNTEVsZW1lbnQ7XG5cdH1cblxuXHQvKipcblx0ICogUmV0dXJucyBhIHBvc3RlciBIVE1MRWxlbWVudCBmb3IgdGhlIGdpdmVuIGluZGV4IGluIHRoZSBzdHJlYW0uXG5cdCAqIFRoZSBmdW5jdGlvbiBzaG91bGQgcmV0dXJuIG51bGwgdG8gc3RvcCBsb29raW5nIGZvciBwb3N0ZXJzIGF0IG9yXG5cdCAqIGJleW9uZCB0aGUgc3BlY2lmaWVkIGluZGV4LlxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgR2V0UG9zdGVyRm4gPSAoaW5kZXg6IG51bWJlcikgPT4gUHJvbWlzZTxIVE1MRWxlbWVudD4gfCBIVE1MRWxlbWVudCB8IG51bGw7XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IHR5cGUgRmlsbEZuID0gKGZpbGxFbGVtZW50OiBIVE1MRWxlbWVudCwgc2VsZWN0ZWRFbGVtZW50OiBIVE1MRWxlbWVudCwgaW5kZXg6IG51bWJlcikgPT4gdm9pZCB8IFByb21pc2U8dm9pZD47XG5cdFxufVxuIiwiXG5uYW1lc3BhY2UgSHRtbEZlZWRcbntcblx0LyoqXG5cdCAqIFJldHVybnMgYW4gYXJyYXkgb2YgcmVtb3RlIDxzZWN0aW9uPiBlbGVtZW50cyB0aGF0IGV4aXN0IHVuZGVybmVhdGhcblx0ICogdGhlIHNwZWNpZmllZCBjb250YWluZXIgZWxlbWVudC4gRGVmYXVsdHMgdG8gdGhlIDxib2R5PiBlbGVtZW50IGluIHRoZVxuXHQgKiBjdXJyZW50IGRvY3VtZW50IGlmIHRoZSBjb250YWluZXIgYXJndW1lbnQgaXMgb21pdHRlZC5cblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBnZXRSZW1vdGVTZWN0aW9uRWxlbWVudHMoY29udGFpbmVyOiBQYXJlbnROb2RlID0gZG9jdW1lbnQuYm9keSlcblx0e1xuXHRcdHJldHVybiBnZXRFbGVtZW50cyhcIlNFQ1RJT05bc3JjXSwgU0VDVElPTltkYXRhLXNyY11cIiwgY29udGFpbmVyKTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIFJldHVybnMgYSBmdWxseS1xdWFsaWZpZWQgdmVyc2lvbiBvZiB0aGUgVVJJIHNwZWNpZmllZCBhcyB0aGUgc291cmNlXG5cdCAqIG9mIHRoZSBjb250ZW50IGluIGEgPHNlY3Rpb24+IGVsZW1lbnQuXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gZ2V0UmVtb3RlU2VjdGlvblNvdXJjZShcblx0XHRzZWN0aW9uOiBIVE1MRWxlbWVudCxcblx0XHRkb2N1bWVudFVybCA9IFVybC5nZXRDdXJyZW50KCkpXG5cdHtcblx0XHRjb25zdCBzcmMgPSBzZWN0aW9uLmdldEF0dHJpYnV0ZShcInNyY1wiKSB8fCBzZWN0aW9uLmdldEF0dHJpYnV0ZShcImRhdGEtc3JjXCIpIHx8IFwiXCI7XG5cdFx0cmV0dXJuIHNyYyA/IFVybC5yZXNvbHZlKHNyYywgZG9jdW1lbnRVcmwpIDogXCJcIjtcblx0fVxuXHRcblx0LyoqXG5cdCAqIExvYWRzIHRoZSBjb250ZW50IG9mIGFueSByZW1vdGUgPHNlY3Rpb24+IGVsZW1lbnRzXG5cdCAqIGRlZmluZWQgd2l0aGluIHRoZSBzcGVjaWZpZWQgY29udGFpbmVyIGVsZW1lbnQuXG5cdCAqL1xuXHRleHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZVJlbW90ZVNlY3Rpb25zKFxuXHRcdGNvbnRhaW5lcjogUGFyZW50Tm9kZSA9IGRvY3VtZW50LFxuXHRcdGRvY3VtZW50VXJsID0gVXJsLmdldEN1cnJlbnQoKSlcblx0e1xuXHRcdGNvbnN0IHJlbW90ZVNlY3Rpb25zID0gSHRtbEZlZWQuZ2V0UmVtb3RlU2VjdGlvbkVsZW1lbnRzKGNvbnRhaW5lcik7XG5cdFx0Zm9yIChjb25zdCByZW1vdGVTZWN0aW9uIG9mIHJlbW90ZVNlY3Rpb25zKVxuXHRcdHtcblx0XHRcdGJsb2NrOlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCByZW1vdGVVcmwgPSBIdG1sRmVlZC5nZXRSZW1vdGVTZWN0aW9uU291cmNlKHJlbW90ZVNlY3Rpb24sIGRvY3VtZW50VXJsKTtcblx0XHRcdFx0aWYgKCFyZW1vdGVVcmwpXG5cdFx0XHRcdFx0YnJlYWsgYmxvY2s7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCBwb3N0ZXIgPSBhd2FpdCBIdG1sRmVlZC5nZXRQb3N0ZXJGcm9tVXJsKHJlbW90ZVVybCk7XG5cdFx0XHRcdGlmICghcG9zdGVyKVxuXHRcdFx0XHRcdGJyZWFrIGJsb2NrO1xuXHRcdFx0XHRcblx0XHRcdFx0cmVtb3RlU2VjdGlvbi5yZXBsYWNlV2l0aChwb3N0ZXIpO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmVtb3RlU2VjdGlvbi5yZW1vdmUoKTtcblx0XHR9XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIEh0bWxGZWVkXG57XG5cdC8qKlxuXHQgKiBNYWluIGVudHJ5IHBvaW50IGZvciB3aGVuIHRoZSByZWFscy5qcyBzY3JpcHQgaXMgXG5cdCAqIGVtYmVkZGVkIHdpdGhpbiBhIHdlYiBwYWdlLlxuXHQgKi9cblx0aWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIiAmJiBcblx0XHR0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmXG5cdFx0ZG9jdW1lbnQucmVhZHlTdGF0ZSAhPT0gXCJjb21wbGV0ZVwiKVxuXHR7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsICgpID0+IHN0YXJ0dXAoKSk7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRhc3luYyBmdW5jdGlvbiBzdGFydHVwKClcblx0e1xuXHRcdEh0bWxGZWVkLnJlc29sdmVSZW1vdGVTZWN0aW9ucygpO1xuXHRcdFxuXHRcdGxldCBsYXN0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIkJPRFkgPiBTRUNUSU9OOmxhc3Qtb2YtdHlwZVwiKSE7XG5cdFx0aWYgKCEobGFzdCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSlcblx0XHRcdHJldHVybjtcblx0XHRcblx0XHRjb25zdCBmZWVkSW5mb3MgPSBIdG1sRmVlZC5nZXRGZWVkc0Zyb21Eb2N1bWVudCgpO1xuXHRcdGZvciAoY29uc3QgZmVlZEluZm8gb2YgZmVlZEluZm9zKVxuXHRcdHtcblx0XHRcdGlmICghZmVlZEluZm8udmlzaWJsZSlcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHVybHMgPSBhd2FpdCBIdG1sRmVlZC5nZXRGZWVkVXJscyhmZWVkSW5mby5ocmVmKTtcblx0XHRcdGlmICghdXJscylcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcblx0XHRcdGNvbnN0IG9tbml2aWV3ID0gSHRtbEZlZWQuZ2V0RW1iZWRkZWRPbW5pdmlld0Zyb21GZWVkKHVybHMpO1xuXHRcdFx0bGFzdC5pbnNlcnRBZGphY2VudEVsZW1lbnQoXCJhZnRlcmVuZFwiLCBvbW5pdmlldyk7XG5cdFx0XHRsYXN0ID0gb21uaXZpZXc7XG5cdFx0fVxuXHR9XG5cdFxuXHRkZWNsYXJlIGNvbnN0IG1vZHVsZTogYW55O1xuXHR0eXBlb2YgbW9kdWxlID09PSBcIm9iamVjdFwiICYmIE9iamVjdC5hc3NpZ24obW9kdWxlLmV4cG9ydHMsIHsgSHRtbEZlZWQgfSk7XG59XG4iLCJcbm5hbWVzcGFjZSBIdG1sRmVlZFxue1xuXHQvKipcblx0ICogQSBuYW1lc3BhY2Ugb2YgZnVuY3Rpb25zIHRoYXQgcGVyZm9ybSBVUkwgbWFuaXB1bGF0aW9uLlxuXHQgKi9cblx0ZXhwb3J0IG5hbWVzcGFjZSBVcmxcblx0e1xuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgdGhlIFVSTCBvZiB0aGUgY29udGFpbmluZyBmb2xkZXIgb2YgdGhlIHNwZWNpZmllZCBVUkwuXG5cdFx0ICogVGhlIHByb3ZpZGVkIFVSTCBtdXN0IGJlIHZhbGlkLCBvciBhbiBleGNlcHRpb24gd2lsbCBiZSB0aHJvd24uXG5cdFx0ICovXG5cdFx0ZXhwb3J0IGZ1bmN0aW9uIGZvbGRlck9mKHVybDogc3RyaW5nKVxuXHRcdHtcblx0XHRcdGNvbnN0IGxvID0gbmV3IFVSTCh1cmwpO1xuXHRcdFx0Y29uc3QgcGFydHMgPSBsby5wYXRobmFtZS5zcGxpdChcIi9cIikuZmlsdGVyKHMgPT4gISFzKTtcblx0XHRcdGNvbnN0IGxhc3QgPSBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXTtcblx0XHRcdFxuXHRcdFx0aWYgKC9cXC5bYS16MC05XSskL2kudGVzdChsYXN0KSlcblx0XHRcdFx0cGFydHMucG9wKCk7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHBhdGggPSBwYXJ0cy5qb2luKFwiL1wiKSArIFwiL1wiO1xuXHRcdFx0cmV0dXJuIHJlc29sdmUocGF0aCwgbG8ucHJvdG9jb2wgKyBcIi8vXCIgKyBsby5ob3N0KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyB0aGUgVVJMIHByb3ZpZGVkIGluIGZ1bGx5IHF1YWxpZmllZCBmb3JtLFxuXHRcdCAqIHVzaW5nIHRoZSBzcGVjaWZpZWQgYmFzZSBVUkwuXG5cdFx0ICovXG5cdFx0ZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmUocGF0aDogc3RyaW5nLCBiYXNlOiBzdHJpbmcpXG5cdFx0e1xuXHRcdFx0aWYgKC9eW2Etel0rOi8udGVzdChwYXRoKSlcblx0XHRcdFx0cmV0dXJuIHBhdGg7XG5cdFx0XHRcblx0XHRcdHRyeVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoIWJhc2UuZW5kc1dpdGgoXCIvXCIpKVxuXHRcdFx0XHRcdGJhc2UgKz0gXCIvXCI7XG5cdFx0XHRcdFxuXHRcdFx0XHRyZXR1cm4gbmV3IFVSTChwYXRoLCBiYXNlKS50b1N0cmluZygpO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGUpXG5cdFx0XHR7XG5cdFx0XHRcdGRlYnVnZ2VyO1xuXHRcdFx0XHRyZXR1cm4gbnVsbCBhcyBuZXZlcjtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogR2V0cyB0aGUgYmFzZSBVUkwgb2YgdGhlIGRvY3VtZW50IGxvYWRlZCBpbnRvIHRoZSBjdXJyZW50IGJyb3dzZXIgd2luZG93LlxuXHRcdCAqIEFjY291bnRzIGZvciBhbnkgSFRNTCA8YmFzZT4gdGFncyB0aGF0IG1heSBiZSBkZWZpbmVkIHdpdGhpbiB0aGUgZG9jdW1lbnQuXG5cdFx0ICovXG5cdFx0ZXhwb3J0IGZ1bmN0aW9uIGdldEN1cnJlbnQoKVxuXHRcdHtcblx0XHRcdGlmIChzdG9yZWRVcmwpXG5cdFx0XHRcdHJldHVybiBzdG9yZWRVcmw7XG5cdFx0XHRcblx0XHRcdGxldCB1cmwgPSBVcmwuZm9sZGVyT2YoZG9jdW1lbnQuVVJMKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgYmFzZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJiYXNlW2hyZWZdXCIpO1xuXHRcdFx0aWYgKGJhc2UpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGhyZWYgPSBiYXNlLmdldEF0dHJpYnV0ZShcImhyZWZcIikgfHwgXCJcIjtcblx0XHRcdFx0aWYgKGhyZWYpXG5cdFx0XHRcdFx0dXJsID0gVXJsLnJlc29sdmUoaHJlZiwgdXJsKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIHN0b3JlZFVybCA9IHVybDtcblx0XHR9XG5cdFx0bGV0IHN0b3JlZFVybCA9IFwiXCI7XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIEh0bWxGZWVkXG57XG5cdC8vIyBQYWdlc1xuXHRcblx0LyoqXG5cdCAqIE9yZ2FuaXplcyB0aGUgc3BlY2lmaWVkIGVsZW1lbnQgb3IgZWxlbWVudHMgaW50byB0aGVcblx0ICogc2hhZG93IHJvb3Qgb2YgYSBuZXdseSBjcmVhdGVkIDxkaXY+IGVsZW1lbnQuXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gZ2V0U2FuZGJveGVkRWxlbWVudChcblx0XHRjb250ZW50czogSFRNTEVsZW1lbnQgfCBIVE1MRWxlbWVudFtdLFxuXHRcdGJhc2VVcmw6IHN0cmluZylcblx0e1xuXHRcdGNvbnN0IGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG5cdFx0Y29uc3QgaGVhZDogSFRNTEVsZW1lbnRbXSA9IFtIdG1sRmVlZC5nZXRTdGFuZGFyZENzcygpXTtcblx0XHRjb25zdCBib2R5OiBIVE1MRWxlbWVudFtdID0gW107XG5cdFx0Y29uc3Qgc2hhZG93ID0gY29udGFpbmVyLmF0dGFjaFNoYWRvdyh7IG1vZGU6IFwib3BlblwiIH0pO1xuXHRcdFxuXHRcdGZvciAoY29uc3QgZWxlbWVudCBvZiBBcnJheS5pc0FycmF5KGNvbnRlbnRzKSA/IGNvbnRlbnRzIDogW2NvbnRlbnRzXSlcblx0XHR7XG5cdFx0XHRjb25zdCBuID0gZWxlbWVudC5ub2RlTmFtZTtcblx0XHRcdFxuXHRcdFx0aWYgKG4gPT09IFwiU0VDVElPTlwiKVxuXHRcdFx0XHRib2R5LnB1c2goZWxlbWVudCk7XG5cdFx0XHRcblx0XHRcdGVsc2UgaWYgKG4gPT09IFwiTElOS1wiIHx8IG4gPT09IFwiU1RZTEVcIilcblx0XHRcdFx0aGVhZC5wdXNoKGVsZW1lbnQpO1xuXHRcdH1cblx0XHRcblx0XHRzaGFkb3cuYXBwZW5kKC4uLmhlYWQsIC4uLmJvZHkpO1xuXHRcdGJhc2VVcmwgPSBVcmwuZm9sZGVyT2YoYmFzZVVybCk7XG5cdFx0Y29udmVydEVtYmVkZGVkVXJsc1RvQWJzb2x1dGUoc2hhZG93LCBiYXNlVXJsKTtcblx0XHRyZXR1cm4gY29udGFpbmVyO1xuXHR9XG5cdFxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRmdW5jdGlvbiBjb252ZXJ0RW1iZWRkZWRVcmxzVG9BYnNvbHV0ZShwYXJlbnQ6IFBhcmVudE5vZGUsIGJhc2VVcmw6IHN0cmluZylcblx0e1xuXHRcdGNvbnN0IGVsZW1lbnRzID0gZ2V0RWxlbWVudHMoc2VsZWN0b3JGb3JVcmxzLCBwYXJlbnQpO1xuXHRcdFxuXHRcdGlmIChwYXJlbnQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudClcblx0XHRcdGVsZW1lbnRzLnVuc2hpZnQocGFyZW50KTtcblx0XHRcblx0XHRmb3IgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpXG5cdFx0e1xuXHRcdFx0Y29uc3QgYXR0cnMgPSBhdHRyc1dpdGhVcmxzXG5cdFx0XHRcdC5tYXAoYSA9PiBlbGVtZW50LmdldEF0dHJpYnV0ZU5vZGUoYSkpXG5cdFx0XHRcdC5maWx0ZXIoKGEpOiBhIGlzIEF0dHIgPT4gISFhKTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBhdHRyaWJ1dGUgb2YgYXR0cnMpXG5cdFx0XHRcdGF0dHJpYnV0ZS52YWx1ZSA9IFVybC5yZXNvbHZlKGF0dHJpYnV0ZS52YWx1ZSwgYmFzZVVybCk7XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgcCBvZiBjc3NQcm9wZXJ0aWVzV2l0aFVybHMpXG5cdFx0XHR7XG5cdFx0XHRcdGxldCBwdiA9IGVsZW1lbnQuc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShwKTtcblx0XHRcdFx0aWYgKHB2ID09PSBcIlwiKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcblx0XHRcdFx0cHYgPSBwdi5yZXBsYWNlKC9cXGJ1cmxcXChcIi4rP1wiXFwpLywgc3Vic3RyID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCB1bndyYXBVcmwgPSBzdWJzdHIuc2xpY2UoNSwgLTIpO1xuXHRcdFx0XHRcdGNvbnN0IHVybCA9IFVybC5yZXNvbHZlKHVud3JhcFVybCwgYmFzZVVybCk7XG5cdFx0XHRcdFx0cmV0dXJuIGB1cmwoXCIke3VybH1cIilgO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkocCwgcHYpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRcblx0Y29uc3QgYXR0cnNXaXRoVXJscyA9IFtcImhyZWZcIiwgXCJzcmNcIiwgXCJhY3Rpb25cIiwgXCJkYXRhLXNyY1wiXTtcblx0Y29uc3Qgc2VsZWN0b3JGb3JVcmxzID0gXCJMSU5LW2hyZWZdLCBBW2hyZWZdLCBJTUdbc3JjXSwgRk9STVthY3Rpb25dLCBTQ1JJUFRbc3JjXSwgW3N0eWxlXVwiO1xuXHRjb25zdCBjc3NQcm9wZXJ0aWVzV2l0aFVybHMgPSBbXG5cdFx0XCJiYWNrZ3JvdW5kXCIsXG5cdFx0XCJiYWNrZ3JvdW5kLWltYWdlXCIsXG5cdFx0XCJib3JkZXItaW1hZ2VcIixcblx0XHRcImJvcmRlci1pbWFnZS1zb3VyY2VcIixcblx0XHRcImNvbnRlbnRcIixcblx0XHRcImN1cnNvclwiLFxuXHRcdFwibGlzdC1zdHlsZS1pbWFnZVwiLFxuXHRcdFwibWFza1wiLFxuXHRcdFwibWFzay1pbWFnZVwiLFxuXHRcdFwib2Zmc2V0LXBhdGhcIixcblx0XHRcInNyY1wiLFxuXHRdO1xuXHRcblx0LyoqXG5cdCAqIFJlYWRzIGFuIEhUTUwgcGFnZSBmcm9tIHRoZSBzcGVjaWZpZWQgVVJMLCBhbmQgcmV0dXJucyBhblxuXHQgKiBvYmplY3QgdGhhdCBjb250YWlucyB0aGUgcmVsZXZhbnQgY29udGVudC5cblx0ICovXG5cdGV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRQYWdlRnJvbVVybCh1cmw6IHN0cmluZylcblx0e1xuXHRcdGNvbnN0IGJhc2VVcmwgPSBVcmwuZm9sZGVyT2YodXJsKTtcblx0XHRjb25zdCBkb2MgPSBhd2FpdCBnZXREb2N1bWVudEZyb21VcmwodXJsKTtcblx0XHRpZiAoIWRvYylcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdFxuXHRcdGNvbnN0IHNlY3Rpb25zID0gZ2V0RWxlbWVudHMoXCJCT0RZID4gU0VDVElPTlwiLCBkb2MpO1xuXHRcdGNvbnN0IGZlZWRzID0gZ2V0RmVlZHNGcm9tRG9jdW1lbnQoZG9jKTtcblx0XHRjb25zdCBmZWVkc1VybHMgPSBmZWVkcy5tYXAoZiA9PiBmLmhyZWYpO1xuXHRcdGNvbnN0IGhlYWQgPSBnZXRFbGVtZW50cyhcIkxJTkssIFNUWUxFXCIsIGRvYy5oZWFkKVxuXHRcdFx0LmZpbHRlcihlID0+ICFmZWVkc1VybHMuaW5jbHVkZXMoZS5nZXRBdHRyaWJ1dGUoXCJocmVmXCIpIHx8IFwiXCIpKTtcblx0XHRcblx0XHRmb3IgKGNvbnN0IGVsZW1lbnQgb2YgWy4uLmhlYWQsIC4uLnNlY3Rpb25zXSlcblx0XHRcdGNvbnZlcnRFbWJlZGRlZFVybHNUb0Fic29sdXRlKGVsZW1lbnQsIGJhc2VVcmwpO1xuXHRcdFxuXHRcdHJldHVybiB7XG5cdFx0XHR1cmwsXG5cdFx0XHRkb2N1bWVudDogZG9jLFxuXHRcdFx0aGVhZCxcblx0XHRcdGZlZWRzLFxuXHRcdFx0c2VjdGlvbnMsXG5cdFx0fTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIFNjYW5zIGEgZG9jdW1lbnQgZm9yIDxsaW5rPiB0YWdzIHRoYXQgcmVmZXIgdG8gZmVlZHMgb2YgSFRNTCBIdG1sRmVlZC5cblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBnZXRGZWVkc0Zyb21Eb2N1bWVudChkb2MgPSBkb2N1bWVudClcblx0e1xuXHRcdGNvbnN0IGZlZWRzOiBJRmVlZEluZm9bXSA9IFtdO1xuXHRcdGNvbnN0IGZlID0gZ2V0RWxlbWVudHMoXCJMSU5LW3JlbD1mZWVkXVwiLCBkb2MpO1xuXHRcdFxuXHRcdGZvciAoY29uc3QgZSBvZiBmZSlcblx0XHR7XG5cdFx0XHRjb25zdCBocmVmID0gZS5nZXRBdHRyaWJ1dGUoXCJocmVmXCIpO1xuXHRcdFx0aWYgKCFocmVmKVxuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgdmlzaWJsZUF0dHIgPSBlLmdldEF0dHJpYnV0ZShcImRpc2FibGVkXCIpPy50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0Y29uc3QgdmlzaWJsZSA9IHR5cGVvZiB2aXNpYmxlQXR0ciA9PT0gXCJzdHJpbmdcIiAmJiB2aXNpYmxlQXR0ciAhPT0gXCJmYWxzZVwiO1xuXHRcdFx0Y29uc3Qgc3Vic2NyaWJhYmxlQXR0ciA9IGUuZ2V0QXR0cmlidXRlKFwidHlwZVwiKT8udG9Mb3dlckNhc2UoKTtcblx0XHRcdGNvbnN0IHN1YnNjcmliYWJsZSA9IHN1YnNjcmliYWJsZUF0dHIgPT09IFwidGV4dC9mZWVkXCI7XG5cdFx0XHRmZWVkcy5wdXNoKHsgdmlzaWJsZSwgc3Vic2NyaWJhYmxlLCBocmVmIH0pO1xuXHRcdH1cblx0XHRcblx0XHRyZXR1cm4gZmVlZHM7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBTdG9yZXMgdGhlIGluZm9ybWF0aW9uIGFib3V0IGEgZmVlZCBkZWZpbmVkIGJ5IGEgPGxpbms+IHRhZyBpbiBhIHBhZ2UuXG5cdCAqL1xuXHRleHBvcnQgaW50ZXJmYWNlIElGZWVkSW5mb1xuXHR7XG5cdFx0cmVhZG9ubHkgc3Vic2NyaWJhYmxlOiBib29sZWFuO1xuXHRcdHJlYWRvbmx5IHZpc2libGU6IGJvb2xlYW47XG5cdFx0cmVhZG9ubHkgaHJlZjogc3RyaW5nO1xuXHR9XG5cdFxuXHQvKipcblx0ICogUmVhZHMgYSBET00gRG9jdW1lbnQgb2JqZWN0IHN0b3JlZCBhdCB0aGUgc3BlY2lmaWVkIFVSTCxcblx0ICogYW5kIHJldHVybnMgYSBzYW5pdGl6ZWQgdmVyc2lvbiBvZiBpdC5cblx0ICovXG5cdGV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXREb2N1bWVudEZyb21VcmwodXJsOiBzdHJpbmcpXG5cdHtcblx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBnZXRIdHRwQ29udGVudCh1cmwpO1xuXHRcdGlmICghcmVzdWx0KVxuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XG5cdFx0Y29uc3QgZG9jVXJpID0gVXJsLmZvbGRlck9mKHVybCk7XG5cdFx0Y29uc3Qgc2FuaXRpemVyID0gbmV3IEZvcmVpZ25Eb2N1bWVudFNhbml0aXplcihyZXN1bHQudGV4dCwgZG9jVXJpKTtcblx0XHRyZXR1cm4gc2FuaXRpemVyLnJlYWQoKTtcblx0fVxuXHRcblx0Ly8jIEZlZWRzXG5cdFxuXHQvKipcblx0ICogUmV0dXJucyBhIGZ1bGx5LXF1YWxpZmllZCB2ZXJzaW9uIG9mIGEgZmVlZCBVUkwgZGVmaW5lZCB3aXRoaW4gdGhlIHNwZWNpZmllZFxuXHQgKiBOb2RlLiBJZiB0aGUgd2l0aGluIGFyZ3VtZW50IGlzIG9taXR0ZWQsIHRoZSBjdXJyZW50IGRvY3VtZW50IGlzIHVzZWQuXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gZ2V0RmVlZFVybCh3aXRoaW46IFBhcmVudE5vZGUgPSBkb2N1bWVudClcblx0e1xuXHRcdGNvbnN0IGxpbmsgPSB3aXRoaW4ucXVlcnlTZWxlY3RvcihgTElOS1tyZWw9XCJmZWVkXCJdW2hyZWZdYCk7XG5cdFx0Y29uc3QgaHJlZiA9IGxpbmsgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCA/IGxpbmsuZ2V0QXR0cmlidXRlKFwiaHJlZlwiKSA6IFwiXCI7XG5cdFx0cmV0dXJuIGhyZWYgPyBVcmwucmVzb2x2ZShocmVmLCBVcmwuZ2V0Q3VycmVudCgpKSA6IFwiXCI7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBSZWFkcyB0aGUgVVJMcyBkZWZpbmVkIGluIHRoZSBmZWVkIGZpbGUgbG9jYXRlZCBhdCB0aGUgc3BlY2lmaWVkXG5cdCAqIFVSTC4gVGhlIGZ1bmN0aW9uIGFjY2VwdHMgYSBzdGFydGluZ0J5dGUgYXJndW1lbnQgdG8gYWxsb3cgZm9yXG5cdCAqIHBhcnRpYWwgZG93bmxvYWRzIGNvbnRhaW5pbmcgb25seSB0aGUgbmV3IGNvbnRlbnQgaW4gdGhlIGZlZWQuXG5cdCAqL1xuXHRleHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0RmVlZFVybHMoZmVlZFVybDogc3RyaW5nKVxuXHR7XG5cdFx0Y29uc3QgdXJsczogc3RyaW5nW10gPSBbXTtcblx0XHRjb25zdCBmZXRjaFJlc3VsdCA9IGF3YWl0IGdldEh0dHBDb250ZW50KGZlZWRVcmwpO1xuXHRcdFxuXHRcdGlmICghZmV0Y2hSZXN1bHQpXG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRcblx0XHRsZXQgYnl0ZXNSZWFkID0gLTE7XG5cdFx0Y29uc3QgdHlwZSA9IChmZXRjaFJlc3VsdC5oZWFkZXJzLmdldChcIkNvbnRlbnQtVHlwZVwiKSB8fCBcIlwiKS5zcGxpdChcIjtcIilbMF07XG5cdFx0aWYgKHR5cGUgIT09IFwidGV4dC9wbGFpblwiKVxuXHRcdHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoXG5cdFx0XHRcdFwiRmVlZCBhdCBVUkw6IFwiICsgZmVlZFVybCArIFwid2FzIHJldHVybmVkIHdpdGggYW4gaW5jb3JyZWN0IFwiICtcblx0XHRcdFx0XCJtaW1lIHR5cGUuIEV4cGVjdGVkIG1pbWUgdHlwZSBpcyBcXFwidGV4dC9wbGFpblxcXCIsIGJ1dCB0aGUgbWltZSB0eXBlIFxcXCJcIiArIFxuXHRcdFx0XHR0eXBlICsgXCJcXFwiIHdhcyByZXR1cm5lZC5cIik7XG5cdFx0XHRcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dXJscy5wdXNoKC4uLmZldGNoUmVzdWx0LnRleHRcblx0XHRcdFx0LnNwbGl0KFwiXFxuXCIpXG5cdFx0XHRcdC5tYXAocyA9PiBzLnRyaW0oKSlcblx0XHRcdFx0LmZpbHRlcihzID0+ICEhcylcblx0XHRcdFx0LmZpbHRlcihzID0+ICFzLnN0YXJ0c1dpdGgoXCIjXCIpKVxuXHRcdFx0XHQubWFwKHMgPT4gVXJsLnJlc29sdmUocywgVXJsLmZvbGRlck9mKGZlZWRVcmwpKSkpO1xuXHRcdFx0XG5cdFx0XHRieXRlc1JlYWQgPSBmZXRjaFJlc3VsdC50ZXh0Lmxlbmd0aCB8fCAwO1xuXHRcdH1cblx0XHRcblx0XHRyZXR1cm4gdXJscztcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBpbnRlcmZhY2UgSUZlZWRDb250ZW50c1xuXHR7XG5cdFx0cmVhZG9ubHkgdXJsczogc3RyaW5nW107XG5cdFx0cmVhZG9ubHkgYnl0ZXNSZWFkOiBudW1iZXI7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBGaW5kcyB0aGUgbWV0YSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgZmVlZCBhdCB0aGUgc3BlY2lmaWVkIFVSTC5cblx0ICogVGhlIGFsZ29yaXRobSB1c2VkIGlzIGEgdXBzY2FuIG9mIHRoZSBmb2xkZXIgc3RydWN0dXJlIG9mIHRoZSBzcGVjaWZpZWQgVVJMLFxuXHQgKiBzdGFydGluZyBhdCBpdCdzIGJhc2UgZGlyZWN0b3J5LCBhbmQgc2Nhbm5pbmcgdXB3YXJkcyB1bnRpbCB0aGUgcm9vdFxuXHQgKiBkb21haW4gaXMgcmVhY2hlZC5cblx0ICovXG5cdGV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRGZWVkTWV0YURhdGEoZmVlZFVybDogc3RyaW5nKTogUHJvbWlzZTxJRmVlZE1ldGFEYXRhPlxuXHR7XG5cdFx0bGV0IGN1cnJlbnRVcmwgPSBVcmwuZm9sZGVyT2YoZmVlZFVybCk7XG5cdFx0XG5cdFx0bGV0IGF1dGhvciA9IFwiXCI7XG5cdFx0bGV0IGRlc2NyaXB0aW9uID0gXCJcIjtcblx0XHRsZXQgaWNvbiA9IFwiXCI7XG5cdFx0XG5cdFx0Zm9yIChsZXQgc2FmZXR5ID0gMTAwMDsgc2FmZXR5LS0gPiAwOylcblx0XHR7XG5cdFx0XHRjb25zdCBodHRwQ29udGVudCA9IGF3YWl0IEh0bWxGZWVkLmdldEh0dHBDb250ZW50KGN1cnJlbnRVcmwsIFwicXVpZXRcIik7XG5cdFx0XHRpZiAoaHR0cENvbnRlbnQpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGh0bWxDb250ZW50ID0gaHR0cENvbnRlbnQudGV4dDtcblx0XHRcdFx0Y29uc3QgcmVhZGVyID0gbmV3IEZvcmVpZ25Eb2N1bWVudFJlYWRlcihodG1sQ29udGVudCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRcblx0XHRcdFx0cmVhZGVyLnRyYXBFbGVtZW50KGVsZW1lbnQgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChlbGVtZW50Lm5vZGVOYW1lID09PSBcIk1FVEFcIilcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjb25zdCBuYW1lID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJuYW1lXCIpPy50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRpZiAobmFtZSA9PT0gXCJkZXNjcmlwdGlvblwiKVxuXHRcdFx0XHRcdFx0XHRkZXNjcmlwdGlvbiA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiY29udGVudFwiKSB8fCBcIlwiO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRlbHNlIGlmIChuYW1lID09PSBcImF1dGhvclwiKVxuXHRcdFx0XHRcdFx0XHRhdXRob3IgPSBlbGVtZW50LmdldEF0dHJpYnV0ZShcImNvbnRlbnRcIikgfHwgXCJcIjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSBpZiAoZWxlbWVudC5ub2RlTmFtZSA9PT0gXCJMSU5LXCIpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Y29uc3QgcmVsID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJyZWxcIik/LnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGlmIChyZWwgPT09IFwiaWNvblwiKVxuXHRcdFx0XHRcdFx0XHRpY29uID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJocmVmXCIpIHx8IFwiXCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0XG5cdFx0XHRcdHJlYWRlci5yZWFkKCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoYXV0aG9yIHx8IGRlc2NyaXB0aW9uIHx8IGljb24pXG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XG5cdFx0XHRjb25zdCB1cmwgPSBuZXcgVVJMKFwiLi5cIiwgY3VycmVudFVybCk7XG5cdFx0XHRpZiAoY3VycmVudFVybCA9PT0gdXJsLnRvU3RyaW5nKCkpXG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0XG5cdFx0XHRjdXJyZW50VXJsID0gdXJsLnRvU3RyaW5nKCk7XG5cdFx0fVxuXHRcdFxuXHRcdHJldHVybiB7IHVybDogZmVlZFVybCwgYXV0aG9yLCBkZXNjcmlwdGlvbiwgaWNvbiB9O1xuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGludGVyZmFjZSBJRmVlZE1ldGFEYXRhXG5cdHtcblx0XHRyZWFkb25seSB1cmw6IHN0cmluZztcblx0XHRyZWFkb25seSBhdXRob3I6IHN0cmluZztcblx0XHRyZWFkb25seSBkZXNjcmlwdGlvbjogc3RyaW5nO1xuXHRcdHJlYWRvbmx5IGljb246IHN0cmluZztcblx0fVxuXHRcblx0LyoqXG5cdCAqIFJlYWRzIHRoZSBwb3N0ZXIgPHNlY3Rpb24+IHN0b3JlZCBpbiB0aGUgcGFnZSBhdCB0aGUgc3BlY2lmaWVkIFVSTC5cblx0ICovXG5cdGV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRQb3N0ZXJGcm9tVXJsKHBhZ2VVcmw6IHN0cmluZyk6IFByb21pc2U8SFRNTEVsZW1lbnQgfCBudWxsPlxuXHR7XG5cdFx0Y29uc3QgcGFnZSA9IGF3YWl0IGdldFBhZ2VGcm9tVXJsKHBhZ2VVcmwpO1xuXHRcdHJldHVybiBwYWdlPy5zZWN0aW9ucy5sZW5ndGggP1xuXHRcdFx0SHRtbEZlZWQuZ2V0U2FuZGJveGVkRWxlbWVudChbLi4ucGFnZS5oZWFkLCBwYWdlLnNlY3Rpb25zWzBdXSwgcGFnZS51cmwpIDpcblx0XHRcdG51bGw7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBSZWFkcyBwb3N0ZXJzIGZyb20gYSBmZWVkIHRleHQgZmlsZSBsb2NhdGVkIGF0IHRoZSBzcGVjaWZpZWQgVVJMLlxuXHQgKiBcblx0ICogQHJldHVybnMgQW4gYXN5bmMgZ2VuZXJhdG9yIGZ1bmN0aW9uIHRoYXQgaXRlcmF0ZXMgdGhyb3VnaFxuXHQgKiBldmVyeSBwYWdlIHNwZWNpZmllZCBpbiB0aGUgc3BlY2lmaWVkIGZlZWQgVVJMLCBhbmQgcmV0dXJuc1xuXHQgKiB0aGUgcG9zdGVyIGFzc29jaWF0ZWQgd2l0aCBlYWNoIHBhZ2UuXG5cdCAqL1xuXHRleHBvcnQgYXN5bmMgZnVuY3Rpb24gKiBnZXRQb3N0ZXJzRnJvbUZlZWQoZmVlZFVybDogc3RyaW5nKVxuXHR7XG5cdFx0Y29uc3QgdXJscyA9IGF3YWl0IEh0bWxGZWVkLmdldEZlZWRVcmxzKGZlZWRVcmwpO1xuXHRcdGlmICghdXJscylcblx0XHRcdHJldHVybjtcblx0XHRcblx0XHRmb3IgKGNvbnN0IHVybCBvZiB1cmxzKVxuXHRcdHtcblx0XHRcdGNvbnN0IHBhZ2UgPSBhd2FpdCBIdG1sRmVlZC5nZXRQYWdlRnJvbVVybCh1cmwpO1xuXHRcdFx0Y29uc3QgcG9zdGVyID0gcGFnZT8uc2VjdGlvbnMubGVuZ3RoID9cblx0XHRcdFx0SHRtbEZlZWQuZ2V0U2FuZGJveGVkRWxlbWVudChbLi4ucGFnZS5oZWFkLCBwYWdlLnNlY3Rpb25zWzBdXSwgcGFnZS51cmwpIDpcblx0XHRcdFx0bnVsbDtcblx0XHRcdFxuXHRcdFx0aWYgKHBvc3Rlcilcblx0XHRcdFx0eWllbGQgeyBwb3N0ZXIsIHVybCB9O1xuXHRcdH1cblx0fVxuXHRcblx0LyoqXG5cdCAqIFJldHVybnMgYW4gT21uaXZpZXcgdGhhdCBpcyBhdXRvbWF0aWNhbGx5IHBvcHVsYXRlZCB3aXRoIHRoZVxuXHQgKiBwb3N0ZXJzIGZyb20gdGhlIHNwZWNpZmllZCBVUkxzLiBUaGUgT21uaXZpZXcgaXMgd3JhcHBlZCBpbnNpZGVcblx0ICogYW5kIGVsZW1lbnQgdGhhdCBtYWtlcyB0aGUgT21uaXZpZXcgc3VpdGFibGUgZm9yIGVtYmVkZGluZyBvblxuXHQgKiBhIHB1YmxpYyB3ZWJzaXRlLlxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGdldEVtYmVkZGVkT21uaXZpZXdGcm9tRmVlZChcblx0XHR1cmxzOiBzdHJpbmdbXSxcblx0XHRvbW5pdmlld09wdGlvbnM6IFBhcnRpYWw8SU9tbml2aWV3T3B0aW9ucz4gPSB7fSlcblx0e1xuXHRcdGlmICh0eXBlb2YgT21uaXZpZXcgPT09IFwidW5kZWZpbmVkXCIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJPbW5pdmlldyBsaWJyYXJ5IG5vdCBmb3VuZC5cIik7XG5cdFx0XG5cdFx0Y29uc3QgaG90ID0gbmV3IEhvdCgpO1xuXHRcdGNvbnN0IG9tbml2aWV3ID0gZ2V0T21uaXZpZXdGcm9tRmVlZCh1cmxzLCBvbW5pdmlld09wdGlvbnMpIGFzIE9tbml2aWV3LkNsYXNzO1xuXHRcdFxuXHRcdGNvbnN0IG91dCA9IGhvdC5kaXYoXG5cdFx0XHRcIm9tbml2aWV3LWNvbnRhaW5lclwiLFxuXHRcdFx0e1xuXHRcdFx0XHRwb3NpdGlvbjogXCJyZWxhdGl2ZVwiLFxuXHRcdFx0XHRzY3JvbGxTbmFwQWxpZ246IFwic3RhcnRcIixcblx0XHRcdFx0c2Nyb2xsU25hcFN0b3A6IFwiYWx3YXlzXCIsXG5cdFx0XHRcdG1pbkhlaWdodDogXCIyMDB2aFwiLFxuXHRcdFx0fSxcblx0XHRcdC8vIFRoaXMgb3ZlcnJpZGVzIHRoZSBcInBvc2l0aW9uOiBmaXhlZFwiIHNldHRpbmcgd2hpY2ggaXMgdGhlXG5cdFx0XHQvLyBkZWZhdWx0IGZvciBhbiBvbW5pdmlldy4gVGhlIG9tbml2aWV3J3MgZGVmYXVsdCBmaXhlZFxuXHRcdFx0Ly8gc2V0dGluZyBkb2VzIHNlZW0gYSBiaXQgYnJva2VuLiBGdXJ0aGVyIGludmVzdGlnYXRpb25cblx0XHRcdC8vIGlzIG5lZWRlZCB0byBkZXRlcm1pbmUgaWYgdGhpcyBpcyBhcHByb3ByaWF0ZS5cblx0XHRcdGhvdC5nZXQob21uaXZpZXcpKHsgcG9zaXRpb246IFwicmVsYXRpdmVcIiB9KSxcblx0XHRcdC8vIFBsYWNlcyBhbiBleHRyYSBkaXYgYXQgdGhlIGJvdHRvbSBvZiB0aGUgcG9zdGVycyBsaXN0XG5cdFx0XHQvLyBzbyB0aGF0IHNjcm9sbC1zbmFwcGluZyB3b3JrcyBiZXR0ZXIuXG5cdFx0XHRob3QuZGl2KFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cG9zaXRpb246IFwiYWJzb2x1dGVcIixcblx0XHRcdFx0XHRsZWZ0OiAwLFxuXHRcdFx0XHRcdHJpZ2h0OiAwLFxuXHRcdFx0XHRcdGJvdHRvbTogMCxcblx0XHRcdFx0XHRzY3JvbGxTbmFwQWxpZ246IFwiZW5kXCIsXG5cdFx0XHRcdFx0c2Nyb2xsU25hcFN0b3A6IFwiYWx3YXlzXCIsXG5cdFx0XHRcdH1cblx0XHRcdCksXG5cdFx0KTtcblx0XHRcblx0XHRjb25zdCBoZWFkID0gb21uaXZpZXcuaGVhZDtcblx0XHRsZXQgbGFzdFkgPSAtMTtcblx0XHRsZXQgbGFzdERpcmVjdGlvbiA9IDA7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgKCkgPT4gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PlxuXHRcdHtcblx0XHRcdGlmIChvbW5pdmlldy5tb2RlICE9PSBPbW5pdmlldy5PbW5pdmlld01vZGUucG9zdGVycylcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XG5cdFx0XHRjb25zdCB5ID0gd2luZG93LnNjcm9sbFk7XG5cdFx0XHRpZiAoeSA9PT0gbGFzdFkpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdFxuXHRcdFx0Y29uc3QgZGlyZWN0aW9uID0geSA+IGxhc3RZID8gMSA6IC0xO1xuXHRcdFx0bGV0IG9tbml2aWV3VmlzaWJsZSA9IGhlYWQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wIDw9IDA7XG5cdFx0XHRcblx0XHRcdGlmIChvbW5pdmlld1Zpc2libGUpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChkaXJlY3Rpb24gPT09IDEpXG5cdFx0XHRcdFx0b21uaXZpZXcuc2Nyb2xsaW5nQW5jZXN0b3Iuc3R5bGUuc2Nyb2xsU25hcFR5cGUgPSBcIm5vbmVcIjtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKGRpcmVjdGlvbiA9PT0gLTEgJiYgbGFzdERpcmVjdGlvbiA9PT0gMSlcblx0XHRcdFx0XHRvbW5pdmlldy5zY3JvbGxpbmdBbmNlc3Rvci5zdHlsZS5yZW1vdmVQcm9wZXJ0eShcInNjcm9sbC1zbmFwLXR5cGVcIik7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGxhc3REaXJlY3Rpb24gPSBkaXJlY3Rpb247XG5cdFx0XHRsYXN0WSA9IHk7XG5cdFx0XHRcblx0XHRcdC8vIEV4cGFuZCB0aGUgc2l6ZSBvZiB0aGUgb21uaXZpZXcgY29udGFpbmVyLCBpbiBvcmRlciB0byBwdXNoIHRoZVxuXHRcdFx0Ly8gZm9vdGVyIHNuYXBwZXIgZGl2IGRvd253YXJkIHNvIHRoYXQgaXQgYWxpZ25zIHdpdGggdGhlIGJvdHRvbVxuXHRcdFx0Ly8gb2YgdGhlIG9tbml2aWV3IHBvc3RlcnMuXG5cdFx0XHRjb25zdCByb3dzID0gTWF0aC5jZWlsKG9tbml2aWV3LnBvc3RlckNvdW50IC8gb21uaXZpZXcuc2l6ZSk7XG5cdFx0XHRjb25zdCB2aCA9IHJvd3MgKiAoMTAwIC8gb21uaXZpZXcuc2l6ZSk7XG5cdFx0XHRvdXQuc3R5bGUubWluSGVpZ2h0ID0gdmggKyBcInZoXCI7XG5cdFx0fSkpO1xuXHRcdFxuXHRcdHJldHVybiBvdXQ7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBSZW5kZXJzIGEgcGxhY2Vob2xkZXIgcG9zdGVyIGZvciB3aGVuIHRoZSBpdGVtIGNvdWxkbid0IGJlIGxvYWRlZC5cblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBnZXRFcnJvclBvc3RlcigpXG5cdHtcblx0XHRjb25zdCBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuXHRcdGNvbnN0IHMgPSBkaXYuc3R5bGU7XG5cdFx0cy5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcblx0XHRzLnRvcCA9IFwiMFwiO1xuXHRcdHMucmlnaHQgPSBcIjBcIjtcblx0XHRzLmJvdHRvbSA9IFwiMFwiO1xuXHRcdHMubGVmdCA9IFwiMFwiO1xuXHRcdHMud2lkdGggPSBcImZpdC1jb250ZW50XCI7XG5cdFx0cy5oZWlnaHQgPSBcImZpdC1jb250ZW50XCI7XG5cdFx0cy5tYXJnaW4gPSBcImF1dG9cIjtcblx0XHRzLmZvbnRTaXplID0gXCIyMHZ3XCI7XG5cdFx0cy5mb250V2VpZ2h0ID0gXCI5MDBcIjtcblx0XHRkaXYuYXBwZW5kKG5ldyBUZXh0KFwi4pyVXCIpKTtcblx0XHRyZXR1cm4gZGl2O1xuXHR9XG5cdFxuXHQvLyMgR2VuZXJpY1xuXHRcblx0LyoqXG5cdCAqIE1ha2VzIGFuIEhUVFAgcmVxdWVzdCB0byB0aGUgc3BlY2lmaWVkIFVSSSBhbmQgcmV0dXJuc1xuXHQgKiB0aGUgaGVhZGVycyBhbmQgYSBzdHJpbmcgY29udGFpbmluZyB0aGUgYm9keS5cblx0ICovXG5cdGV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRIdHRwQ29udGVudChyZWxhdGl2ZVVyaTogc3RyaW5nLCBxdWlldD86IFwicXVpZXRcIilcblx0e1xuXHRcdHJlbGF0aXZlVXJpID0gVXJsLnJlc29sdmUocmVsYXRpdmVVcmksIFVybC5nZXRDdXJyZW50KCkpO1xuXHRcdFxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdGNvbnN0IGhlYWRlcnM6IEhlYWRlcnNJbml0ID0ge1xuXHRcdFx0XHQvL1wicHJhZ21hXCI6IFwibm8tY2FjaGVcIixcblx0XHRcdFx0Ly9cImNhY2hlLWNvbnRyb2xcIjogXCJuby1jYWNoZVwiLFxuXHRcdFx0fTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgZmV0Y2hSZXN1bHQgPSBhd2FpdCB3aW5kb3cuZmV0Y2gocmVsYXRpdmVVcmksIHtcblx0XHRcdFx0bWV0aG9kOiBcIkdFVFwiLFxuXHRcdFx0XHRoZWFkZXJzLFxuXHRcdFx0XHRtb2RlOiBcImNvcnNcIixcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHRpZiAoIWZldGNoUmVzdWx0Lm9rKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRmV0Y2ggZmFpbGVkOiBcIiArIHJlbGF0aXZlVXJpKTtcblx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGxldCB0ZXh0ID0gXCJcIjtcblx0XHRcdFxuXHRcdFx0dHJ5XG5cdFx0XHR7XG5cdFx0XHRcdHRleHQgPSBhd2FpdCBmZXRjaFJlc3VsdC50ZXh0KCk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZSlcblx0XHRcdHtcblx0XHRcdFx0aWYgKCFxdWlldClcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRmV0Y2ggZmFpbGVkOiBcIiArIHJlbGF0aXZlVXJpKTtcblx0XHRcdFx0XG5cdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRoZWFkZXJzOiBmZXRjaFJlc3VsdC5oZWFkZXJzLFxuXHRcdFx0XHR0ZXh0LFxuXHRcdFx0fTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGUpXG5cdFx0e1xuXHRcdFx0aWYgKCFxdWlldClcblx0XHRcdFx0Y29uc29sZS5sb2coXCJFcnJvciB3aXRoIHJlcXVlc3Q6IFwiICsgcmVsYXRpdmVVcmkpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBSZXR1cm5zIGFuIGFycmF5IG9mIEhUTUxFbGVtZW50IG9iamVjdHMgdGhhdCBtYXRjaCB0aGUgc3BlY2lmaWVkIHNlbGVjdG9yLFxuXHQgKiBvcHRpb25hbGx5IHdpdGhpbiB0aGUgc3BlY2lmaWVkIHBhcmVudCBub2RlLlxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGdldEVsZW1lbnRzKHNlbGVjdG9yOiBzdHJpbmcsIGNvbnRhaW5lcjogUGFyZW50Tm9kZSA9IGRvY3VtZW50KVxuXHR7XG5cdFx0cmV0dXJuIEFycmF5LmZyb20oY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKSBhcyBIVE1MRWxlbWVudFtdO1xuXHR9XG59XG4iXX0=