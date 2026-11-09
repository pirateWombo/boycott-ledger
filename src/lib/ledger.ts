import { catalogBarcodes, catalogCompanies } from "@/lib/catalog";
import { judgeCompany } from "@/lib/public-record";

export type Status = "red" | "orange" | "green";

export type Company = {
  name: string;
  status: Status;
  reason: string;
  aliases: string[];
};

export type BarcodeEntry = {
  company: string;
  status: Status;
  reason: string;
};

export type Lookup =
  | {
      kind: "origin" | "listed" | "unknown";
      status: Status | "none";
      title: string;
      reason: string;
      code: string;
    };

const coreCompanies: Company[] = [
  {
    name: "Nintendo",
    status: "red",
    reason: "Japanese video game company with strong US market presence and partnerships.",
    aliases: ["nintendo"],
  },
  {
    name: "Sony Interactive Entertainment",
    status: "red",
    reason: "Japanese-owned PlayStation division producing hardware and exclusive games.",
    aliases: ["sony", "playstation"],
  },
  {
    name: "FromSoftware",
    status: "red",
    reason: "Japanese developer of Dark Souls, Elden Ring and similar titles.",
    aliases: ["fromsoftware", "from software"],
  },
  {
    name: "Capcom",
    status: "red",
    reason: "Japanese publisher and developer of Resident Evil and Street Fighter.",
    aliases: ["capcom"],
  },
  {
    name: "Square Enix",
    status: "red",
    reason: "Japanese company behind Final Fantasy and other major RPG series.",
    aliases: ["square enix"],
  },
  {
    name: "Microsoft Gaming",
    status: "orange",
    reason: "US parent with a Tokyo subsidiary, Microsoft Japan. Not Japanese-owned, so grey rather than strict.",
    aliases: ["microsoft", "xbox"],
  },
  {
    name: "Walmart",
    status: "green",
    reason: "US retailer. Sold its remaining Seiyu stake to Trial Holdings in 2025, so it no longer owns a Japanese company. Great Value is a house brand.",
    aliases: ["walmart", "wal mart", "great value", "equate", "marketside", "sams choice"],
  },
  {
    name: "Kikkoman",
    status: "red",
    reason: "Japanese parent. European and US barcodes are issued to subsidiaries and do not change the owner.",
    aliases: ["kikkoman"],
  },
  {
    name: "Ajinomoto",
    status: "red",
    reason: "Japanese parent. Local barcodes in Europe still belong to the same group.",
    aliases: ["ajinomoto"],
  },
  {
    name: "Yakult",
    status: "red",
    reason: "Japanese parent. Bottling and barcodes outside Japan do not change the owner.",
    aliases: ["yakult"],
  },
  {
    name: "Nissin",
    status: "red",
    reason: "Japanese parent. Overseas brands and barcodes still sit under Nissin Foods.",
    aliases: ["nissin"],
  },
  {
    name: "Mizkan",
    status: "red",
    reason: "Japanese parent. European-registered sauces and vinegars stay in the same group.",
    aliases: ["mizkan"],
  },
  {
    name: "Valve Corporation",
    status: "green",
    reason: "US company. Steam being sold in Japan is not treated as a company tie.",
    aliases: ["valve", "steam"],
  },
  {
    name: "ASUS",
    status: "green",
    reason: "Taiwanese company. Public records show no Japanese owner or Japanese subsidiary.",
    aliases: ["asus"],
  },
  {
    name: "CD Projekt",
    status: "orange",
    reason: "Polish-owned. Employs a Japan country manager and a Japan localization manager, and builds Japanese localization into development.",
    aliases: ["cd projekt", "cdprojekt", "cd projekt red"],
  },
  {
    name: "4A Games",
    status: "green",
    reason: "Ukrainian studio. No Japanese owner on record.",
    aliases: ["4a games"],
  },
];

export const companies: Company[] = [...coreCompanies, ...catalogCompanies];

