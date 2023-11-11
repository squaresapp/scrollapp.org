"use strict";
// The globalThis value isn't available in Safari, so a polyfill is necessary:
if (typeof globalThis === "undefined")
    window.globalThis = window;
// If the DEBUG flag is undefined, that means that the executing code
// has not passed through terser, and so we are either running in a
// cover function, or in one of the hosts in debug mode. In this case,
// we set the compilation constants explicitly at runtime.
if (typeof DEBUG === "undefined")
    Object.assign(globalThis, { DEBUG: false });
if (typeof ELECTRON === "undefined")
    Object.assign(globalThis, { ELECTRON: typeof screen + typeof require === "objectfunction" });
if (typeof TAURI === "undefined")
    Object.assign(globalThis, { TAURI: typeof window !== "undefined" && typeof window.__TAURI__ !== "undefined" });
if (typeof IOS === "undefined")
    Object.assign(globalThis, { IOS: navigator.platform.startsWith("iP") });
if (typeof ANDROID === "undefined")
    Object.assign(globalThis, { ANDROID: navigator.userAgent.includes("Android") });
if (typeof CAPACITOR === "undefined")
    Object.assign(globalThis, { CAPACITOR: typeof Capacitor === "object" });
if (typeof DEMO === "undefined")
    Object.assign(globalThis, { DEMO: !ELECTRON && !TAURI && !CAPACITOR && window.location.pathname.indexOf("demo") > -1 });
if (typeof SIMULATOR === "undefined")
    Object.assign(globalThis, { SIMULATOR: false });
if (ELECTRON) {
    const g = globalThis;
    g.Electron = Object.freeze({
        fs: require("fs"),
        path: require("path")
    });
}
else if (TAURI) {
    const g = globalThis;
    g.Tauri = g.__TAURI__;
}
const isPwa = "standalone" in navigator ||
    window.matchMedia("(display-mode: standalone)").matches;
const isTouch = matchMedia("(pointer:coarse)").matches;
const hot = new Hot();
var ScrollApp;
(function (ScrollApp) {
    /**
     * This is the main entry point of the app.
     * When running in Tauri, this function is called from the auto-generated index.html file.
     */
    async function startup() {
        if (ELECTRON)
            FilaNode.use();
        else if (TAURI)
            FilaTauri.use();
        else if (CAPACITOR)
            FilaCapacitor.use();
        else if (DEMO)
            FilaKeyva.use();
        const g = globalThis;
        if (CAPACITOR) {
            g.Toast = g.Capacitor?.Plugins?.Toast;
            g.BackgroundFetch = g.Capacitor?.Plugins?.BackgroundFetch;
            g.Capactor?.Clipboard;
            g.Device = g.Capacitor?.Plugins?.Device;
        }
        if (DEBUG && CAPACITOR) {
            const info = await Device.getInfo();
            Object.assign(globalThis, { SIMULATOR: info.isVirtual });
        }
        if (DEBUG) {
            const dataFolder = await ScrollApp.Util.getDataFolder();
            if (!await dataFolder.exists())
                await dataFolder.writeDirectory();
            await ScrollApp.runDataInitializer(ScrollApp.feedsForDebug);
        }
        else if (DEMO) {
            await ScrollApp.Data.clear();
            await ScrollApp.runDataInitializer(ScrollApp.feedsForWeb);
        }
        ScrollApp.appendCssReset();
        await ScrollApp.Data.initialize();
        const rootHat = new ScrollApp.RootHat();
        await rootHat.construct();
        document.body.append(rootHat.head);
    }
    ScrollApp.startup = startup;
})(ScrollApp || (ScrollApp = {}));
//@ts-ignore
if (typeof module === "object")
    Object.assign(module.exports, { ScrollApp });
