const fs = require('fs');
const path = require('path');

class StoreAdapter {
    constructor(hexo) {
        this.baseDir = hexo.source_dir;
        this.filePath = path.join(this.baseDir, '_data', 'places.json');
        this.data = {
            store: {},
            aliases: {}
        };
        this.loaded = false;
    }

    load() {
        if (this.loaded) return;

        if (fs.existsSync(this.filePath)) {
            try {
                const content = fs.readFileSync(this.filePath, 'utf8');
                const json = JSON.parse(content);
                this.data = {
                    store: json.store || {},
                    aliases: json.aliases || {}
                };

            } catch (e) {
                console.error('[hexo-next-charts] Failed to parse places.json, using empty store.', e);
            }
        }
        this.loaded = true;
    }

    save() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // Sort keys for consistent diffs
        const sortedData = {
            store: this._sortKeys(this.data.store),
            aliases: this._sortKeys(this.data.aliases)
        };
        fs.writeFileSync(this.filePath, JSON.stringify(sortedData, null, 2));
    }

    _sortKeys(obj) {
        return Object.keys(obj).sort().reduce((acc, key) => {
            acc[key] = obj[key];
            return acc;
        }, {});
    }

    get(name) {
        this.load();
        // Check aliases first
        const id = this.data.aliases[name];
        if (id && this.data.store[id]) {
            return this.data.store[id];
        }
        // Check if name is directly an ID
        if (this.data.store[name]) {
            return this.data.store[name];
        }
        return null;
    }

    set(name, data) {
        this.load();
        const id = data.id || name.toLowerCase().replace(/\s+/g, '_');

        // Update store
        this.data.store[id] = {
            name_cn: data.name_cn || name,
            coords: data.coords,
            source: data.source || 'auto'
        };

        // Update alias
        this.data.aliases[name] = id;

        // Also add the normalized name as alias if different
        if (data.name_cn && data.name_cn !== name) {
            this.data.aliases[data.name_cn] = id;
        }
    }



}

module.exports = StoreAdapter;
