import { commands, logger, storage } from "@revenge-mod/plugin";
import { findByProps } from "@revenge-mod/metro";

// Grab the core channel and message sending utilities from Discord's React Native modules
const MessageActions = findByProps("sendMessage", "receiveMessage");
const ChannelStore = findByProps("getChannel", "hasChannel");

// Initialize default image sources if the user hasn't added any yet
storage.sources ??= [
    "https://api.thecatapi.com/v1/images/search?mime_types=jpg,png", // We'll abstract this for birds/chickens
    "https://shibe.online/api/birds?count=1&urls=true&httpsUrls=true"
];

// Fallback high-quality public API endpoints for baby chicks/chickens if custom ones fail
const DEFAULT_CHICK_BACKUP = "https://source.unsplash.com/featured/?chick,chicken";

let commandUnregister: () => void;

export const onLoad = () => {
    try {
        // Register the slash/chat command
        commandUnregister = commands.registerCommand({
            name: "chick",
            description: "Send a random chick or chicken picture into the chat!",
            options: [
                {
                    name: "source",
                    description: "Pick a specific source index from your list (Optional)",
                    type: 4, // Integer type
                    required: false,
                }
            ],
            execute: async (args, ctx) => {
                const channelId = ctx.channel.id;
                const sourceIdx = args.find(a => a.name === "source")?.value;
                
                let imageUrl = DEFAULT_CHICK_BACKUP;
                
                try {
                    // Decide which URL endpoint to hitting
                    const activeSources: string[] = storage.sources;
                    const selectedUrl = (typeof sourceIdx === "number" && activeSources[sourceIdx]) 
                        ? activeSources[sourceIdx] 
                        : activeSources[Math.floor(Math.random() * activeSources.length)];

                    // Fetch data from the web source
                    const response = await fetch(selectedUrl);
                    const data = await response.json();

                    // Standard parsing structures for popular image randomizers
                    if (Array.isArray(data) && data[0]?.url) {
                        imageUrl = data[0].url; // e.g., CatAPI/DogAPI syntax structures
                    } else if (Array.isArray(data) && typeof data[0] === "string") {
                        imageUrl = data[0]; // e.g., shibe.online array syntax
                    } else if (data?.url) {
                        imageUrl = data.url;
                    } else if (data?.message) {
                        imageUrl = data.message;
                    } else {
                        // If json parsing doesn't easily resolve to an image string, fall back to the raw redirect URL
                        imageUrl = selectedUrl;
                    }
                } catch (err) {
                    logger.error("Failed fetching from custom source list, falling back.", err);
                }

                // Programmatically post the text link into the current text channel so everyone sees the image embed
                MessageActions.sendMessage(channelId, {
                    content: `🐥 Behold a glorious chick/chicken: ${imageUrl}`
                });
            }
        });

        // Register a management command to add sources dynamically via chat if they don't want to open settings
        commands.registerCommand({
            name: "chick-source",
            description: "Manage your random chick image API feeds",
            options: [
                {
                    name: "action",
                    description: "Choose to 'add' or 'list' sources",
                    type: 3, // String type
                    required: true,
                    choices: [
                        { name: "add", value: "add" },
                        { name: "list", value: "list" }
                    ]
                },
                {
                    name: "url",
                    description: "The JSON API URL or direct image URL endpoint to insert",
                    type: 3,
                    required: false
                }
            ],
            execute: (args, ctx) => {
                const action = args.find(a => a.name === "action").value;
                const url = args.find(a => a.name === "url")?.value;

                if (action === "list") {
                    const listStr = storage.sources.map((src: string, i: number) => `[${i}]: ${src}`).join("\n");
                    // Send an ephemeral local message only visible to the user executing it
                    MessageActions.receiveMessage(ctx.channel.id, {
                        content: `**Current Bird Sources:**\n${listStr}`
                    });
                    return;
                }

                if (action === "add" && url) {
                    storage.sources.push(url);
                    MessageActions.receiveMessage(ctx.channel.id, {
                        content: `✅ Successfully added source index **${storage.sources.length - 1}**!`
                    });
                }
            }
        });

    } catch (e) {
        logger.error("Error launching Chirpify", e);
    }
};

export const onUnload = () => {
    // Gracefully clean up commands when the plugin is toggled off or updated
    if (commandUnregister) commandUnregister();
};
