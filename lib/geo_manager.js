const pLimit = require('p-limit');
const StoreAdapter = require('./store_adapter');
const ApiClient = require('./api_client');

class GeoManager {
    constructor(hexo) {
        this.hexo = hexo;
        this.log = hexo.log;
        this.store = new StoreAdapter(hexo);
        this.api = new ApiClient(hexo.config.next_charts, this.log);
        this.pendingCities = new Set();
        this.isResolving = false;
    }

    /**
     * Normalize city name: remove common suffixes and whitespace
     */
    normalize(name) {
        if (!name) return '';
        return name.trim()
            .replace(/(省|市|区|州|县|自治[州县])$/g, "")
            .toLowerCase();
    }

    /**
     * Register a city to be resolved
     * @param {string} rawName 
     */
    register(rawName) {
        if (!rawName) return;
        this.pendingCities.add(rawName);
    }

    /**
     * Batch resolve all pending cities
     */
    async resolve() {
        if (this.isResolving) return;
        this.isResolving = true;
        this.store.load();

        const citiesToResolve = Array.from(this.pendingCities);
        this.log.info(`[hexo-next-charts] Resolving ${citiesToResolve.length} cities...`);

        const limit = pLimit(5); // Concurrency limit
        let resolvedCount = 0;
        let cachedCount = 0;

        const tasks = citiesToResolve.map(name => limit(async () => {
            const normalizedIsIata = /^[A-Z]{3}$/.test(name);
            
            // 1. Check Cache
            const cached = this.store.get(name);
            if (cached) {
                cachedCount++;
                return;
            }

            // 2. Resolve via API
            // Try normalized name first for better match, unless it looks like an IATA code
            const queryName = normalizedIsIata ? name : this.normalize(name);
            
            // Double check cache with normalized name
            if (queryName !== name) {
                 const cachedNorm = this.store.get(queryName);
                 if (cachedNorm) {
                     // Add alias for original name to point to same ID
                     this.store.set(name, { ...cachedNorm, id: cachedNorm.id || queryName }); 
                     cachedCount++;
                     return;
                 }
            }
            
            this.log.info(`[hexo-next-charts] Fetching coordinates for: ${name}`);
            const result = await this.api.resolve(queryName || name);
            
            if (result) {
                this.store.set(name, result);
                resolvedCount++;
            } else {
                this.log.warn(`[hexo-next-charts] Could not resolve: ${name}`);
            }
        }));

        await Promise.all(tasks);

        if (resolvedCount > 0) {
            this.store.save();
            this.log.info(`[hexo-next-charts] Saved ${resolvedCount} new places to places.json`);
        }
        this.log.info(`[hexo-next-charts] Resolution complete. Cached: ${cachedCount}, New: ${resolvedCount}`);
        this.isResolving = false;
    }

    /**
     * Get resolved data for extraction
     */
    getResolved(name) {
        return this.store.get(name);
    }
}

module.exports = GeoManager;