export const barcodes: Record<string, BarcodeEntry> = {
  "4901234567890": {
    company: "Nintendo",
    status: "red",
    reason: "Japanese company producing consoles and games with extensive US partnerships.",
  },
  "4509876543210": {
    company: "Sony Interactive Entertainment",
    status: "red",
    reason: "Japanese parent company, PlayStation hardware and software.",
  },
  "4012345678901": {
    company: "CD Projekt",
    status: "orange",
    reason: "Polish-owned, with a Japan office and Japanese localization built into development.",
  },
  "5901122334455": {
    company: "4A Games",
    status: "green",
    reason: "Ukrainian/European developer, independent.",
  },
  "0001234567890": {
    company: "Microsoft Gaming",
    status: "orange",
    reason: "US parent with a Tokyo subsidiary, Microsoft Japan.",
  },
  ...catalogBarcodes,
};

export const sampleCodes = [
  { code: "4901234567890", label: "Nintendo" },
  { code: "4509876543210", label: "Sony" },
  { code: "4012345678901", label: "CDPR" },
  { code: "5901122334455", label: "4A" },
];

const STATUS_LABEL: Record<Status, string> = {
  red: "Strict",
  orange: "Grey",
  green: "Clear",
};

export function statusLabel(status: Status) {
  return STATUS_LABEL[status];
}

export function tally() {
  return {
    red: companies.filter((c) => c.status === "red").length,
    orange: companies.filter((c) => c.status === "orange").length,
    green: companies.filter((c) => c.status === "green").length,
  };
}

export function lookupBarcode(raw: string): Lookup {
  const code = raw.replace(/\D/g, "");
  if (code.length < 3) {
    return {
      kind: "unknown",
      status: "none",
      title: "Need a longer code",
      reason: "Enter or scan at least three digits.",
      code,
    };
  }
  const prefix = Number.parseInt(code.slice(0, 3), 10);
  if ((prefix >= 450 && prefix <= 459) || (prefix >= 490 && prefix <= 499)) {
    const listed = barcodes[code];
    return {
      kind: "origin",
      status: "red",
      title: "Japanese Origin",
      reason: listed
        ? `${listed.company}. ${listed.reason}`
        : "GS1 prefix 450–459 or 490–499.",
      code,
    };
  }
  const listed = barcodes[code];
  if (listed) {
    return {
      kind: "listed",
      status: listed.status,
      title: listed.company,
      reason: listed.reason,
      code,
    };
  }
  const issuer = gs1Issuer(prefix);
  const where = issuer ? `issued in ${issuer}` : `prefix ${prefix}, outside the Japanese ranges`;
  return {
    kind: "unknown",
    status: "orange",
    title: "Not cleared",
    reason: `Barcode ${where}. Public product records have no owner for this code, so it is not cleared.`,
    code,
  };
}

