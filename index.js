const DEFAULT_SOURCES = [
  "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1604848698030-c434ba08ece1?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1587573089734-09cb6b4eb18b?auto=format&fit=crop&w=800&q=80"
];

// Dynamically fetch Discord's high-performance native storage database
const getStorage = () => {
  return vendetta.metro.findByProps("getString", "setString");
};

const getSources = () => {
  try {
    const db = getStorage();
    const stored = db ? db.getString("chickenizer_sources") : null;
    return stored ? JSON.parse(stored) : [...DEFAULT_SOURCES];
  } catch {
    return [...DEFAULT_SOURCES];
  }
};

const saveSources = (sources) => {
  try {
    const db = getStorage();
    if (db) db.setString("chickenizer_sources", JSON.stringify(sources));
  } catch (e) {}
};

let patches = [];

export default {
  onLoad: () => {
    const { commands } = vendetta;

    // 1. /chick - Sends a random picture
    patches.push(
      commands.registerCommand({
        name: "chick",
        description: "Sends a random chicken or chick picture",
        options: [],
        execute: (args, ctx) => {
          const srcs = getSources();
          const randomPic = srcs[Math.floor(Math.random() * srcs.length)];
          return { content: randomPic };
        },
      })
    );

    // 2. /chick-add - Appends a new image URL
    patches.push(
      commands.registerCommand({
        name: "chick-add",
        description: "Add a new chicken picture source URL",
        options: [
          {
            name: "url",
            description: "The direct link to the image",
            type: 3, // String
            required: true,
          },
        ],
        execute: (args, ctx) => {
          const urlOption = args.find((arg) => arg.name === "url");
          if (!urlOption || !urlOption.value.startsWith("http")) {
            return { content: "❌ Please provide a valid web URL." };
          }
          
          const targetUrl = urlOption.value.trim();
          const srcs = getSources();
          if (srcs.includes(targetUrl)) {
            return { content: "⚠️ This source link is already saved." };
          }

          srcs.push(targetUrl);
          saveSources(srcs);
          return { content: "✅ Added new source successfully!" };
        },
      })
    );

    // 3. /chick-list - Lists current sources
    patches.push(
      commands.registerCommand({
        name: "chick-list",
        description: "List all active chicken picture sources",
        options: [],
        execute: (args, ctx) => {
          const srcs = getSources();
          if (srcs.length === 0) {
            return { content: "🐔 No image sources are currently loaded." };
          }
          
          const visibleList = srcs
            .map((src, index) => `**${index + 1}.** ${src}`)
            .join("\n");
            
          return { content: `### 📂 Current Chicken Sources:\n${visibleList}` };
        },
      })
    );

    // 4. /chick-remove - Deletes an entry by its index number
    patches.push(
      commands.registerCommand({
        name: "chick-remove",
        description: "Remove a source entry using its index number from /chick-list",
        options: [
          {
            name: "index",
            description: "The number of the source to delete",
            type: 4, // Integer
            required: true,
          },
        ],
        execute: (args, ctx) => {
          const indexOption = args.find((arg) => arg.name === "index");
          if (!indexOption) return { content: "❌ Specify an item number to clear." };

          const itemIndex = parseInt(indexOption.value) - 1;
          const srcs = getSources();
          if (itemIndex >= 0 && itemIndex < srcs.length) {
            const deletedItem = srcs.splice(itemIndex, 1);
            saveSources(srcs);
            return { content: `🗑️ Successfully removed source entry: <${deletedItem[0]}>` };
          }

          return { content: "❌ Invalid item number. Check positions via `/chick-list` first." };
        },
      })
    );
  },

  onUnload: () => {
    for (const unpatch of patches) unpatch();
  },
};
