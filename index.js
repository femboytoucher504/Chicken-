import { commands } from "@vendetta/commands";
import { storage } from "@vendetta/plugin";
import { React } from "@vendetta/metro/common";
import { General } from "@vendetta/ui/components";

const { TextInput, Button, View } = General;

// Default collection of reliable chicken image links/APIs
const DEFAULT_SOURCES = [
  "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1604848698030-c434ba08ece1?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1587573089734-09cb6b4eb18b?auto=format&fit=crop&w=800&q=80"
];

let patches = [];

export default {
  onLoad: () => {
    // Initialize storage for custom user sources
    storage.sources = storage.sources || [...DEFAULT_SOURCES];

    // Register the slash/chat command
    patches.push(
      commands.registerCommand({
        name: "chicken",
        description: "Send a random chick or chicken picture!",
        options: [],
        execute: (args, ctx) => {
          const sources = storage.sources.length > 0 ? storage.sources : DEFAULT_SOURCES;
          const randomPic = sources[Math.floor(Math.random() * sources.length)];
          
          // Sends the image directly to the channel chat
          return { content: randomPic };
        },
      })
    );
  },

  onUnload: () => {
    // Clean up commands when plugin is disabled
    for (const unpatch of patches) unpatch();
  },

  // Settings UI for adding new sources directly inside Revenge
  settings: () => {
    const [sources, setSources] = React.useState(storage.sources);
    const [newUrl, setNewUrl] = React.useState("");

    const addSource = () => {
      if (newUrl.trim() && newUrl.startsWith("http")) {
        const updated = [...sources, newUrl.trim()];
        storage.sources = updated;
        setSources(updated);
        setNewUrl("");
      }
    };

    return (
      <View style={{ padding: 10 }}>
        <TextInput
          placeholder="Paste chicken image URL here..."
          value={newUrl}
          onChangeText={(text) => setNewUrl(text)}
        />
        <Button text="Add Source" onPress={addSource} style={{ marginTop: 10, marginBottom: 20 }} />
        
        {/* Simple list displaying current source count */}
        <TextInput 
          editable={false} 
          value={`Total configured chicken sources: ${sources.length}`} 
        />
      </View>
    );
  }
};
