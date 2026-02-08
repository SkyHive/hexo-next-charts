const fs = require('fs');

class MapProcessor {

    constructor(hexo) {
        this.hexo = hexo;
        this.log = hexo.log;
    }

    /**
     * Merge China provinces into World map
     * @param {string} worldPath Path to world.json
     * @param {string} chinaPath Path to china.json
     * @param {string} chinaContourPath Path to china-contour.json
     * @param {string} outputPath Path to save world_cn.json
     */
    async merge(worldPath, chinaPath, chinaContourPath, outputPath) {
        try {
            this.log.info('[Charts] Merging world map with China provinces (AliYun Standard GeoJSON)...');

            // 1. Read source files
            const worldData = JSON.parse(fs.readFileSync(worldPath, 'utf8'));
            const chinaData = JSON.parse(fs.readFileSync(chinaPath, 'utf8'));
            let chinaContourData = null;
            if (chinaContourPath && fs.existsSync(chinaContourPath)) {
                chinaContourData = JSON.parse(fs.readFileSync(chinaContourPath, 'utf8'));
            }

            // 2. Validate GeoJSON structure
            if (!worldData.features || !chinaData.features) {
                throw new Error('Invalid GeoJSON format: missing features array');
            }

            // 3. Filter out China from world map
            const chinaNames = new Set([
                'China',
                "People's Republic of China",
                'CN',
                'CHN'
            ]);

            const originalFeatureCount = worldData.features.length;

            worldData.features = worldData.features.filter(feature => {
                const name = feature.properties.name;
                const id = feature.id || feature.properties.id;
                if (chinaNames.has(name) || chinaNames.has(id)) {
                    return false;
                }
                return true;
            });

            if (worldData.features.length === originalFeatureCount) {
                this.log.warn('[Charts] Warning: "China" feature not found in world map (or already removed). Proceeding.');
            }

            // 4. Inject China provinces (Standard GeoJSON, no decoding needed)
            const provinceFeatures = chinaData.features.map(f => {
                f.properties = f.properties || {};
                f.properties._is_province = true;
                return f;
            });

            worldData.features = worldData.features.concat(provinceFeatures);

            // 4.5 Inject China Contour if available (Standard GeoJSON, no decoding needed)
            if (chinaContourData && chinaContourData.features) {
                const contourFeatures = chinaContourData.features.map(f => {
                    f.properties = f.properties || {};
                    f.properties.name = 'China_Border'; // Special name for styling
                    f.properties._is_contour = true;
                    return f;
                });
                worldData.features = worldData.features.concat(contourFeatures);
            }

            // 5. Write output
            fs.writeFileSync(outputPath, JSON.stringify(worldData));

            this.log.info(`[Charts] Map merged successfully. Output: ${outputPath}`);
            return true;

        } catch (err) {
            this.log.error(`[Charts] Map merge failed: ${err.message}`);
            return false;
        }
    }
}

module.exports = MapProcessor;