function gs1Issuer(prefix: number): string | null {
  const ranges: { from: number; to: number; name: string }[] = [
    { from: 0, to: 19, name: "the United States" },
    { from: 30, to: 39, name: "the United States" },
    { from: 60, to: 139, name: "the United States" },
    { from: 300, to: 379, name: "France" },
    { from: 380, to: 380, name: "Bulgaria" },
    { from: 383, to: 383, name: "Slovenia" },
    { from: 400, to: 440, name: "Germany" },
    { from: 460, to: 469, name: "Russia" },
    { from: 471, to: 471, name: "Taiwan" },
    { from: 489, to: 489, name: "Hong Kong" },
    { from: 500, to: 509, name: "the United Kingdom" },
    { from: 520, to: 521, name: "Greece" },
    { from: 540, to: 549, name: "Belgium or Luxembourg" },
    { from: 560, to: 560, name: "Portugal" },
    { from: 570, to: 579, name: "Denmark" },
    { from: 590, to: 590, name: "Poland" },
    { from: 594, to: 594, name: "Romania" },
    { from: 599, to: 599, name: "Hungary" },
    { from: 640, to: 649, name: "Finland" },
    { from: 690, to: 699, name: "China" },
    { from: 700, to: 709, name: "Norway" },
    { from: 729, to: 729, name: "Israel" },
    { from: 730, to: 739, name: "Sweden" },
    { from: 750, to: 750, name: "Mexico" },
    { from: 754, to: 755, name: "Canada" },
    { from: 760, to: 769, name: "Switzerland" },
    { from: 800, to: 839, name: "Italy" },
    { from: 840, to: 849, name: "Spain" },
    { from: 859, to: 859, name: "the Czech Republic" },
    { from: 868, to: 869, name: "Turkey" },
    { from: 870, to: 879, name: "the Netherlands" },
    { from: 880, to: 881, name: "South Korea" },
    { from: 885, to: 885, name: "Thailand" },
    { from: 888, to: 888, name: "Singapore" },
    { from: 890, to: 890, name: "India" },
    { from: 893, to: 893, name: "Vietnam" },
    { from: 899, to: 899, name: "Indonesia" },
    { from: 900, to: 919, name: "Austria" },
    { from: 930, to: 939, name: "Australia" },
    { from: 940, to: 949, name: "New Zealand" },
  ];
  return ranges.find((range) => prefix >= range.from && prefix <= range.to)?.name ?? null;
}

export function matchCompany(text: string): Company | null {
  const haystack = ` ${fold(text)} `;
  let best: { company: Company; length: number } | null = null;
  for (const company of companies) {
    for (const alias of company.aliases) {
      const needle = fold(alias);
      if (needle.length < 2 || !haystack.includes(` ${needle} `)) continue;
      if (!best || needle.length > best.length) best = { company, length: needle.length };
    }
  }
  return best?.company ?? null;
}

export async function identifyBarcode(code: string): Promise<Lookup | null> {
  const local = lookupBarcode(code);
  if (local.kind !== "unknown") return null;
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=brands,brand_owner,product_name`,
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      status?: number;
      product?: { brands?: string; brand_owner?: string; product_name?: string };
    };
    const product = data.product;
    if (data.status !== 1 || !product) return null;
    const label = [product.brands, product.brand_owner, product.product_name].filter(Boolean).join(" ");
    const company = matchCompany(label);
    const prefix = Number.parseInt(code.slice(0, 3), 10);
    const issuer = gs1Issuer(prefix);
    const where = issuer ? `issued in ${issuer}` : `prefix ${prefix}`;
    if (company) {
      const shown = product.brands || product.product_name || company.name;
      return {
        kind: "listed",
        status: company.status,
        title: company.name,
        reason: `${company.reason} Package: ${shown}. Barcode ${where}.`,
        code,
      };
    }
    const named = product.brand_owner || product.brands || product.product_name;
    if (!named) return local;
    const judged = await judgeCompany(named);
    const shown = product.brands && product.brands !== named ? product.brands : product.product_name;
    if (!judged) {
      return {
        kind: "unknown",
        status: "orange",
        title: named,
        reason: `Public records name this ${named}, but not who owns it. Barcode ${where}. Not cleared.`,
        code,
      };
    }
    return {
      kind: "listed",
      status: judged.status,
      title: judged.title,
      reason: `${judged.reason}${shown ? ` Package: ${shown}.` : ""} Barcode ${where}.`,
      code,
    };
  } catch {
    return null;
  }
}

function fold(value: string) {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const RANK: Record<Status, number> = { red: 0, orange: 1, green: 2 };

export function searchCompanies(query: string, filter: Status | "all") {
  const q = query.trim().toLowerCase();
  const matched = companies.filter((company) => {
    if (filter !== "all" && company.status !== filter) return false;
    if (!q) return true;
    return (
      company.name.toLowerCase().includes(q) ||
      company.aliases.some((alias) => alias.includes(q)) ||
      company.reason.toLowerCase().includes(q)
    );
  });
  return matched.sort(
    (a, b) => RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name),
  );
}
