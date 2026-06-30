/**
 * Chickenizer — a Vendetta plugin
 *
 * Sends random chicken/chick pictures pulled from a configurable list
 * of sources, and lets you add new sources on the fly.
 *
 * Commands:
 *   /chick            - posts a random chicken/chick image
 *   /chick-add <url>  - adds a new image source
 *   /chick-list       - lists current sources
 *   /chick-remove <i> - removes a source by its index from /chick-list
 *
 * Source types supported out of the box:
 *   - "random" sources: an API endpoint that returns a fresh random
 *     image URL on every request (e.g. some-api.com/random.json -> {url: "..."})
 *   - "static" sources: a fixed pool of direct image URLs, picked at random
 *
 * Drop this file (bundled) behind a manifest.json on a host Vendetta can
 * reach, per Vendetta's plugin-loading docs, or load it locally while
 * developing.
 */

import { storage } from "@vendetta/plugin";
import { findByProps } from "@vendetta/metro";
import { registerCommand } from "@vendetta/commands";
import { showToast } from "@vendetta/ui/toasts";

// ---- Default sources -------------------------------------------------
// "random" = endpoint that returns JSON with an image url each call
// "static" = a fixed list of direct image links, one is chosen at random
const DEFAULT_SOURCES = [
    {
        name: "RandomFox-style Chickens (placeholder API)",
        type: "random",
        endpoint: "https://some-chicken-api.example.com/random",
        // Adjust `path` to match whatever JSON shape the API returns,
        // e.g. "url" or "data.image" — dot-path lookup, see resolvePath().
        path: "url",
    },
    {
        name: "Static baby chick pool",
        type: "static",
        urls: [
            "https://upload.wikimedia.org/wikipedia/commons/4/4d/Baby_chick.jpg",
        ],
    },
];

let unpatchSend;

function resolvePath(obj, path) {
    return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function ensureStorage() {
    if (!storage.sources || !Array.isArray(storage.sources)) {
        storage.sources = DEFAULT_SOURCES;
    }
}

async function getRandomImageUrl() {
    ensureStorage();
    const sources = storage.sources;
    if (!sources.length) throw new Error("No sources configured. Use /chick-add to add one.");

    const source = sources[Math.floor(Math.random() * sources.length)];

    if (source.type === "static") {
        const urls = source.urls;
        if (!urls?.length) throw new Error(`Source "${source.name}" has no urls.`);
        return urls[Math.floor(Math.random() * urls.length)];
    }

    if (source.type === "random") {
        const res = await fetch(source.endpoint);
        if (!res.ok) throw new Error(`Source "${source.name}" returned HTTP ${res.status}`);
        const json = await res.json();
        const url = resolvePath(json, source.path ?? "url");
        if (!url || typeof url !== "string") {
            throw new Error(`Couldn't find an image URL at path "${source.path}" in response from "${source.name}".`);
        }
        return url;
    }

    throw new Error(`Unknown source type "${source.type}" on "${source.name}".`);
}

export const onLoad = () => {
    ensureStorage();

    const commandsToUnregister = [];

    commandsToUnregister.push(
        registerCommand({
            name: "chick",
            displayName: "chick",
            description: "Send a random chicken/chick picture",
            displayDescription: "Send a random chicken/chick picture",
            options: [],
            applicationId: "-1",
            inputType: 1,
            type: 1,
            execute: async (_args, ctx) => {
                try {
                    const url = await getRandomImageUrl();
                    return {
                        content: url,
                    };
                } catch (e) {
                    showToast(`Chickenizer error: ${e.message}`, null);
                    return { content: `⚠️ Couldn't fetch a chicken: ${e.message}` };
                }
            },
        })
    );

    commandsToUnregister.push(
        registerCommand({
            name: "chick-add",
            displayName: "chick-add",
            description: "Add a new chicken/chick image source",
            displayDescription: "Add a new chicken/chick image source (static URL or random-API endpoint)",
            options: [
                {
                    name: "url",
                    description: "Direct image URL, or a JSON API endpoint that returns one",
                    type: 3, // STRING
                    required: true,
                },
                {
                    name: "type",
                    description: "static (direct image link) or random (JSON API)",
                    type: 3,
                    required: false,
                },
                {
                    name: "json_path",
                    description: "For type=random: dot-path to the url field in the JSON response, e.g. data.url",
                    type: 3,
                    required: false,
                },
            ],
            applicationId: "-1",
            inputType: 1,
            type: 1,
            execute: async (args) => {
                ensureStorage();
                const url = args.find((a) => a.name === "url")?.value;
                const type = args.find((a) => a.name === "type")?.value ?? "static";
                const jsonPath = args.find((a) => a.name === "json_path")?.value ?? "url";

                if (!url) return { content: "⚠️ You need to provide a URL." };

                if (type === "random") {
                    storage.sources.push({
                        name: url,
                        type: "random",
                        endpoint: url,
                        path: jsonPath,
                    });
                } else {
                    storage.sources.push({
                        name: url,
                        type: "static",
                        urls: [url],
                    });
                }

                return { content: `✅ Added source: ${url} (type: ${type})` };
            },
        })
    );

    commandsToUnregister.push(
        registerCommand({
            name: "chick-list",
            displayName: "chick-list",
            description: "List current chicken/chick image sources",
            displayDescription: "List current chicken/chick image sources",
            options: [],
            applicationId: "-1",
            inputType: 1,
            type: 1,
            execute: () => {
                ensureStorage();
                const lines = storage.sources.map((s, i) => `${i}: [${s.type}] ${s.name}`);
                return { content: lines.length ? lines.join("\n") : "No sources configured." };
            },
        })
    );

    commandsToUnregister.push(
        registerCommand({
            name: "chick-remove",
            displayName: "chick-remove",
            description: "Remove a chicken/chick image source by index",
            displayDescription: "Remove a source by the index shown in /chick-list",
            options: [
                {
                    name: "index",
                    description: "Index from /chick-list",
                    type: 4, // INTEGER
                    required: true,
                },
            ],
            applicationId: "-1",
            inputType: 1,
            type: 1,
            execute: (args) => {
                ensureStorage();
                const index = args.find((a) => a.name === "index")?.value;
                if (index == null || index < 0 || index >= storage.sources.length) {
                    return { content: "⚠️ Invalid index. Check /chick-list." };
                }
                const removed = storage.sources.splice(index, 1);
                return { content: `🗑️ Removed: ${removed[0]?.name}` };
            },
        })
    );

    unpatchSend = () => commandsToUnregister.forEach((unregister) => unregister());
};

export const onUnload = () => {
    unpatchSend?.();
};

