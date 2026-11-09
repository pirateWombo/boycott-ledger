import type { Status } from "@/lib/ledger";

const JAPAN = "Q17";
const API = "https://www.wikidata.org/w/api.php";

type Claim = {
  mainsnak?: { datavalue?: { value?: { id?: string } } };
};

type Entity = {
  labels?: { en?: { value?: string } };
  claims?: Record<string, Claim[]>;
};

const cache = new Map<string, { status: Status; title: string; reason: string } | null>();

export async function judgeCompany(name: string) {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const id = await searchEntity(name);
    if (!id) {
      cache.set(key, null);
      return null;
    }
    const graph = await loadGraph(id);
    const self = graph.get(id);
    if (!self) {
      cache.set(key, null);
      return null;
    }
    const title = labelOf(self) || name;
    const judged = decide(title, id, graph);
    cache.set(key, judged);
    return judged;
  } catch {
    return null;
  }
}

function decide(title: string, id: string, graph: Map<string, Entity>) {
  const self = graph.get(id);
  if (!self) return null;
  if (isJapanese(self)) {
    return {
      status: "red" as const,
      title,
      reason: `${title} is recorded as a Japanese company.`,
    };
  }
  for (const ownerId of ids(self, "P127").concat(ids(self, "P749"))) {
    const owner = graph.get(ownerId);
    if (!owner || !isJapanese(owner)) continue;
    return {
      status: "red" as const,
      title,
      reason: `${title} is owned by ${labelOf(owner)}, a Japanese company.`,
    };
  }
  for (const subId of ids(self, "P355")) {
    const sub = graph.get(subId);
    if (!sub || !isJapanese(sub)) continue;
    return {
      status: "orange" as const,
      title,
      reason: `${title} is not Japanese-owned, but public records list a Japanese subsidiary: ${labelOf(sub)}.`,
    };
  }
  const country = countryName(self, graph);
  if (!country) return null;
  return {
    status: "green" as const,
    title,
    reason: `${title} is recorded in ${country}. No Japanese owner or Japanese subsidiary in public records. Selling in Japan is not counted.`,
  };
}

function isJapanese(entity: Entity) {
  return ids(entity, "P17").includes(JAPAN) || ids(entity, "P495").includes(JAPAN);
}

function countryName(entity: Entity, graph: Map<string, Entity>) {
  const countryId = ids(entity, "P17")[0];
  if (!countryId) return null;
  return labelOf(graph.get(countryId) ?? {}) || null;
}

function ids(entity: Entity, prop: string) {
  const claims = entity.claims?.[prop] ?? [];
  const found: string[] = [];
  for (const claim of claims) {
    const id = claim.mainsnak?.datavalue?.value?.id;
    if (id) found.push(id);
  }
  return found;
}

function labelOf(entity: Entity) {
  return entity.labels?.en?.value ?? "";
}

async function searchEntity(name: string) {
  const url = new URL(API);
  url.searchParams.set("action", "wbsearchentities");
  url.searchParams.set("search", name);
  url.searchParams.set("language", "en");
  url.searchParams.set("type", "item");
  url.searchParams.set("limit", "1");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  const data = (await response.json()) as { search?: { id: string }[] };
  return data.search?.[0]?.id ?? null;
}

async function loadGraph(rootId: string) {
  const first = await getEntities([rootId]);
  const root = first.get(rootId);
  const extra = new Set<string>();
  if (root) {
    for (const prop of ["P17", "P495", "P127", "P749"] as const) {
      for (const id of ids(root, prop).slice(0, 8)) extra.add(id);
    }
    for (const id of ids(root, "P355").slice(0, 80)) extra.add(id);
  }
  extra.delete(rootId);
  const rest = extra.size ? await getEntities([...extra]) : new Map<string, Entity>();
  const graph = new Map<string, Entity>([...first, ...rest]);
  const countries = new Set<string>();
  for (const entity of graph.values()) {
    for (const id of ids(entity, "P17").concat(ids(entity, "P495"))) countries.add(id);
  }
  for (const id of [...graph.keys()]) countries.delete(id);
  if (countries.size) {
    const countryEntities = await getEntities([...countries]);
    for (const [id, entity] of countryEntities) graph.set(id, entity);
  }
  return graph;
}

async function getEntities(idsToLoad: string[]) {
  const graph = new Map<string, Entity>();
  for (let index = 0; index < idsToLoad.length; index += 40) {
    const chunk = idsToLoad.slice(index, index + 40);
    const url = new URL(API);
    url.searchParams.set("action", "wbgetentities");
    url.searchParams.set("ids", chunk.join("|"));
    url.searchParams.set("props", "claims|labels");
    url.searchParams.set("languages", "en");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) continue;
    const data = (await response.json()) as { entities?: Record<string, Entity> };
    for (const [id, entity] of Object.entries(data.entities ?? {})) graph.set(id, entity);
  }
  return graph;
}