//! This file is assume-unchanged in git
var ScrollApp;
//! This file is assume-unchanged in git
(function (ScrollApp) {
    //@ts-ignore
    if (!DEBUG)
        return;
    ScrollApp.feedsForDebug = [
        //"https://raw.githubusercontent.com/HTMLFeeds/Examples/main/trees/index.txt",
        //"https://raw.githubusercontent.com/HTMLFeeds/Examples/main/raccoons/index.txt",
        //"http://127.0.0.1:8081/feeds/raccoons/index.txt",
        //"http://127.0.0.1:8081/feeds/trees/index.txt",
        "https://htmlfeeds.github.io/Examples/raccoons/index.txt",
        "https://htmlfeeds.github.io/Examples/trees/index.txt",
    ];
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    //@ts-ignore
    if (!DEMO)
        return;
    ScrollApp.feedsForWeb = [
        "https://raw.githubusercontent.com/HTMLFeeds/Examples/main/raccoons/index.txt",
        "https://raw.githubusercontent.com/HTMLFeeds/Examples/main/trees/index.txt",
    ];
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /** */
    function UnfollowSignal(feedKey) { }
    ScrollApp.UnfollowSignal = UnfollowSignal;
    /** */
    function FollowSignal(feed) { }
    ScrollApp.FollowSignal = FollowSignal;
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    let Strings;
    (function (Strings) {
        Strings["following"] = "Following";
        Strings["unfollow"] = "Unfollow";
        Strings["nowFollowing"] = "Now following";
        Strings["share"] = "Share";
        Strings["unknownAuthor"] = "(Author Unknown)";
    })(Strings = ScrollApp.Strings || (ScrollApp.Strings = {}));
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /**
     *
     */
    class BackgroundFetcher {
        /** */
        constructor() {
            //! Not implemented
        }
    }
    ScrollApp.BackgroundFetcher = BackgroundFetcher;
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    var Data;
    (function (Data) {
        /** */
        async function initialize() {
            for (const postFila of await readScrollFilas("json")) {
                const key = parseInt(postFila.name) || 0;
                const postKeys = await readScrollPostKeys(key);
                scrollPostCounts.set(key, postKeys.length);
            }
        }
        Data.initialize = initialize;
        /** */
        function readScrollPostCount(scrollKey) {
            return scrollPostCounts.get(scrollKey) || 0;
        }
        Data.readScrollPostCount = readScrollPostCount;
        const scrollPostCounts = new Map();
        /** */
        async function writeScroll(defaults) {
            const scroll = Object.assign({
                key: ScrollApp.Util.getSafeTicks(),
                anchorIndex: 0,
                feeds: []
            }, defaults);
            const diskScroll = {
                anchorIndex: scroll.anchorIndex,
                feeds: scroll.feeds.map(s => s.key),
            };
            const key = scroll.key;
            const json = JSON.stringify(diskScroll);
            const fila = await getScrollFile(key);
            await fila.writeText(json);
            return scroll;
        }
        Data.writeScroll = writeScroll;
        /** */
        async function writeScrollPost(scrollKey, post) {
            const fila = await getScrollPostsFile(scrollKey);
            const keys = [post.key];
            await appendArrayFile(fila, keys);
            scrollPostCounts.set(scrollKey, (scrollPostCounts.get(scrollKey) || 0) + 1);
        }
        Data.writeScrollPost = writeScrollPost;
        /**
         * Read the scroll object from the file system with the specified key.
         * If the argument is omitted, the first discovered scroll is returned.
         */
        async function readScroll(key) {
            if (!key)
                for (const fila of await readScrollFilas("json"))
                    key = keyOf(fila);
            if (!key)
                return null;
            const fila = await getScrollFile(key);
            if (!await fila.exists())
                return null;
            const diskScrollJson = await fila.readText();
            const diskScroll = JSON.parse(diskScrollJson);
            const feeds = [];
            for (const feedKey of diskScroll.feeds) {
                const feed = await readFeed(feedKey);
                if (feed)
                    feeds.push(feed);
            }
            const scroll = {
                anchorIndex: diskScroll.anchorIndex,
                key,
                feeds,
            };
            return scroll;
        }
        Data.readScroll = readScroll;
        /** */
        async function* readScrolls() {
            for (const fila of await readScrollFilas("json")) {
                const key = keyOf(fila);
                const scroll = await readScroll(key);
                if (scroll)
                    yield scroll;
            }
        }
        Data.readScrolls = readScrolls;
        /** */
        async function readScrollFilas(type) {
            const folder = await getScrollFolder();
            const filas = await folder.readDirectory();
            const reg = new RegExp("^[0-9]+\\." + type + "$");
            return filas.filter(f => reg.test(f.name));
        }
        /** */
        async function readScrollPost(scrollKey, index) {
            for await (const post of readScrollPosts(scrollKey, { start: index, limit: 1 }))
                return post;
            return null;
        }
        Data.readScrollPost = readScrollPost;
        /** */
        async function* readScrollPosts(scrollKey, options) {
            for (const postKey of await readScrollPostKeys(scrollKey, options)) {
                const post = await readPost(postKey);
                if (post)
                    yield post;
            }
        }
        Data.readScrollPosts = readScrollPosts;
        /** */
        async function readScrollPostKeys(scrollKey, options) {
            const fila = await getScrollPostsFile(scrollKey);
            const postKeys = await readArrayFile(fila, options);
            return postKeys;
        }
        /** */
        async function getScrollFolder() {
            const fila = await ScrollApp.Util.getDataFolder();
            return fila.down("scrolls");
        }
        /** */
        async function getScrollFile(key) {
            return (await getScrollFolder()).down(key + ".json");
        }
        /** */
        async function getScrollPostsFile(key) {
            return (await getScrollFolder()).down(key + ".txt");
        }
        /**
         * Creates a new IFeed object to disk, optionally populated with the
         * specified values, writes it to disk, and returns the constructed object.
         */
        async function writeFeed(...defaults) {
            const key = ScrollApp.Util.getSafeTicks();
            const feed = Object.assign({
                key,
                url: "",
                icon: "",
                author: "",
                description: "",
                size: 0,
            }, ...defaults);
            const diskFeed = Object.assign({}, feed);
            delete diskFeed.key;
            const json = JSON.stringify(diskFeed);
            const fila = await getFeedFile(key);
            await fila.writeText(json);
            return feed;
        }
        Data.writeFeed = writeFeed;
        /** */
        async function writeFeedPost(feedKey, postKeys) {
            const fila = await getFeedPostsFile(feedKey);
            await appendArrayFile(fila, postKeys);
        }
        /**
         *
         */
        async function readFeed(key) {
            let fila = await getFeedFile(key);
            if (!await fila.exists()) {
                fila = await getFeedFileArchived(key);
                if (!await fila.exists())
                    return null;
            }
            const jsonText = await fila.readText();
            const feed = JSON.parse(jsonText);
            feed.key = key;
            return feed;
        }
        Data.readFeed = readFeed;
        /**
         * Reads all non-archived feeds from the file system.
         */
        async function* readFeeds() {
            const folder = (await getFeedFile(0)).up();
            const files = await folder.readDirectory();
            for (const file of files) {
                if (file.extension !== ".json")
                    continue;
                const key = keyOf(file);
                const feed = await readFeed(key);
                if (feed)
                    yield feed;
            }
        }
        Data.readFeeds = readFeeds;
        /** */
        async function* readFeedPosts(feedKey) {
            for (const postKey of await readFeedPostKeys(feedKey)) {
                const post = await readPost(postKey);
                if (post)
                    yield post;
            }
        }
        Data.readFeedPosts = readFeedPosts;
        /** */
        async function readFeedPostKeys(feedKey) {
            const fila = await getFeedPostsFile(feedKey);
            const postKeys = await readArrayFile(fila);
            return postKeys;
        }
        /**
         * Moves the feed file to the archive (which is the unfollow operation).
         */
        async function archiveFeed(feedKey) {
            const src = await getFeedFile(feedKey);
            const json = await src.readText();
            const dst = await getFeedFileArchived(feedKey);
            dst.writeText(json);
            src.delete();
            // Remove the feed from any scroll files.
            for (const fila of await readScrollFilas("json")) {
                const diskScrollJson = await fila.readText();
                const diskScroll = JSON.parse(diskScrollJson);
                for (let i = diskScroll.feeds.length; i-- > 0;) {
                    const key = diskScroll.feeds[i];
                    if (key === feedKey)
                        diskScroll.feeds.splice(i, 1);
                }
                const diskScrollJsonNew = JSON.stringify(diskScroll);
                fila.writeText(diskScrollJsonNew);
            }
        }
        Data.archiveFeed = archiveFeed;
        /** */
        async function getFeedsFolder() {
            const fila = await ScrollApp.Util.getDataFolder();
            return fila.down("feeds");
        }
        /** */
        async function getFeedFile(key) {
            return (await getFeedsFolder()).down(key + ".json");
        }
        /** */
        async function getFeedPostsFile(key) {
            const fila = await ScrollApp.Util.getDataFolder();
            return fila.down("feeds").down(key + ".txt");
        }
        /** */
        async function getFeedFileArchived(key) {
            const fila = await ScrollApp.Util.getDataFolder();
            return fila.down("feeds-archived").down(key + ".json");
        }
        /**
         * Writes the URLs contained in the specified to the file system, in their full-qualified
         * form, and returns an object that indicates what URLs where added and which ones
         * were removed from the previous time that this function was called.
         *
         * Worth noting that the URLs are expected to be in their fully-qualified form,
         * which is different from how the URLs are typically written in the feed text file.
         */
        async function captureRawFeed(feed, urls) {
            if (!feed.key)
                throw new Error("Cannot capture this feed because it has no key.");
            const added = [];
            const removed = [];
            const filaRaw = (await getFeedsRawFolder()).down(feed.key + ".txt");
            if (await filaRaw.exists()) {
                const rawText = await filaRaw.readText();
                const rawLines = rawText.split("\n");
                const rawLinesSet = new Set(rawLines);
                const urlsSet = new Set(urls);
                for (const url of rawLines)
                    if (!urlsSet.has(url))
                        removed.push(url);
                for (const url of urls)
                    if (!rawLinesSet.has(url))
                        added.push(url);
            }
            else {
                added.push(...urls);
            }
            const text = urls.join("\n");
            await filaRaw.writeText(text);
            return { added, removed };
        }
        Data.captureRawFeed = captureRawFeed;
        /** */
        async function getFeedsRawFolder() {
            const fila = await ScrollApp.Util.getDataFolder();
            return fila.down("feeds-raw");
        }
        /** */
        async function readPost(key) {
            const postsFile = await getPostsFile(key);
            const postsObject = await readPostsFile(postsFile);
            const diskPost = postsObject[key];
            if (!diskPost)
                return null;
            const feed = await readFeed(diskPost.feed);
            if (!feed)
                return null;
            return {
                key,
                feed,
                visited: diskPost.visited,
                path: diskPost.path,
            };
        }
        Data.readPost = readPost;
        /** */
        async function writePost(post) {
            if (!post.key)
                post.key = ScrollApp.Util.getSafeTicks();
            const fullPost = post;
            const diskPost = {
                visited: fullPost.visited || false,
                feed: fullPost.feed?.key || 0,
                path: fullPost.path || ""
            };
            if (!diskPost.path)
                throw new Error("Post has no .path property.");
            const postsFile = await getPostsFile(post.key);
            const postsObject = await readPostsFile(postsFile);
            // This may either override the post at the existing key,
            // or assign a new post at the new key.
            postsObject[post.key] = diskPost;
            const postsObjectJsonText = JSON.stringify(postsObject);
            await postsFile.writeText(postsObjectJsonText);
            // Add the post to the feed
            await writeFeedPost(diskPost.feed, [post.key]);
            return fullPost;
        }
        Data.writePost = writePost;
        /**
         * Reads the contents of a JSON file that contains multiple posts.
         */
        async function readPostsFile(postsFila) {
            if (!await postsFila.exists())
                return {};
            const postsJson = await postsFila.readText();
            const postsObject = ScrollApp.Util.tryParseJson(postsJson);
            return postsObject;
        }
        /** */
        async function getPostsFolder() {
            const fila = await ScrollApp.Util.getDataFolder();
            return fila.down("posts");
        }
        /** */
        async function getPostsFile(key) {
            const date = new Date(key);
            const y = date.getFullYear();
            const m = ("0" + (date.getMonth() + 1)).slice(-2);
            const d = ("0" + date.getDate()).slice(-2);
            const postsFileName = [y, m, d].join("-") + ".json";
            return (await getPostsFolder()).down(postsFileName);
        }
        /** */
        function keyOf(fila) {
            return Number(fila.name.split(".")[0]) || 0;
        }
        /** */
        async function readArrayFile(fila, options) {
            if (!await fila.exists())
                return [];
            const text = await fila.readText();
            const numbers = [];
            let lines = text.split("\n");
            const start = options?.start || 0;
            lines = lines.slice(start);
            lines = lines.slice(0, options?.limit);
            for (const line of lines) {
                const n = Number(line) || 0;
                if (n > 0)
                    numbers.push(n);
            }
            return numbers;
        }
        /** */
        async function appendArrayFile(fila, keys) {
            const text = keys.map(k => k + "\n").join("");
            await fila.writeText(text, { append: true });
        }
        /**
         * Deletes all data in the data folder.
         * Intended only for debugging purposes.
         */
        async function clear() {
            const scrollFolder = await getScrollFolder();
            const feedFolder = await getFeedsFolder();
            const feedRawFolder = await getFeedsRawFolder();
            const postsFolder = await getPostsFolder();
            const all = [];
            if (await scrollFolder.exists())
                all.push(...await scrollFolder.readDirectory());
            if (await feedFolder.exists())
                all.push(...await feedFolder.readDirectory());
            if (await feedRawFolder.exists())
                all.push(...await feedRawFolder.readDirectory());
            if (await postsFolder.exists())
                all.push(...await postsFolder.readDirectory());
            await Promise.all(all.map(fila => fila.delete()));
        }
        Data.clear = clear;
    })(Data = ScrollApp.Data || (ScrollApp.Data = {}));
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /**
     * Initializes the app with a list of default feeds, and populates
     * a single scroll with the content contained within those feeds.
     */
    async function runDataInitializer(defaultFeedUrls) {
        const feeds = [];
        const urlLists = [];
        for (const url of defaultFeedUrls) {
            const urls = await HtmlFeed.getFeedUrls(url);
            if (!urls)
                continue;
            const checksum = await ScrollApp.Util.getFeedChecksum(url);
            if (!checksum)
                continue;
            urlLists.push(urls);
            const feedMeta = await HtmlFeed.getFeedMetaData(url);
            const feed = await ScrollApp.Data.writeFeed(feedMeta, { checksum });
            await ScrollApp.Data.captureRawFeed(feed, urls);
            feeds.push(feed);
        }
        const scroll = await ScrollApp.Data.writeScroll({ feeds });
        const maxLength = urlLists.reduce((a, b) => a > b.length ? a : b.length, 0);
        for (let i = -1; ++i < maxLength * urlLists.length;) {
            const indexOfList = i % urlLists.length;
            const urlList = urlLists[indexOfList];
            const indexWithinList = Math.floor(i / urlLists.length);
            if (urlList.length <= indexWithinList)
                continue;
            const feed = feeds[indexOfList];
            const feedDirectory = HtmlFeed.Url.folderOf(feed.url);
            const path = urlList[indexWithinList].slice(feedDirectory.length);
            const post = await ScrollApp.Data.writePost({ feed, path });
            await ScrollApp.Data.writeScrollPost(scroll.key, post);
        }
    }
    ScrollApp.runDataInitializer = runDataInitializer;
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /**
     * A namespace of functions which are shared between
     * the ForegroundFetcher and the BackgroundFetcher.
     */
    let Fetcher;
    (function (Fetcher) {
        /**
         *
         */
        async function updateModifiedFeeds(modifiedFeeds) {
            const scroll = await ScrollApp.Data.readScroll();
            for (const feed of modifiedFeeds) {
                HtmlFeed.getFeedUrls(feed.url).then(async (urls) => {
                    if (!urls)
                        return;
                    const feedUrlFolder = HtmlFeed.Url.folderOf(feed.url);
                    const { added, removed } = await ScrollApp.Data.captureRawFeed(feed, urls);
                    for (const url of added) {
                        const path = url.slice(feedUrlFolder.length);
                        const post = await ScrollApp.Data.writePost({ feed, path });
                        if (scroll)
                            ScrollApp.Data.writeScrollPost(scroll.key, post);
                    }
                });
            }
        }
        Fetcher.updateModifiedFeeds = updateModifiedFeeds;
    })(Fetcher = ScrollApp.Fetcher || (ScrollApp.Fetcher = {}));
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /** */
    class ForegroundFetcher {
        /** */
        constructor() { }
        /**
         * Gets whether there is a fetch operation being carried out.
         */
        get isFetching() {
            return !!this.feedIterator;
        }
        feedIterator = null;
        /** */
        async fetch() {
            this.stopFetch();
            this.feedIterator = ScrollApp.Data.readFeeds();
            const threads = [];
            const modifiedFeeds = [];
            for (let i = -1; ++i < maxFetchThreads;) {
                // Creates a "thread" that attempts to ping
                // the URL of the next feed in the line.
                threads.push(new Promise(async (r) => {
                    for (;;) {
                        const feedIteration = await this.feedIterator?.next();
                        if (!feedIteration || feedIteration.done) {
                            // If i is less than the number of "threads" running,
                            // and the iterator has run out, that means there's
                            // fewer feeds than there are threads (so avoid
                            // termination in this case).
                            if (i >= maxFetchThreads) {
                                this.feedIterator = null;
                                this.abortControllers.clear();
                            }
                            return r();
                        }
                        const feed = feedIteration.value;
                        const checksum = await ScrollApp.Util.getFeedChecksum(feed.url);
                        if (checksum !== feed.checksum)
                            modifiedFeeds.push(feed);
                    }
                }));
            }
            await Promise.all(threads);
            await ScrollApp.Fetcher.updateModifiedFeeds(modifiedFeeds);
        }
        /** */
        stopFetch() {
            for (const ac of this.abortControllers)
                ac.abort();
            this.abortControllers.clear();
            this.feedIterator?.return();
        }
        abortControllers = new Set();
    }
    ScrollApp.ForegroundFetcher = ForegroundFetcher;
    const maxFetchThreads = 10;
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    let Util;
    (function (Util) {
        /** */
        async function getFeedChecksum(feedUrl) {
            try {
                const ac = new AbortController();
                const id = setTimeout(() => ac.abort(), timeout);
                const fetchResult = await fetch(feedUrl, {
                    method: "HEAD",
                    mode: "cors",
                    signal: ac.signal,
                });
                clearTimeout(id);
                if (!fetchResult.ok)
                    return null;
                const len = fetchResult.headers.get("Content-Length") || "";
                const mod = fetchResult.headers.get("Last-Modified") || "";
                if (!len && !mod)
                    return null;
                const checksum = (mod + ";" + len).replace(/[,:\s]/g, "");
                return checksum;
            }
            catch (e) { }
            return null;
        }
        Util.getFeedChecksum = getFeedChecksum;
        const timeout = 500;
        /**
         * Returns the current date in ticks form, but with any incrementation
         * necessary to avoid returning the same ticks value twice.
         */
        function getSafeTicks() {
            let now = Date.now();
            if (now <= lastTicks)
                now = ++lastTicks;
            lastTicks = now;
            return now;
        }
        Util.getSafeTicks = getSafeTicks;
        let lastTicks = 0;
        /**
         * Returns the fully-qualified URL to the icon image
         * specified in the specified feed.
         */
        function getIconUrl(feed) {
            const folder = HtmlFeed.Url.folderOf(feed.url);
            return HtmlFeed.Url.resolve(feed.icon, folder);
        }
        Util.getIconUrl = getIconUrl;
        /**
         * Parses URIs as specified in the HTML feeds specification found at:
         * https://www.scrollapp.org/specs/htmlfeeds/
         */
        function parseHtmlUri(uri) {
            uri = uri.trim();
            const prefix = "html://follow?";
            if (!uri.startsWith(prefix))
                return "";
            uri = uri.slice(prefix.length);
            if (uri.length > 2048)
                return "";
            try {
                const url = new URL(uri);
                return url.toString();
            }
            catch (e) { }
            return "";
        }
        Util.parseHtmlUri = parseHtmlUri;
        /**
         * Safely parses a string JSON into an object.
         */
        function tryParseJson(jsonText) {
            try {
                return JSON.parse(jsonText);
            }
            catch (e) { }
            return null;
        }
        Util.tryParseJson = tryParseJson;
        /**
         * Returns the environment-specific path to the application data folder.
         */
        async function getDataFolder() {
            if (TAURI) {
                const dir = await Tauri.path.appDataDir();
                return Fila.new(dir);
            }
            else if (ELECTRON) {
                const fila = Fila.new(__dirname).down("data");
                await fila.writeDirectory();
                return fila;
            }
            else if (CAPACITOR) {
                const path = DEBUG ?
                    FilaCapacitor.directory.documents :
                    FilaCapacitor.directory.data;
                return Fila.new(path);
            }
            else if (DEMO) {
                return Fila.new();
            }
            throw new Error("Not implemented");
        }
        Util.getDataFolder = getDataFolder;
        /** */
        async function readClipboardHtmlUri() {
            const text = await readClipboard();
            const uri = parseHtmlUri(text);
            return uri ? text : "";
        }
        Util.readClipboardHtmlUri = readClipboardHtmlUri;
        /** */
        async function readClipboard() {
            if (ELECTRON) {
                const electron = require("electron");
                return electron.clipboard.readText() || "";
            }
            else if (TAURI) {
                const text = await Tauri.clipboard.readText();
                return text || "";
            }
            else if (CAPACITOR) {
                const text = await CapClipboard.read();
                return text.value;
            }
            return "";
        }
        Util.readClipboard = readClipboard;
        /**
         * Removes problematic CSS attributes from the specified section tag,
         * and ensures that no external CSS is modifying its display propert
         */
        function getSectionSanitizationCss() {
            return {
                position: "relative !",
                zIndex: 0,
                width: "auto !",
                height: "100% !",
                margin: "0 !",
                boxSizing: "border-box !",
                display: "block !",
                float: "none !",
                clipPath: "inset(0 0) !",
                mask: "none !",
                opacity: "1 !",
                transform: "none !",
            };
        }
        Util.getSectionSanitizationCss = getSectionSanitizationCss;
    })(Util = ScrollApp.Util || (ScrollApp.Util = {}));
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /** */
    class DotsHat {
        head;
        /** */
        constructor() {
            this.head = hot.div(ScrollApp.Style.backgroundOverlay(), {
                width: "fit-content",
                padding: "5px 10px",
                borderRadius: "1000px",
                textAlign: "center",
            }, hot.css(" > SPAN", {
                display: "inline-block",
                width: "10px",
                height: "10px",
                margin: "3px",
                borderRadius: "100%",
                backgroundColor: "rgba(128, 128, 128)",
            }), hot.css(" > SPAN." + highlightClass, {
                backgroundColor: "hsl(205, 100%, 50%)",
            }));
            Hat.wear(this);
        }
        /** */
        insert(count, at = this.head.childElementCount) {
            const spans = [];
            for (let i = -1; ++i < count;)
                spans.push(hot.span());
            at = Math.max(0, at);
            at = Math.min(this.head.childElementCount, at);
            if (at >= this.head.childElementCount) {
                this.head.append(...spans);
            }
            else {
                const elements = Array.from(this.head.children);
                elements[at].before(...spans);
            }
        }
        /** */
        highlight(index) {
            index = Math.max(0, index);
            index = Math.min(this.head.childElementCount - 1, index);
            const children = Array.from(this.head.children);
            children.forEach(e => e.classList.remove(highlightClass));
            children[index].classList.add(highlightClass);
        }
    }
    ScrollApp.DotsHat = DotsHat;
    const highlightClass = "highlight";
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /** */
    class FeedMetaHat {
        head;
        /** */
        constructor(data) {
            const iconUrl = ScrollApp.Util.getIconUrl(data);
            const author = data.author || "(Author Unknown)" /* Strings.unknownAuthor */;
            const isFollowing = data.key > 0;
            this.head = hot.div({
                display: "flex",
                height: "100%",
                justifyContent: "center",
                alignContent: "center",
                alignItems: "center",
            }, hot.div({
                display: "flex",
                width: "140px",
                padding: "20px",
                justifyContent: "center",
                alignContent: "center",
                alignItems: "center",
            }, hot.div({
                width: "100%",
                aspectRatio: "1/1",
                borderRadius: "100%",
                backgroundImage: `url(${iconUrl})`,
                backgroundSize: "cover"
            })), hot.div({
                flex: "1 0",
                fontSize: "18px",
            }, hot.css(" > :not(:first-child)", {
                marginTop: "10px"
            }), hot.div({
                fontWeight: 700,
                display: "-webkit-box",
                webkitBoxOrient: "vertical",
                webkitLineClamp: "1",
                overflow: "hidden",
            }, hot.text(author)), !!data.description && hot.div({
                fontWeight: 500,
                display: "-webkit-box",
                webkitBoxOrient: "vertical",
                webkitLineClamp: "2",
                overflow: "hidden",
            }, hot.text(data.description)), this.renderButton("Share" /* Strings.share */, () => { }), isFollowing && (e => this.renderButton("Unfollow" /* Strings.unfollow */, () => {
                Hat.over(this, ScrollApp.PageHat).head.scrollBy({ top: -1 });
                Hat.signal(ScrollApp.UnfollowSignal, data.key);
                ScrollApp.UI.fade(e);
            }))));
            Hat.wear(this);
        }
        /** */
        renderButton(label, clickFn) {
            return ScrollApp.Widget.fillButton({
                marginRight: "15px",
            }, hot.text(label), hot.on("click", () => clickFn()));
        }
    }
    ScrollApp.FeedMetaHat = FeedMetaHat;
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /** */
    class FollowersHat {
        head;
        feedElements;
        /** */
        constructor() {
            this.head = hot.div({
                padding: "20px",
            }, hot.on("connected", () => this.construct()), hot.div({
                fontSize: "22px",
                fontWeight: 600,
                marginBottom: "20px",
            }, hot.text("Following" /* Strings.following */)), this.feedElements = hot.div());
            Hat
                .wear(this)
                .wear(ScrollApp.UnfollowSignal, this.handleUnfollow)
                .wear(ScrollApp.FollowSignal, this.handleFollow);
        }
        /** */
        handleUnfollow(feedKey) {
            const cls = keyPrefix + feedKey;
            Array.from(this.head.children)
                .filter(e => e instanceof HTMLElement && e.classList.contains(cls))
                .map(e => e.remove());
        }
        /** */
        handleFollow(feed) {
            this.feedElements.prepend(this.renderIdentity(feed));
        }
        /** */
        async construct() {
            for await (const feed of ScrollApp.Data.readFeeds())
                this.feedElements.append(this.renderIdentity(feed));
        }
        /** */
        renderIdentity(feed) {
            const iconUrl = ScrollApp.Util.getIconUrl(feed);
            const author = feed.author || "(Author Unknown)" /* Strings.unknownAuthor */;
            const e = hot.div({
                display: "flex",
                alignContent: "center",
                alignItems: "center",
                marginBottom: "10px",
                padding: "10px",
                fontSize: "15px",
                backgroundColor: "rgba(128, 128, 128, 0.25)",
                borderRadius: ScrollApp.Style.borderRadiusSmall,
            }, keyPrefix + feed.key, hot.div({
                width: "50px",
                padding: "10px",
                marginRight: "20px",
                aspectRatio: "1/1",
                borderRadius: "100%",
                backgroundImage: `url(${iconUrl})`,
                backgroundSize: "cover",
            }), hot.div({
                fontWeight: 500,
                flex: "1 0",
            }, hot.text(author)), ScrollApp.Widget.fillButton(hot.text("Unfollow" /* Strings.unfollow */), hot.on("click", async () => {
                Hat.signal(ScrollApp.UnfollowSignal, feed.key);
                await ScrollApp.UI.collapse(e);
                e.remove();
            })));
            return e;
        }
    }
    ScrollApp.FollowersHat = FollowersHat;
    const keyPrefix = "id:";
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /**
     *
     */
    class GridHat {
        /** */
        head;
        /** */
        cornersElement;
        /** */
        constructor() {
            maybeAppendDefaultCss();
            this.head = hot.div(ScrollApp.Style.unselectable, {
                minHeight: "100%",
                overflowY: "auto",
            }, ScrollApp.UI.stretch(), hot.css("> ." + "poster" /* Class.poster */, {
                display: "none",
                position: "absolute",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                outline: "2px solid black",
                ...ScrollApp.Style.clickable,
            }), hot.on("scroll", () => this.updatePosterVisibility(true)), hot.on("connected", () => {
                this.setSizeInner(calculateNaturalSize());
                this._width = this.head.offsetWidth;
                this._height = this.head.offsetHeight;
                ScrollApp.Resize.watch(this.head, (w, h) => [this._width, this._height] = [w, h]);
                this.tryAppendPosters(3);
            }), (CAPACITOR || DEMO) && [
                ScrollApp.UI.cornerAbsolute("tl"),
                ScrollApp.UI.cornerAbsolute("tr"),
                this.cornersElement = hot.span("corners-element", {
                    display: "block",
                    position: "absolute",
                    pointerEvents: "none",
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 2,
                }, ScrollApp.UI.cornerAbsolute("bl"), ScrollApp.UI.cornerAbsolute("br"))
            ]);
            Hat.wear(this);
        }
        /** */
        handleRender(fn) {
            this.renderFn = fn;
        }
        renderFn = () => null;
        /** */
        handleSelect(fn) {
            this.selectFn = fn;
        }
        selectFn = () => { };
        //# Size
        /**
         * Gets the pixel width of the head element.
         */
        get width() {
            return this._width;
        }
        _width = 0;
        /**
         * Gets the pixel height of the head element.
         */
        get height() {
            return this._height;
        }
        _height = 0;
        /**
         * Gets or sets the number of posters being displayed in one dimension.
         */
        get size() {
            return this._size;
        }
        set size(size) {
            this.setSizeInner(size);
        }
        /** */
        setSizeInner(size) {
            size = Math.max(minSize, Math.min(size, maxSize));
            if (size === this._size)
                return;
            this._size = size;
            const cls = sizeClasses.get(size);
            if (cls) {
                this.head.classList.remove(...sizeClasses.values());
                this.head.classList.add(cls);
            }
            this.updatePosterVisibility();
        }
        _size = -1;
        /**
         * Gets the maximum possible size of the Omniview,
         * given the number of previews that are available.
         * A value of 0 indicates that there is no size limit.
         */
        sizeLimit = 0;
        //# Posters
        /**
         * Returns an array of HTMLElement objects that contain the posters
         * that have at least a single pixel visible on the screen.
         */
        getVisiblePosters() {
            const elements = [];
            for (const element of getByClass(showClass, this.head)) {
                const rect = element.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0)
                    continue;
                if (rect.top > this.height)
                    continue;
                elements.push(element);
            }
            return elements;
        }
        /** */
        get posterCount() {
            return this.head.getElementsByClassName("poster" /* Class.poster */).length;
        }
        /** */
        async tryAppendPosters(screenCount) {
            const pullCount = this.size * this.size * screenCount;
            const rangeStart = this.posterCount;
            const rangeEnd = rangeStart + pullCount;
            const maybePromises = [];
            let canContinue = true;
            for (let i = rangeStart; i < rangeEnd; i++) {
                const result = this.renderFn(i);
                // If null is returned, this means that the stream has terminated.
                if (result === null) {
                    canContinue = false;
                    break;
                }
                maybePromises.push(result);
            }
            const newPosterCount = maybePromises.length;
            if (newPosterCount === 0)
                return;
            if (rangeStart === 0 && newPosterCount < this.size) {
                // The constrained size cannot go below 2. This means that if there
                // is only 1 preview returned, the Omniview is going to look a bit
                // awkward with a preview on the left side of the screen, and an
                // empty space on the right. If this is undesirable, the component
                // that owns the Omniview is responsible for avoiding this situation
                // by it's own means.
                this.sizeLimit = Math.max(2, newPosterCount);
                this.setSizeInner(this.sizeLimit);
            }
            const elements = [];
            for (const maybePromise of maybePromises) {
                if (!maybePromise)
                    throw "?";
                if (maybePromise instanceof Promise) {
                    const shim = hot.div("element-placeholder", getDefaultBackground());
                    elements.push(shim);
                    maybePromise.then(element => {
                        if (element === null)
                            return;
                        for (const n of shim.getAttributeNames())
                            if (n !== "style" && n !== "class")
                                element.setAttribute(n, shim.getAttribute(n) || "");
                        for (const definedProperty of Array.from(shim.style)) {
                            element.style.setProperty(definedProperty, shim.style.getPropertyValue(definedProperty));
                        }
                        hot.get(element)(
                        // Classes that have been set on the shim since it was inserted
                        // must be copied over to the element.
                        Array.from(shim.classList), hot.on("click", () => this.selectFn(element, getIndex(element))));
                        shim.replaceWith(element);
                    });
                }
                else {
                    elements.push(hot.get(maybePromise)(hot.on("click", () => this.selectFn(maybePromise, getIndex(maybePromise)))));
                }
            }
            for (const [i, e] of elements.entries()) {
                setIndex(e, this.posterCount + i);
                e.classList.add("poster" /* Class.poster */);
            }
            this.head.append(...elements);
            this.updatePosterVisibility(canContinue);
        }
        /** */
        updatePosterVisibility(canContinue = false) {
            if (!this.head.isConnected)
                return;
            let isNearingBottom = false;
            if (this.posterCount > 0) {
                const y = this.head.scrollTop;
                const rowHeight = this.height / this.size;
                const rowCount = this.posterCount / this.size;
                const visibleRowStart = Math.floor(y / rowHeight);
                const visibleItemStart = visibleRowStart * this.size;
                const visibleItemEnd = visibleItemStart + this.size * (this.size + 2);
                const elementsWithTop = new Set(getByClass("has-top" /* Class.hasCssTop */, this.head));
                const elementsVisible = new Set(getByClass(showClass, this.head));
                const children = Array.from(this.head.children).filter(e => e instanceof HTMLDivElement);
                for (let i = visibleItemStart; i < visibleItemEnd; i++) {
                    const e = children[i];
                    if (!(e instanceof HTMLDivElement)) {
                        if (i >= children.length)
                            break;
                        continue;
                    }
                    const mul = getIndex(e) > 0 ? 1 : -1;
                    const pct = (100 * this.rowOf(e) * mul || 0).toFixed(5);
                    e.style.top = `calc(${pct}% / var(${"--size" /* Class.sizeVar */}))`;
                    e.classList.add("has-top" /* Class.hasCssTop */, showClass);
                    elementsWithTop.delete(e);
                    elementsVisible.delete(e);
                }
                for (const e of elementsWithTop) {
                    e.style.removeProperty("top");
                    e.classList.remove("has-top" /* Class.hasCssTop */);
                }
                for (const e of elementsVisible)
                    e.classList.remove(showClass);
                if (y !== this.lastY) {
                    this.lastY = y;
                    isNearingBottom = (y + this.height) > (rowCount - 1) * (this.height / this.size);
                }
            }
            if (canContinue && isNearingBottom)
                this.tryAppendPosters(1);
            if (CAPACITOR || DEMO) {
                const query = this.head.getElementsByClassName("has-top" /* Class.hasCssTop */);
                if (query.length > 0) {
                    const last = query.item(query.length - 1);
                    if (last && last !== this.lastVisiblePoster) {
                        this.cornersElement.style.height = (1 + last.offsetTop + last.offsetHeight / this.size) + "px";
                        this.lastVisiblePoster = last;
                    }
                }
            }
        }
        lastVisiblePoster = null;
        lastY = -1;
        /** */
        rowOf(previewElement) {
            const eIdx = getIndex(previewElement);
            const rowIndex = Math.floor(eIdx / this.size);
            return rowIndex;
        }
    }
    ScrollApp.GridHat = GridHat;
    /** */
    let Class;
    (function (Class) {
        Class["poster"] = "poster";
        Class["body"] = "body";
        Class["hasCssTop"] = "has-top";
        Class["sizeVar"] = "--size";
    })(Class || (Class = {}));
    /** */
    let getDefaultBackground = () => {
        const canvas = hot.canvas({ width: 32, height: 32 });
        const ctx = canvas.getContext("2d");
        const grad = ctx.createLinearGradient(0, 0, 32, 32);
        grad.addColorStop(0, "rgb(50, 50, 50)");
        grad.addColorStop(1, "rgb(0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);
        const cls = hot.css({
            backgroundImage: `url(${canvas.toDataURL()})`,
            backgroundSize: "100% 100%",
        });
        getDefaultBackground = () => cls;
    };
    /** */
    let maybeAppendDefaultCss = () => {
        maybeAppendDefaultCss = () => { };
        hot.style("." + "body" /* Class.body */, {
            position: "fixed",
            top: 0,
            right: 0,
            left: 0,
            bottom: 0,
            zIndex: 1,
            transform: "translateY(0)",
            transitionProperty: "transform",
            transitionDuration: "0.33s",
            scrollSnapType: "y mandatory",
            overflowY: "auto",
        }, `.${"body" /* Class.body */}:before, .${"body" /* Class.body */}:after`, {
            content: `""`,
            display: "block",
            height: "1px",
            scrollSnapStop: "always",
        }, `.${"body" /* Class.body */}:before`, {
            scrollSnapAlign: "start",
        }, `.${"body" /* Class.body */}:after`, {
            scrollSnapAlign: "end",
        }, `.${"body" /* Class.body */} > *`, {
            scrollSnapAlign: "start",
            scrollSnapStop: "always",
            height: "100%",
        }, 
        // Place a screen over the poster element to kill any selection
        // events. This has to be done in another element rather than 
        // just doing a pointer-events: none on the children because the
        // poster element's contents are within a shadow root.
        `.${"poster" /* Class.poster */}:before`, {
            content: `""`,
            position: "absolute",
            top: 0,
            right: 0,
            left: 0,
            bottom: 0,
            zIndex: 1,
            userSelect: "none",
        }).attach();
        const classes = new Map();
        for (let size = minSize; size <= maxSize; size++) {
            const params = [];
            const scale = 1 / size;
            const sizeClass = "size-" + size;
            classes.set(size, sizeClass);
            params.push("." + sizeClass, {
                ["--size" /* Class.sizeVar */]: size
            });
            for (let n = -1; ++n < size;) {
                params.push(` .${sizeClass} > DIV:nth-of-type(${size}n + ${n + 1})`, {
                    left: (scale * 100 * n) + "%",
                    transform: `scale(${scale.toFixed(4)})`,
                    transformOrigin: "0 0",
                });
            }
            hot.style(...params).attach();
        }
        sizeClasses = classes;
    };
    let sizeClasses;
    /**
     * Calculates a comfortable preview size based on the size and pixel density
     * of the screen. (The technique used is probably quite faulty, but good enough
     * for most scenarios).
     */
    function calculateNaturalSize() {
        return 3;
        const dp1 = window.devicePixelRatio === 1;
        const logicalWidth = window.innerWidth / window.devicePixelRatio;
        if (logicalWidth <= (dp1 ? 900 : 450))
            return 2;
        if (logicalWidth <= (dp1 ? 1400 : 700))
            return 3;
        if (logicalWidth <= 1800)
            return 4;
        return 5;
    }
    const minSize = 2;
    const maxSize = 7;
    //const ratioX = 9;
    //const ratioY = 16;
    /** */
    function getIndex(e) {
        return Number((Array.from(e.classList)
            .find(cls => cls.startsWith(indexPrefix)) || "")
            .slice(indexPrefix.length)) || 0;
    }
    /** */
    function setIndex(e, index) {
        e.classList.add(indexPrefix + index);
    }
    const indexPrefix = "index:";
    //# Utilities
    /** */
    const showClass = hot.css({
        display: "block !",
    });
    /** */
    function getByClass(cls, element) {
        const col = (element || document).getElementsByClassName(cls);
        return Array.from(col);
    }
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /** */
    class PageHat {
        feed;
        head;
        swiper;
        scrollable;
        onDisconnect;
        _onDisconnect;
        onRetract;
        _onRetract;
        /** */
        constructor(head, sections, feed) {
            this.feed = feed;
            if (sections.length < 1)
                throw new Error("Must have at least one section.");
            if (CAPACITOR || DEMO) {
                hot.get(sections[0])({
                    borderTopLeftRadius: ScrollApp.Style.borderRadiusLarge + " !",
                    borderTopRightRadius: ScrollApp.Style.borderRadiusLarge + " !",
                });
            }
            for (const section of sections) {
                hot.get(section)(ScrollApp.Util.getSectionSanitizationCss(), {
                    scrollSnapStop: "always !",
                    scrollSnapAlign: "start",
                });
            }
            this.swiper = new ScrollApp.PaneSwiper();
            const metaHat = new ScrollApp.FeedMetaHat(this.feed);
            const metaHatHeight = 200;
            this.head = hot.div("head", {
                width: "100%",
                height: "100%",
            }, hot.on("connected", () => {
                this.swiper.setVisiblePane(1);
                this.setupRetractionTracker();
                setTimeout(() => {
                    const e = this.scrollable;
                    e.scrollTo(0, e.offsetHeight + metaHatHeight);
                });
            }), this.swiper);
            this.scrollable = hot.div("scrollable-element", {
                scrollSnapType: "y mandatory",
                overflowY: "auto",
                height: "100%",
            }, hot.div("snap-top", snap, { height: "100%" }), hot.get(metaHat)({
                height: (metaHatHeight - 10) + "px",
                marginBottom: "10px",
                backgroundColor: "rgba(128, 128, 128, 0.33)",
                borderRadius: ScrollApp.Style.borderRadiusLarge,
            }, ScrollApp.Style.backdropBlur(8), snap), (CAPACITOR || DEMO) && hot.div("corners-container", {
                position: "absolute",
                left: 0,
                right: 0,
                zIndex: 2,
                pointerEvents: "none",
            }, [
                ScrollApp.UI.cornerAbsolute("tl"),
                ScrollApp.UI.cornerAbsolute("tr"),
            ]), hot.div("shadow-container", { display: "contents" }, hot.shadow(...head, hot.body({ display: "contents !" }, ...sections))), hot.div("snap-bottom", snap, { height: "100%" }));
            this.swiper.addPane(hot.div("exit-left-element"));
            this.swiper.addPane(this.scrollable);
            [this.onRetract, this._onRetract] = Force.create();
            [this.onDisconnect, this._onDisconnect] = Force.create();
            this.onDisconnect(() => this.head.remove());
            Hat.wear(this);
        }
        /** */
        setupRetractionTracker() {
            const e = this.scrollable;
            let lastScrollTop = -1;
            let lastScrollLeft = -1;
            let timeoutId = 0;
            const handler = () => {
                let clipTop = 0;
                let clipBottom = 0;
                let clipLeft = 0;
                const w = e.offsetWidth;
                const offsetHeight = e.offsetHeight;
                const scrollHeight = e.scrollHeight;
                const scrollLeft = this.swiper.head.scrollLeft;
                const scrollTop = e.scrollTop;
                clipTop = offsetHeight - scrollTop;
                if (scrollLeft < w)
                    clipLeft = 1 - scrollLeft / w;
                else if (scrollTop > scrollHeight - offsetHeight)
                    clipBottom = scrollTop - (scrollHeight - offsetHeight);
                clipLeft *= 100;
                this.head.style.clipPath = `inset(${clipTop}px 0 ${clipBottom}px ${clipLeft}%)`;
                // Deal with retraction notification
                let retractPct = -1;
                if (scrollLeft < w)
                    retractPct = scrollLeft / w;
                else if (scrollTop < offsetHeight)
                    retractPct = scrollTop / offsetHeight;
                else if (scrollTop >= scrollHeight - offsetHeight * 2)
                    retractPct = (scrollHeight - offsetHeight - scrollTop) / offsetHeight;
                if (retractPct > 0)
                    this._onRetract(retractPct);
                // Remove the element if necessary
                clearTimeout(timeoutId);
                if (retractPct > 0) {
                    lastScrollLeft = scrollLeft;
                    lastScrollTop = scrollTop;
                    timeoutId = setTimeout(() => {
                        if (scrollLeft !== lastScrollLeft)
                            return;
                        if (scrollTop !== lastScrollTop)
                            return;
                        // A more elegant way to deal with this would be to animate
                        // it off the screen... but just removing it is good enough for now
                        // because this is just an edge case that isn't going to happen
                        // very often.
                        if (scrollLeft <= 2 ||
                            scrollTop <= 2 ||
                            scrollTop >= scrollHeight - offsetHeight - 2) {
                            this._onDisconnect();
                        }
                    });
                }
            };
            e.addEventListener("scroll", handler);
            this.swiper.head.addEventListener("scroll", handler);
        }
        /** */
        forceRetract() {
            return new Promise(r => {
                const slideAway = (axis, amount) => {
                    const ms = 100;
                    const e = this.head;
                    e.style.transitionDuration = ms + "ms";
                    e.style.transitionProperty = "transform";
                    e.style.transform = `translate${axis.toLocaleUpperCase()}(${amount}px)`;
                    e.style.pointerEvents = "none";
                    setTimeout(() => {
                        this._onDisconnect();
                        r();
                    }, ms);
                };
                const e = this.scrollable;
                const w = e.offsetWidth;
                const offsetHeight = e.offsetHeight;
                const scrollLeft = this.swiper.head.scrollLeft;
                const scrollTop = e.scrollTop;
                // This check will indicate whether the pageHat has rightward
                // scrolling inertia. If it does, it's scrolling will halt and it will be
                // necessary to animate the pageHat away manually.
                if (scrollLeft > 0 && scrollLeft < w)
                    slideAway("x", scrollLeft);
                else if (scrollTop > 0 && scrollTop < offsetHeight)
                    slideAway("y", scrollTop);
            });
        }
    }
    ScrollApp.PageHat = PageHat;
    const snap = {
        scrollSnapStop: "always",
        scrollSnapAlign: "start",
    };
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /**
     * A class that creates a series of panes that swipe horizontally on mobile.
     */
    class PaneSwiper {
        head;
        /** */
        constructor() {
            this.head = hot.div(Dock.cover(), {
                whiteSpace: "nowrap",
                overflowX: "auto",
                overflowY: "hidden",
                scrollSnapType: "x mandatory",
            }, hot.css(" > DIV", {
                display: "inline-block",
                width: "100%",
                height: "100%",
                whiteSpace: "normal",
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
                overflowX: "hidden",
                overflowY: "auto",
            }), hot.on("scroll", () => this.updateVisiblePane()));
            Hat.wear(this);
            [this.visiblePaneChanged, this._visiblePaneChanged] =
                Force.create();
        }
        /** */
        visiblePaneChanged;
        _visiblePaneChanged;
        /** */
        addPane(element, at = -0) {
            const pane = hot.div("swiper-pane", {
                height: "100%",
                overflowX: "hidden",
                overflowY: "auto",
                whiteSpace: "normal",
            }, element);
            if (at >= this.head.childElementCount || Object.is(at, -0)) {
                this.head.append(pane);
            }
            else if (at < 0) {
                at = Math.max(0, this.head.childElementCount + at);
                const children = Array.from(this.head.children);
                children[at].before(pane);
            }
        }
        /** */
        setVisiblePane(index) {
            const w = this.head.offsetWidth;
            this.head.scrollBy(w * index, 0);
        }
        /** */
        updateVisiblePane() {
            const w = this.head.offsetWidth;
            const s = this.head.scrollLeft;
            const paneIndex = Math.round(s / w);
            if (paneIndex !== this.lastVisiblePane)
                this._visiblePaneChanged(paneIndex);
            this.lastVisiblePane = paneIndex;
        }
        lastVisiblePane = 0;
    }
    ScrollApp.PaneSwiper = PaneSwiper;
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /** */
    class ProfileHat {
        head;
        /** */
        constructor() {
            this.head = hot.div();
            Hat.wear(this);
        }
    }
    ScrollApp.ProfileHat = ProfileHat;
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /** */
    class PullToRefreshHat {
        target;
        head;
        symbol;
        rotationDegress = 0;
        animation = null;
        /** */
        constructor(target) {
            this.target = target;
            const size = (parseInt(ScrollApp.Style.borderRadiusLarge) * 2) + "px";
            this.head = hot.div({
                width: size,
                height: size,
                textAlign: "center",
                borderRadius: "100%",
                zIndex: 1,
                opacity: 0,
                pointerEvents: "none",
            }, ScrollApp.Style.backdropBlur(), hot.on(target, "scroll", () => this.handleTargetScroll()), this.symbol = hot.div(Dock.center(), {
                width: factor * 9 + "px",
                height: factor * 16 + "px",
                borderRadius: "6px",
                backgroundColor: "rgba(128, 128, 128, 0.75)",
                transitionDuration: "0.1s",
            }));
            Hat.wear(this);
            [this.onRefresh, this._onRefresh] = Force.create();
        }
        onRefresh;
        _onRefresh;
        /** */
        handleTargetScroll() {
            if (this.animation)
                return;
            const e = this.target;
            const overscrollAmount = Math.max(0, e.scrollTop + e.offsetHeight - e.scrollHeight);
            if (overscrollAmount <= 0)
                this.setLoadingAnimation(false);
            else if (overscrollAmount < beginRefreshFrame)
                this.setAnimationFrame(overscrollAmount);
            else if (overscrollAmount >= beginRefreshFrame)
                this.setLoadingAnimation(true);
        }
        /** */
        setAnimationFrame(n) {
            n = Math.max(0, n);
            const opacity = Math.min(1, n / beginRefreshFrame);
            this.rotationDegress = Math.round(n * 1.5);
            this.head.style.opacity = opacity.toString();
            this.symbol.style.transform = `rotateZ(${this.rotationDegress}deg)`;
        }
        /** */
        setLoadingAnimation(enable) {
            if (enable && !this.animation) {
                this.head.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
                this.animation = this.symbol.animate([
                    { transform: `rotateZ(${this.rotationDegress}deg)` },
                    { transform: `rotateZ(${this.rotationDegress + 360}deg)` },
                ], {
                    iterations: 10000,
                    duration: 800,
                });
                this._onRefresh();
            }
            else if (!enable && this.animation)
                (async () => {
                    const animation = this.animation;
                    this.animation = null;
                    const s = this.head.style;
                    s.transitionDuration = "0.8s";
                    s.transitionProperty = "transform";
                    s.transform = "scale(1)";
                    await ScrollApp.UI.wait(1);
                    s.transform = "scale(0)";
                    await ScrollApp.UI.waitTransitionEnd(this.head);
                    animation.finish();
                    s.opacity = "0";
                    s.transform = "scale(1)";
                })();
        }
    }
    ScrollApp.PullToRefreshHat = PullToRefreshHat;
    /** The frame at which the RefreshHat becomes fully opaque */
    const beginRefreshFrame = 100;
    const factor = 2;
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /** */
    class RootHat {
        head;
        /** */
        constructor() {
            this.head = hot.div(ScrollApp.UI.noScrollBars, {
                height: "inherit",
                top: "env(safe-area-inset-top)",
                tabIndex: 0,
            }, hot.on(window, "paste", async (ev) => {
                const uri = await ScrollApp.Util.readClipboardHtmlUri();
                if (uri)
                    this.followFeedFromUri(uri);
            }), hot.on(window, "follow", ev => {
                this.followFeedFromUri(ev.data);
            }));
            Hat.wear(this)
                .wear(ScrollApp.UnfollowSignal, key => ScrollApp.Data.archiveFeed(key));
        }
        /** */
        async construct() {
            const paneSwiper = new ScrollApp.PaneSwiper();
            for await (const scroll of ScrollApp.Data.readScrolls()) {
                const viewer = new ScrollApp.ScrollMuxViewerHat(scroll);
                paneSwiper.addPane(viewer.head);
            }
            paneSwiper.addPane(new ScrollApp.FollowersHat().head);
            this.head.append(paneSwiper.head);
            const dotsHat = new ScrollApp.DotsHat();
            dotsHat.insert(2);
            dotsHat.highlight(0);
            hot.get(dotsHat.head)({
                position: "absolute",
                left: 0,
                right: 0,
                bottom: CAPACITOR ? "105px" :
                    DEMO ? 0 :
                        "15px",
                margin: "auto",
            });
            this.head.append(dotsHat.head);
            paneSwiper.visiblePaneChanged(index => {
                dotsHat.highlight(index);
            });
        }
        /**
         *
         */
        async followFeedFromUri(htmlUri) {
            const followUri = ScrollApp.Util.parseHtmlUri(htmlUri);
            if (!followUri)
                return;
            const urls = await HtmlFeed.getFeedUrls(followUri);
            if (!urls)
                return;
            const checksum = await ScrollApp.Util.getFeedChecksum(followUri);
            if (!checksum)
                return;
            const feedMeta = await HtmlFeed.getFeedMetaData(followUri);
            const feed = await ScrollApp.Data.writeFeed(feedMeta, { checksum });
            await ScrollApp.Data.captureRawFeed(feed, urls);
            Hat.signal(ScrollApp.FollowSignal, feed);
            if (CAPACITOR) {
                await Toast.show({
                    position: "center",
                    duration: "long",
                    text: "Now following" /* Strings.nowFollowing */ + " " + feed.author,
                });
            }
        }
        /**
         * Gets the fully qualified URL where the post resides, which is calculated
         * by concatenating the post path with the containing feed URL.
         */
        getPostUrl(post) {
            const feedFolder = HtmlFeed.Url.folderOf(post.feed.url);
            return feedFolder + post.path;
        }
    }
    ScrollApp.RootHat = RootHat;
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /** */
    class ScrollCreatorHat {
        head;
        /** */
        constructor() {
            this.head = hot.div();
        }
    }
    ScrollApp.ScrollCreatorHat = ScrollCreatorHat;
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    const transitionDuration = "0.5s";
    /** */
    class ScrollViewerHat {
        head;
        gridContainer;
        grid;
        pullToRefreshHat;
        selectedGridItem = null;
        /** */
        constructor() {
            this.grid = new ScrollApp.GridHat();
            const borderRadius = (CAPACITOR || DEMO) ? "30px" : 0;
            this.head = hot.div({
                height: (CAPACITOR || DEMO) ? "177.7777vw" : "100%",
                alignSelf: "center",
                borderRadius,
                overflow: "hidden",
            }, this.gridContainer = hot.div("grid-container", {
                height: "100%",
                borderRadius,
                overflow: "hidden",
                transitionDuration,
                transitionProperty: "transform, opacity",
            }), !(CAPACITOR || DEMO) && hot.div(Dock.bottomRight(10), {
                zIndex: 1,
                color: "white",
                borderRadius: "100%",
                padding: "10px",
                width: "50px",
                height: "50px",
                lineHeight: "33px",
                textAlign: "center",
                fontSize: "25px",
                fontWeight: 700,
            }, ScrollApp.Style.backgroundOverlay(), ScrollApp.Style.clickable, hot.text("↻"), hot.on("click", () => this.handleRefreshInner())), hot.get(this.pullToRefreshHat = new ScrollApp.PullToRefreshHat(this.grid.head))({
                position: "absolute",
                bottom: "20px",
                left: 0,
                right: 0,
                margin: "auto",
            }));
            Hat.wear(this);
            this.constructGrid();
            this.showGrid(true);
            this.pullToRefreshHat.onRefresh(() => this.handleRefreshInner());
            this.gridContainer.append(this.grid.head);
        }
        /** */
        async handleRefreshInner() {
            await this.handleRefresh();
            this.grid.tryAppendPosters(1);
        }
        /** */
        constructGrid() {
            this.grid.head.style.borderRadius = "inherit";
            this.grid.handleRender(index => this.getPost(index));
            this.grid.handleSelect(async (e, index) => {
                this.selectedGridItem = e;
                this.showPage(index);
            });
        }
        /** */
        async showPage(index) {
            const pageInfo = await this.getPageInfo(index);
            const pageHat = new ScrollApp.PageHat(pageInfo.head, pageInfo.sections, pageInfo.feed);
            hot.get(pageHat)(Dock.cover(), {
                transitionDuration,
                transitionProperty: "transform",
                transform: "translateY(110%)",
            }, hot.on("connected", () => setTimeout(async () => {
                for (const e of Query.ancestors(this.head))
                    if (e instanceof HTMLElement)
                        e.classList.add(noOverflowClass);
                pageHat.head.style.transform = "translateY(0)";
                await ScrollApp.UI.waitTransitionEnd(pageHat.head);
                this.gridContainer.style.transitionDuration = "0s";
            })), hot.on(this.grid.head, "scroll", async () => {
                if (pageHat.head.isConnected) {
                    await pageHat.forceRetract();
                    this.showGrid(true);
                }
            }));
            pageHat.onRetract(pct => window.requestAnimationFrame(() => {
                const s = this.gridContainer.style;
                s.transform = translateZ(pct * translateZMax + "px");
                s.opacity = (1 - pct).toString();
            }));
            const disconnected = async () => {
                if (this.selectedGridItem) {
                    const s = this.selectedGridItem.style;
                    s.transitionDuration = "0.75s";
                    s.transitionProperty = "opacity, filter";
                    await ScrollApp.UI.wait(1);
                    applyVisitedStyle(this.selectedGridItem);
                }
                this.selectedGridItem = null;
                this.gridContainer.style.transitionDuration = transitionDuration;
                for (const e of Query.ancestors(this.head))
                    if (e instanceof HTMLElement)
                        e.classList.remove(noOverflowClass);
                const info = this.getPost(index);
                if (info)
                    this.handlePostVisited(index);
            };
            pageHat.onDisconnect(disconnected);
            this.gridContainer.after(pageHat.head);
            this.showGrid(false);
        }
        /** */
        showGrid(show) {
            const s = this.gridContainer.style;
            s.transitionDuration = transitionDuration;
            s.transform = translateZ(show ? "0" : translateZMax + "px");
            s.opacity = show ? "1" : "0";
        }
    }
    ScrollApp.ScrollViewerHat = ScrollViewerHat;
    /**
     * A specialization of the ScrollViewerHat that supports scenarios where
     * multiple feeds are multiplexed into a single view.
     */
    class ScrollMuxViewerHat extends ScrollViewerHat {
        scroll;
        /** */
        constructor(scroll) {
            super();
            this.scroll = scroll;
            this.foregroundFetcher = new ScrollApp.ForegroundFetcher();
        }
        foregroundFetcher;
        /** */
        async handleRefresh() {
            await this.foregroundFetcher.fetch();
        }
        /** */
        getPost(index) {
            if (index >= ScrollApp.Data.readScrollPostCount(this.scroll.key))
                return null;
            return (async () => {
                block: {
                    const post = await ScrollApp.Data.readScrollPost(this.scroll.key, index);
                    if (post === null)
                        break block;
                    const url = Hat.over(this, ScrollApp.RootHat).getPostUrl(post);
                    if (!url)
                        break block;
                    const poster = await HtmlFeed.getPosterFromUrl(url);
                    if (!poster)
                        break block;
                    return post.visited ?
                        applyVisitedStyle(poster) :
                        poster;
                }
                return HtmlFeed.getErrorPoster();
            })();
        }
        /** */
        async getPageInfo(index) {
            const post = await ScrollApp.Data.readScrollPost(this.scroll.key, index);
            if (!post)
                throw new Error();
            const root = Hat.over(this, ScrollApp.RootHat);
            const postUrl = root.getPostUrl(post) || "";
            const page = await HtmlFeed.getPageFromUrl(postUrl);
            const head = page?.head || [];
            const sections = page ?
                page.sections.slice() :
                [HtmlFeed.getErrorPoster()];
            const feed = await ScrollApp.Data.readFeed(post.feed.key);
            if (!feed)
                throw new Error();
            return { head, sections, feed };
        }
        /** */
        async handlePostVisited(index) {
            const post = await ScrollApp.Data.readScrollPost(this.scroll.key, index);
            if (post) {
                post.visited = true;
                ScrollApp.Data.writePost(post);
            }
        }
    }
    ScrollApp.ScrollMuxViewerHat = ScrollMuxViewerHat;
    /**
     * A specialization of the ScrollViewerHat that supports scenarios where
     * a single feed is displayed within a single view.
     */
    class ScrollFeedViewerHat extends ScrollViewerHat {
        feed;
        urls;
        /** */
        constructor(feed, urls) {
            super();
            this.feed = feed;
            this.urls = urls;
        }
        /** */
        async handleRefresh() {
        }
        /** */
        getPost(index) {
            if (index < 0 || index >= this.urls.length)
                return null;
            const url = this.urls[index];
            return (async () => {
                const maybePoster = await HtmlFeed.getPosterFromUrl(url);
                return maybePoster || HtmlFeed.getErrorPoster();
            })();
        }
        /** */
        async getPageInfo(index) {
            return {
                head: [],
                sections: [],
                feed: this.feed,
            };
        }
        /** */
        handlePostVisited(index) { }
    }
    ScrollApp.ScrollFeedViewerHat = ScrollFeedViewerHat;
    /** */
    function applyVisitedStyle(e) {
        const s = e.style;
        s.filter = "saturate(0) brightness(0.4)";
        return e;
    }
    const translateZ = (amount) => `perspective(10px) translateZ(${amount})`;
    const translateZMax = -3;
    const noOverflowClass = hot.css({
        overflow: "hidden !"
    });
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /** */
    let Color;
    (function (Color) {
        Color.defaultHue = 215;
        /** */
        function from(values) {
            const h = (Array.isArray(values) ? values.at(0) : values.h) ?? Color.defaultHue;
            const s = (Array.isArray(values) ? values.at(1) : values.s) ?? 50;
            const l = (Array.isArray(values) ? values.at(2) : values.l) ?? 50;
            const a = Array.isArray(values) ? 1 : values.a ?? 1;
            return a === 1 ?
                `hsl(${h}, ${s}%, ${l}%)` :
                `hsla(${h}, ${s}%, ${l}%, ${a})`;
        }
        Color.from = from;
        /** */
        function white(alpha = 1) {
            return alpha === 1 ? "white" : `rgba(255, 255, 255, ${alpha})`;
        }
        Color.white = white;
        /** */
        function black(alpha = 1) {
            return alpha === 1 ? "black" : `rgba(0, 0, 0, ${alpha})`;
        }
        Color.black = black;
        /** */
        function gray(value = 128, alpha = 1) {
            return alpha === 1 ?
                `rgb(${value}, ${value}, ${value})` :
                `rgba(${value}, ${value}, ${value}, ${alpha})`;
        }
        Color.gray = gray;
    })(Color = ScrollApp.Color || (ScrollApp.Color = {}));
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /**
     * Namespace of functions for container query units.
     */
    let Cq;
    (function (Cq) {
        /**
         *
         */
        function width(amount, targetContainerClass) {
            return getProperty("width", "w", amount, targetContainerClass);
        }
        Cq.width = width;
        /**
         *
         */
        function height(amount, targetContainerClass) {
            return getProperty("height", "h", amount, targetContainerClass);
        }
        Cq.height = height;
        /**
         *
         */
        function left(amount, targetContainerClass) {
            return getProperty("left", "w", amount, targetContainerClass);
        }
        Cq.left = left;
        /** */
        function getProperty(property, axis, amount, cls) {
            if (supportsContainerUnits === null)
                supportsContainerUnits = hot.div({ width: "1cqw" }).style.width !== "";
            let container = null;
            return e => hot.on("connected", () => {
                container ||= Query.ancestors(e).find((c) => c instanceof HTMLElement &&
                    c.classList.contains(cls)) || null;
                if (!container)
                    throw "Container not found.";
                if (supportsContainerUnits) {
                    container.style.containerType = "size";
                    e.style.setProperty(property, amount + "cq" + axis);
                }
                else
                    ScrollApp.Resize.watch(container, (w, h) => {
                        const wOrH = axis === "w" ? w : h;
                        const stringified = ((amount / 100) * wOrH).toFixed(3) + "px";
                        e.style.setProperty(property, stringified);
                    }, true);
            });
        }
        let supportsContainerUnits = null;
    })(Cq = ScrollApp.Cq || (ScrollApp.Cq = {}));
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /** */
    let Origin;
    (function (Origin) {
        Origin["topLeft"] = "origin-tl";
        Origin["top"] = "origin-t";
        Origin["topRight"] = "origin-tr";
        Origin["left"] = "origin-l";
        Origin["center"] = "origin-c";
        Origin["right"] = "origin-r";
        Origin["bottomLeft"] = "origin-bl";
        Origin["bottom"] = "origin-b";
        Origin["bottomRight"] = "origin-br";
    })(Origin = ScrollApp.Origin || (ScrollApp.Origin = {}));
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /**
     * A namespace of color values that define the color palette
     * used across the application.
     */
    let Pal;
    (function (Pal) {
        Pal.gray1 = ScrollApp.Color.gray(180);
        Pal.gray2 = ScrollApp.Color.gray(100);
        Pal.gray3 = ScrollApp.Color.gray(60);
    })(Pal = ScrollApp.Pal || (ScrollApp.Pal = {}));
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /** */
    function appendCssReset() {
        document.head.append(hot.style("*", {
            position: "relative",
            padding: 0,
            margin: 0,
            zIndex: 0,
            boxSizing: "border-box",
            webkitFontSmoothing: "antialiased",
            color: "inherit",
            fontSize: "inherit",
        }, ":root", {
            height: isPwa ? "100vh" : "100dvh",
            fontSize: "20px",
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, avenir next, avenir, segoe ui, helvetica neue, helvetica, Ubuntu, roboto, noto, arial, sans-serif",
            color: "white",
            backgroundColor: "black",
        }, "BODY", {
            height: "inherit",
        }, 
        // Eliminate margin collapsing
        "ADDRESS, ARTICLE, ASIDE, BLOCKQUOTE, DD, DIV, FORM, " +
            "H1, H2, H3, H4, H4, H6, HEADER, HGROUP, OL, UL, P, PRE, SECTION", {
            padding: "0.016px 0"
        }, 
        // No scrollbars anywhere... for now
        "*::-webkit-scrollbar", {
            display: "none"
        }));
    }
    ScrollApp.appendCssReset = appendCssReset;
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    let Resize;
    (function (Resize) {
        /**
         * Observes the resizing of the particular element, and invokes
         * the specified callback when the element is resized.
         */
        function watch(e, callback, runInitially = false) {
            if (typeof ResizeObserver !== "undefined") {
                new ResizeObserver(rec => {
                    if (rec.length === 0)
                        return;
                    const entry = rec[0];
                    if (entry.borderBoxSize?.length > 0) {
                        const size = entry.borderBoxSize[0];
                        callback(size.inlineSize, size.blockSize);
                    }
                    else {
                        const width = e.offsetWidth;
                        const height = e.offsetHeight;
                        callback(width, height);
                    }
                }).observe(e, { box: "border-box" });
            }
            else
                hot.get(e)(hot.on(window, "resize", () => {
                    window.requestAnimationFrame(() => {
                        const width = e.offsetWidth;
                        const height = e.offsetHeight;
                        callback(width, height);
                    });
                }));
            if (runInitially) {
                const exec = () => callback(e.offsetWidth, e.offsetHeight);
                if (e.isConnected)
                    exec();
                else
                    hot.get(e)(hot.on("connected", exec));
            }
        }
        Resize.watch = watch;
    })(Resize = ScrollApp.Resize || (ScrollApp.Resize = {}));
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /**
     * A namespace of functions that produce generic CSS
     * styling values that aren't particular to any theme.
     */
    let Style;
    (function (Style) {
        /** */
        function backgroundOverlay() {
            return [
                {
                    backgroundColor: "rgba(0, 0, 0, 0.75)",
                },
                Style.backdropBlur(5),
            ];
        }
        Style.backgroundOverlay = backgroundOverlay;
        /** */
        function backdropBlur(pixels = 5) {
            const value = pixels > 0 ? `blur(${pixels}px)` : "none";
            return {
                backdropFilter: value,
                webkitBackdropFilter: value,
            };
        }
        Style.backdropBlur = backdropBlur;
        /** */
        Style.unselectable = {
            userSelect: "none",
            webkitUserSelect: "none",
        };
        /** */
        Style.presentational = {
            ...Style.unselectable,
            pointerEvents: "none",
            cursor: "default",
        };
        /** */
        Style.keyable = {
            tabIndex: 0,
            outline: 0,
        };
        /** */
        Style.clickable = {
            ...Style.unselectable,
            cursor: "pointer"
        };
        /**
         * Returns styles that produce a font weight whose value
         * may or may not be perfectly divisible by 100.
         */
        function weight(weight) {
            return {
                fontWeight: weight.toString(),
                ...(weight % 100 === 0 ? {} : { fontVariationSettings: "'wght' " + weight })
            };
        }
        Style.weight = weight;
        /**
         * Displays text at a given font size and weightthat
         * defaults to being unselectable.
         */
        function text(label = "", size = 20, weight) {
            return [
                Style.unselectable,
                {
                    fontSize: typeof size === "number" ? size + "px" : size,
                },
                weight ? Style.weight(weight) : null,
                label ? new Text(label) : null,
                e => {
                    // Only apply this weakly. The goal here is to get away from the I-beam,
                    // but other uses of this function could specify a pointer or something else,
                    // so this function shouldn't overwrite that.
                    if (e.style.cursor === "")
                        e.style.cursor = "default";
                }
            ];
        }
        Style.text = text;
        Style.borderRadiusLarge = "30px";
        Style.borderRadiusSmall = "10px";
    })(Style = ScrollApp.Style || (ScrollApp.Style = {}));
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /**
     *
     */
    let UI;
    (function (UI) {
        /** */
        function cornerAbsolute(kind) {
            if (kind === "tl")
                return hot.get(UI.corner("tl"))(cornerStyles, { top: 0, left: 0 });
            if (kind === "tr")
                return hot.get(UI.corner("tr"))(cornerStyles, { top: 0, right: 0 });
            else if (kind === "bl")
                return hot.get(UI.corner("bl"))(cornerStyles, { bottom: 0, left: 0 });
            else if (kind === "br")
                return hot.get(UI.corner("br"))(cornerStyles, { bottom: 0, right: 0 });
        }
        UI.cornerAbsolute = cornerAbsolute;
        const size = parseInt(ScrollApp.Style.borderRadiusLarge);
        const cornerStyles = {
            position: "absolute",
            zIndex: 1,
            width: size + "px",
            height: size + "px",
            pointerEvents: "none",
        };
        /**
         * Renders a single inverted rounded corner piece.
         */
        function corner(kind) {
            let top = 0;
            let right = 0;
            let bottom = 0;
            let left = 0;
            if (kind === "tl")
                bottom = right = -100;
            else if (kind === "tr")
                bottom = left = -100;
            else if (kind === "bl")
                top = right = -100;
            else if (kind === "br")
                top = left = -100;
            return hot.span("corner", {
                overflow: "hidden",
                width: "100px",
                height: "100px",
                clipPath: "inset(0 0)"
            }, hot.span({
                position: "absolute",
                top: top + "%",
                right: right + "%",
                bottom: bottom + "%",
                left: left + "%",
                borderRadius: "100%",
                boxShadow: "0 0 0 1000px black",
            }));
        }
        UI.corner = corner;
        /** */
        function stretch() {
            return [
                { width: "-moz-available" },
                { width: "-webkit-fill-available" },
                { width: "fill-available" },
                { width: "stretch" }
            ];
        }
        UI.stretch = stretch;
        /** */
        function escape(fn) {
            return [
                { tabIndex: 0 },
                hot.on("keydown", ev => {
                    if (ev.key === "Escape")
                        fn();
                })
            ];
        }
        UI.escape = escape;
        /** */
        function click(handlerFn) {
            return [
                e => (e.role = "button"),
                ScrollApp.Style.clickable,
                hot.on("click", handlerFn)
            ];
        }
        UI.click = click;
        /** */
        function wait(ms = 0) {
            return new Promise(r => setTimeout(r, ms));
        }
        UI.wait = wait;
        /** */
        async function waitConnected(e) {
            if (!e.isConnected)
                await new Promise(r => hot.get(e)(hot.on("connected", r)));
            // Wait an additional 1ms so that the element becomes transition-ready
            await new Promise(r => setTimeout(r, 1));
        }
        UI.waitConnected = waitConnected;
        /** */
        async function waitTransitionEnd(e) {
            await new Promise(r => e.addEventListener("transitionend", ev => {
                if (ev.target === e)
                    r();
            }));
        }
        UI.waitTransitionEnd = waitTransitionEnd;
        /** */
        function noScrollBars() {
            return hot.style("*::-webkit-scrollbar", {
                display: "none"
            });
        }
        UI.noScrollBars = noScrollBars;
        /** */
        function hide() {
            const cls = "hide";
            if (!hideHasRun) {
                hot.style("." + cls, { display: "none !" }).attach();
                hideHasRun = true;
            }
            return cls;
        }
        UI.hide = hide;
        let hideHasRun = false;
        /** */
        function visibleWhenAlone() {
            return hot.css(":not(:only-child) !", { display: "none" });
        }
        UI.visibleWhenAlone = visibleWhenAlone;
        /** */
        function visibleWhenNotAlone() {
            return hot.css(":only-child !", { display: "none" });
        }
        UI.visibleWhenNotAlone = visibleWhenNotAlone;
        /** */
        function visibleWhenEmpty(watchTarget) {
            return [
                watchTarget.children.length === 0 ? "" : UI.hide(),
                hot.on("connected", ev => addVisibilityObserver(ev.target, watchTarget, true)),
            ];
        }
        UI.visibleWhenEmpty = visibleWhenEmpty;
        /** */
        function visibleWhenNotEmpty(watchTarget) {
            return [
                watchTarget.children.length === 0 ? UI.hide() : "",
                hot.on("connected", ev => addVisibilityObserver(ev.target, watchTarget, false)),
            ];
        }
        UI.visibleWhenNotEmpty = visibleWhenNotEmpty;
        /** */
        function addVisibilityObserver(visibilityTarget, watchTarget, forEmpty) {
            if (!(visibilityTarget instanceof HTMLElement))
                return;
            const exec = () => {
                const children = Query.children(watchTarget);
                if (forEmpty && children.length > 0)
                    visibilityTarget.classList.add(UI.hide());
                else if (!forEmpty && children.length === 0)
                    visibilityTarget.classList.add(UI.hide());
                else
                    visibilityTarget.classList.remove(UI.hide());
            };
            exec();
            UI.onChildrenChanged(watchTarget, exec);
        }
        /** */
        function onChildrenChanged(e, fn) {
            new MutationObserver(() => fn()).observe(e, { childList: true });
        }
        UI.onChildrenChanged = onChildrenChanged;
        /** */
        async function collapse(e) {
            const height = e.offsetHeight;
            e.style.marginBottom = "0px";
            e.style.clipPath = "inset(0 0 0 0)";
            e.style.transitionProperty = "opacity, margin-bottom, clip-path";
            e.style.transitionDuration = "0.5s";
            await UI.wait();
            e.style.opacity = "0";
            e.style.marginBottom = "-" + height + "px";
            e.style.clipPath = "inset(0 0 100% 0)";
            await UI.waitTransitionEnd(e);
        }
        UI.collapse = collapse;
        /** */
        async function fade(e) {
            e.style.transitionProperty = "opacity";
            e.style.transitionDuration = "0.5s";
            e.style.pointerEvents = "none";
            if (!e.style.opacity)
                e.style.opacity = "1";
            await UI.wait();
            e.style.opacity = "0";
            await UI.waitTransitionEnd(e);
            e.style.visibility = "hidden";
        }
        UI.fade = fade;
    })(UI = ScrollApp.UI || (ScrollApp.UI = {}));
})(ScrollApp || (ScrollApp = {}));
var ScrollApp;
(function (ScrollApp) {
    /** */
    let Widget;
    (function (Widget) {
        /** */
        function hollowButton(options) {
            return hot.div({
                padding: "15px",
                border: "2px solid " + ScrollApp.Pal.gray1,
                borderRadius: "15px",
                color: ScrollApp.Pal.gray1,
                textAlign: "center",
                cursor: "pointer",
                whiteSpace: "nowrap",
            }, options.click && hot.on("click", options.click), ScrollApp.Style.text(options.text, 23, 500));
        }
        Widget.hollowButton = hollowButton;
        /** */
        function fillButton(...params) {
            return hot.div({
                display: "inline-block",
                padding: "10px",
                borderRadius: "5px",
                backgroundColor: "rgba(128, 128, 128, 0.5)",
                fontWeight: 500,
            }, ScrollApp.Style.clickable, ScrollApp.Style.backdropBlur(5), ...params);
        }
        Widget.fillButton = fillButton;
        /** */
        function underlineTextbox(...params) {
            return hot.input({
                outline: 0,
                border: 0,
                padding: "10px 0",
                borderBottom: "2px solid " + ScrollApp.Pal.gray2,
                backgroundColor: "transparent",
                color: "white",
                display: "block",
                fontSize: "inherit",
                spellcheck: false,
            }, ScrollApp.UI.stretch(), params);
        }
        Widget.underlineTextbox = underlineTextbox;
    })(Widget = ScrollApp.Widget || (ScrollApp.Widget = {}));
})(ScrollApp || (ScrollApp = {}));
