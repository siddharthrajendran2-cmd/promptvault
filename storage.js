const STORAGE_KEY = 'promptvault';

const DEFAULT_DATA = {
  prompts: [],
  categories: ['work', 'coding', 'writing', 'personal'],
  settings: {
    defaultModel: 'claude',
    theme: 'dark',
  },
};

function read() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function write(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Seeds localStorage with the default schema if no data exists yet.
export function initStorage() {
  if (!read()) {
    write(structuredClone(DEFAULT_DATA));
  }
}

// Returns the full array of saved prompts.
export function getAllPrompts() {
  return read()?.prompts ?? [];
}

// Returns the prompt matching the given id, or null if not found.
export function getPromptById(id) {
  return getAllPrompts().find(p => p.id === id) ?? null;
}

// Creates a new prompt (auto-generating an id) or updates an existing one.
// Always stamps updatedAt with the current ISO timestamp. Returns the saved prompt.
export function savePrompt(prompt) {
  const data = read() ?? structuredClone(DEFAULT_DATA);
  const now = new Date().toISOString();
  const idx = data.prompts.findIndex(p => p.id === prompt.id);
  let saved;

  if (idx !== -1) {
    data.prompts[idx] = { ...data.prompts[idx], ...prompt, updatedAt: now };
    saved = data.prompts[idx];
  } else {
    saved = {
      ...prompt,
      id: crypto.randomUUID(),
      isFavorite: prompt.isFavorite ?? false,
      usageCount: prompt.usageCount ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    data.prompts.unshift(saved);
  }

  write(data);
  return saved;
}

// Removes the prompt with the given id. No-ops if the id is not found.
export function deletePrompt(id) {
  const data = read() ?? structuredClone(DEFAULT_DATA);
  data.prompts = data.prompts.filter(p => p.id !== id);
  write(data);
}

// Case-insensitive full-text search across title, content, and tags.
export function searchPrompts(query) {
  if (!query?.trim()) return getAllPrompts();
  const q = query.trim().toLowerCase();
  return getAllPrompts().filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.content.toLowerCase().includes(q) ||
    p.tags.some(t => t.toLowerCase().includes(q))
  );
}

// Returns the array of available category strings.
export function getCategories() {
  return read()?.categories ?? DEFAULT_DATA.categories;
}

// Shallow-merges newSettings into the existing settings object and persists it.
export function updateSettings(newSettings) {
  const data = read() ?? structuredClone(DEFAULT_DATA);
  data.settings = { ...data.settings, ...newSettings };
  write(data);
}

// Returns the current settings object.
export function getSettings() {
  return read()?.settings ?? structuredClone(DEFAULT_DATA.settings);
}
