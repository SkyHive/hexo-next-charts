const https = require('https');
const fs = require('fs');
const path = require('path');
const MapProcessor = require('./map_processor');

/**
 * Assets Manager for hexo-next-charts
 * Handles automatic downloading and caching of GeoJSON files
 */
class AssetsManager {
    constructor(hexo) {
        this.hexo = hexo;
        this.log = hexo.log;
        this.processor = new MapProcessor(hexo);

        // 映射代码到 CDN 文件名
        this.mapCodeMap = {
            'china': { file: 'china.json', cdn: 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json' }, // Standard GeoJSON from AliYun DataV
            'world': { file: 'world.json', cdn: 'https://fastly.jsdelivr.net/npm/echarts/map/json/world.json' },
            'places': { file: 'places.json', cdn: 'https://fastly.jsdelivr.net/gh/moshuchina/hexo-next-charts@main/lib/assets/places.json' },
            'china-contour': { file: 'china-contour.json', cdn: 'https://geo.datav.aliyun.com/areas_v3/bound/100000.json' }, // Standard GeoJSON Boundary from AliYun DataV
            'world-cn': { file: 'world_cn.json', type: 'generated', sources: ['world', 'china', 'china-contour'] }
        };
    }

    /**
     * Download file via HTTPS
     */
    async fetchFile(url, dest) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(dest);
            https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    file.close(() => {
                        fs.unlink(dest, () => { });
                        reject(new Error(`Failed to download: ${response.statusCode}`));
                    });
                    return;
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close(resolve);
                });
            }).on('error', (err) => {
                file.close(() => {
                    fs.unlink(dest, () => { });
                    reject(err);
                });
            });
        });
    }

    /**
     * Ensure map data exists
     * @param {string} mapType 'china', 'world', or 'world-cn'
     */
    async ensureMapData(mapType) {
        const mapConfig = this.mapCodeMap[mapType];

        if (!mapConfig) {
            this.log.warn(`[Charts] Unknown map type: ${mapType}`);
            return null;
        }

        const publicDir = path.join(this.hexo.public_dir, 'assets/charts/maps');
        const fileName = mapConfig.file;
        const destPath = path.join(publicDir, fileName);

        // Construct URL respecting site root (for subdirectory deployments)
        const root = this.hexo.config.root || '/';
        const publicUrl = `${root}assets/charts/maps/${fileName}`.replace(/\/+/g, '/');

        // Handle generated maps (like world-cn)
        if (mapConfig.type === 'generated') {
            if (fs.existsSync(destPath)) return publicUrl;

            this.log.info(`[Charts] Generating map: ${mapType}...`);

            // Ensure sources exist
            const sourcePaths = [];
            for (const sourceKey of mapConfig.sources) {
                // Recursively ensure sources are available
                await this.ensureMapData(sourceKey);

                // Get physical path of source
                const sourceConfig = this.mapCodeMap[sourceKey];
                const sourcePath = path.join(publicDir, sourceConfig.file);

                if (!fs.existsSync(sourcePath)) {
                    this.log.warn(`[Charts] Missing source map '${sourceKey}' for generation. Aborting.`);
                    return null;
                }
                sourcePaths.push(sourcePath);
            }

            // Execute merge
            if (mapType === 'world-cn') {
                // sources: [world, china, china-contour]
                const success = await this.processor.merge(sourcePaths[0], sourcePaths[1], sourcePaths[2], destPath);
                if (success) return publicUrl;
                return null;
            }
        }

        // Handle basic maps
        if (fs.existsSync(destPath)) return publicUrl;

        // Ensure directory exists
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        // Try local source first before any network activity
        // Note: internal assets should match the 'file' name
        const internalPath = path.join(__dirname, 'assets', fileName);
        if (fs.existsSync(internalPath)) {
            try {
                fs.copyFileSync(internalPath, destPath);
                this.log.info(`[Charts] Used local asset for ${mapType}.`);
                return publicUrl;
            } catch (err) {
                this.log.warn(`[Charts] Failed to copy local asset ${mapType}: ${err.message}`);
            }
        }

        // Try downloading
        if (mapConfig.cdn) {
            try {
                this.log.info(`[Charts] Downloading map data for ${mapType}...`);
                await this.fetchFile(mapConfig.cdn, destPath);
                return publicUrl;
            } catch (err) {
                this.log.warn(`[Charts] Failed to download ${mapType}: ${err.message}`);
            }
        }

        this.log.warn(`[Charts] Map file ${fileName} not found and download failed.`);
        return null;
    }
}

module.exports = AssetsManager;
