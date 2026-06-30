import { React } from "@vendetta/metro/common";
import { registerCommand } from "@vendetta/commands";
import { storage } from "@vendetta/plugin";
import { findByProps } from "@vendetta/metro";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

// 1. Core Configuration & Default Fallbacks
const defaultSources = [
  "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1569254994521-ddb5a3088399?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1604848698030-c434ba086c94?auto=format&fit=crop&w=800&q=80"
];

let unregisterCommand: () => void;

// 2. The Main Plugin Lifecycle Routine
export const onLoad = () => {
  if (!storage.sources) {
    storage.sources = [...defaultSources];
  }

  unregisterCommand = registerCommand({
    name: "chicken",
    displayName: "chicken",
    description: "Send a random chicken or chick picture instantly!",
    displayDescription: "Send a random chicken or chick picture instantly!",
    applicationId: "-1",
    inputType: 1,
    type: 1,
    options: [],
    execute: async (args, ctx) => {
      const MessageActions = findByProps("sendMessage", "receiveMessage") || findByProps("sendMessage");

      try {
        if (!MessageActions) {
          throw new Error("Discord messaging module not found.");
        }

        const sourcesList = storage.sources && storage.sources.length > 0 ? storage.sources : defaultSources;
        const randomSource = sourcesList[Math.floor(Math.random() * sourcesList.length)];
        
        let imageUrl = randomSource;
        
        if (randomSource.includes("/api") || randomSource.endsWith(".json")) {
          const response = await fetch(randomSource);
          const data = await response.json();
          imageUrl = data.url || data.image || data.file || data.link || randomSource;
        }

        MessageActions.sendMessage(ctx.channel.id, {
          content: imageUrl
        });
      } catch (err: any) {
        if (MessageActions?.receiveMessage) {
          MessageActions.receiveMessage(ctx.channel.id, {
            content: `❌ Failed to fetch chicken source: ${err.message}`
          });
        }
      }
    }
  });
};

export const onUnload = () => {
  if (unregisterCommand) unregisterCommand();
};

// 3. Integrated Control Panel Component
export function SettingsComponent() {
  const [input, setInput] = React.useState("");

  // Force component updates when local storage mutations occur
  const forceUpdate = React.useReducer((x) => x + 1, 0)[1];

  const handleAddSource = () => {
    if (!input.trim()) return;
    if (!storage.sources) storage.sources = [];
    storage.sources.push(input.trim());
    setInput("");
    forceUpdate();
  };

  const handleRemoveSource = (index: number) => {
    storage.sources.splice(index, 1);
    forceUpdate();
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "bold", marginBottom: 4 }}>
        Chicken Sources Manager
      </Text>
      <Text style={{ color: "#b9bbbe", marginBottom: 16, fontSize: 14 }}>
        Add direct image URLs or JSON APIs (which output a standard link, image, or file string payload).
      </Text>

      <View style={{ flexDirection: "row", marginBottom: 20 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="https://api.example.com/random-chicken"
          placeholderTextColor="#4f545c"
          style={{
            flex: 1,
            backgroundColor: "#202225",
            color: "#ffffff",
            padding: 12,
            borderRadius: 8,
            marginRight: 8,
            fontSize: 14
          }}
        />
        <TouchableOpacity
          onPress={handleAddSource}
          style={{
            backgroundColor: "#5865F2",
            justifyContent: "center",
            paddingHorizontal: 16,
            borderRadius: 8
          }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "bold" }}>Add</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "bold", marginBottom: 8 }}>
        Active Pipeline Sources ({storage.sources?.length || 0})
      </Text>
      
      {storage.sources?.map((source: string, index: number) => (
        <View
          key={index}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#2f3136",
            padding: 12,
            borderRadius: 8,
            marginBottom: 8
          }}
        >
          <Text style={{ color: "#ffffff", flex: 1, marginRight: 8, fontSize: 13 }} numberOfLines={1}>
            {source}
          </Text>
          <TouchableOpacity onPress={() => handleRemoveSource(index)}>
            <Text style={{ color: "#ED4245", fontWeight: "bold", fontSize: 13 }}>Delete</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

// Export settings component to match the Revenge layout contract
export { SettingsComponent as settings };
    
