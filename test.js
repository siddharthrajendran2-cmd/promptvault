import {
  initStorage,
  getAllPrompts,
  getPromptById,
  savePrompt,
  deletePrompt,
  searchPrompts,
  getCategories,
  updateSettings,
  getSettings,
} from './storage.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function section(label) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${label}`);
  console.log('─'.repeat(50));
}

function log(label, value) {
  console.log(`[${label}]`, value);
}

// Clear any pre-existing data so the test run is always clean.
localStorage.removeItem('promptvault');

// ── Dummy data ────────────────────────────────────────────────────────────────

const prompt1 = {
  title: 'Summarize meeting notes',
  content: 'You are a professional assistant. Summarize the following meeting notes into clear action items and key decisions:\n\n{{meeting_notes}}',
  tags: ['productivity', 'meetings', 'work'],
  model: 'claude',
  category: 'work',
  isFavorite: true,
  usageCount: 0,
};

const prompt2 = {
  title: 'Explain code like I\'m a beginner',
  content: 'Explain the following {{language}} code step by step as if I have no programming experience. Use simple analogies where helpful:\n\n```{{language}}\n{{code}}\n```',
  tags: ['coding', 'learning', 'debugging'],
  model: 'gpt-4',
  category: 'coding',
  isFavorite: false,
  usageCount: 0,
};

// ── 1. initStorage ────────────────────────────────────────────────────────────

section('1. initStorage()');
initStorage();
log('localStorage after init', JSON.parse(localStorage.getItem('promptvault')));

// ── 2. getCategories ─────────────────────────────────────────────────────────

section('2. getCategories()');
log('categories', getCategories());

// ── 3. getSettings ───────────────────────────────────────────────────────────

section('3. getSettings()');
log('settings', getSettings());

// ── 4. updateSettings ────────────────────────────────────────────────────────

section('4. updateSettings({ theme: "light", defaultModel: "gpt-4" })');
updateSettings({ theme: 'light', defaultModel: 'gpt-4' });
log('settings after update', getSettings());

// ── 5. savePrompt — add prompt1 ───────────────────────────────────────────────

section('5a. savePrompt() — add prompt1');
savePrompt(prompt1);
const [saved1] = getAllPrompts();
log('saved prompt1', saved1);

// ── 6. savePrompt — add prompt2 ───────────────────────────────────────────────

section('5b. savePrompt() — add prompt2');
savePrompt(prompt2);
const [saved2] = getAllPrompts(); // newest is always first
log('saved prompt2', saved2);

// ── 7. savePrompt — update prompt1 (toggle isFavorite) ───────────────────────

section('5c. savePrompt() — update prompt1 (set isFavorite: false)');
savePrompt({ ...saved1, isFavorite: false });
log('prompt1 after update', getPromptById(saved1.id));

// ── 8. getAllPrompts ──────────────────────────────────────────────────────────

section('6. getAllPrompts()');
log('all prompts', getAllPrompts());

// ── 9. getPromptById ─────────────────────────────────────────────────────────

section('7. getPromptById()');
log(`found by id (${saved1.id.slice(0, 8)}…)`, getPromptById(saved1.id));
log('non-existent id', getPromptById('does-not-exist-000'));

// ── 10. searchPrompts ────────────────────────────────────────────────────────

section('8. searchPrompts()');
log('search "meeting"', searchPrompts('meeting'));
log('search "coding"',  searchPrompts('coding'));
log('search "learning"', searchPrompts('learning'));  // matches tag on prompt2
log('search "zzz" (no results)', searchPrompts('zzz'));
log('search "" (all)',  searchPrompts(''));

// ── 11. deletePrompt ─────────────────────────────────────────────────────────

section(`9. deletePrompt(${saved1.id.slice(0, 8)}…) — remove prompt1`);
deletePrompt(saved1.id);
log('getPromptById after delete (should be null)', getPromptById(saved1.id));

// ── 12. getAllPrompts — confirm deletion ──────────────────────────────────────

section('10. getAllPrompts() — after deletion (should have 1 prompt)');
log('all prompts', getAllPrompts());

console.log('\n✓ All tests complete.\n');
