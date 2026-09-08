const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class LocalStorageMock {
  constructor(entries) { this.data = new Map(entries); }
  get length() { return this.data.size; }
  key(index) { return [...this.data.keys()][index] ?? null; }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

class TableMock {
  constructor() { this.rows = new Map(); }
  async toArray() { return [...this.rows.values()]; }
  async bulkPut(records) { records.forEach(record => this.rows.set(record.key, {...record})); }
  async put(record) { this.rows.set(record.key || record.name, {...record}); }
}

class DexieMock {
  constructor(name) {
    this.name = name;
    this.records = new TableMock();
    this.migrations = new TableMock();
    DexieMock.instance = this;
  }
  version() { return {stores: () => this}; }
  async open() {}
}

const localStorage = new LocalStorageMock([
  ['forge90.v1', '{"history":[{"id":"legacy-workout"}]}'],
  ['forge90_weight_v1', '{"entries":[{"weightKg":115.5}]}'],
  ['unrelated_app_key', 'must-stay-untouched']
]);
const events = [];
const window = {
  Dexie: DexieMock,
  dispatchEvent(event) { events.push(event); }
};
const context = vm.createContext({
  window,
  localStorage,
  console,
  Date,
  Map,
  Promise,
  CustomEvent: class CustomEvent { constructor(type, options) { this.type = type; this.detail = options.detail; } }
});

vm.runInContext(fs.readFileSync('forge90-storage.js', 'utf8'), context, {filename: 'forge90-storage.js'});

(async () => {
  const storage = window.Forge90Storage;
  assert.equal(await storage.init(), 'indexeddb');
  assert.equal(storage.getDatabaseName(), 'forge90_local_v1');
  assert.equal(storage.getItem('forge90.v1'), '{"history":[{"id":"legacy-workout"}]}');
  assert.equal(storage.getItem('forge90_weight_v1'), '{"entries":[{"weightKg":115.5}]}');
  assert.equal(storage.getItem('unrelated_app_key'), null);
  assert.equal(localStorage.getItem('unrelated_app_key'), 'must-stay-untouched');

  const imported = DexieMock.instance.migrations.rows.get('localStorage-to-indexedDB-v1').importedKeys.sort();
  assert.equal(imported.join(','), 'forge90.v1,forge90_weight_v1');

  storage.setItem('forge90_session_test', '{"active":true}');
  await storage.flush();
  assert.equal(localStorage.getItem('forge90_session_test'), '{"active":true}');
  assert.equal(DexieMock.instance.records.rows.get('forge90_session_test').deleted, false);

  storage.removeItem('forge90_session_test');
  await storage.flush();
  assert.equal(localStorage.getItem('forge90_session_test'), null);
  assert.equal(DexieMock.instance.records.rows.get('forge90_session_test').deleted, true);
  assert.equal(DexieMock.instance.records.rows.get('forge90_session_test').value, null);
  assert.throws(() => storage.setItem('unrelated_app_key', 'blocked'), /rejected unowned key/);
  assert.equal(events.at(-1).detail.mode, 'indexeddb');

  console.log('STORAGE_MIGRATION_REGRESSION=PASS');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
