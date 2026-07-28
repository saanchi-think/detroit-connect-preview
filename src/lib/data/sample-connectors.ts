import type { ConnectorCardModel } from "@/lib/connectors/types";

export const sampleConnectors: ConnectorCardModel[] = [
  {
    id: "maria-rodriguez",
    kind: "person",
    name: "Maria Rodriguez",
    role: "Community development connector",
    neighborhood: "Southwest Detroit",
    topics: ["Housing", "Schools", "Neighborhoods"],
    languages: ["English", "Spanish"],
    friendSignal: "Recommended by Nia",
  },
  {
    id: "darnell-williams",
    kind: "person",
    name: "Darnell Williams",
    role: "City services navigator",
    neighborhood: "Bagley",
    topics: ["Utilities", "City Services", "Moving"],
    languages: ["English"],
    friendSignal: "Recommended in your Detroit circle",
  },
  {
    id: "aisha-king",
    kind: "person",
    name: "Aisha King",
    role: "Small business advisor",
    neighborhood: "New Center",
    topics: ["Business", "Permits", "Finances"],
    languages: ["English"],
    friendSignal: "Saved by Lina",
  },
];
