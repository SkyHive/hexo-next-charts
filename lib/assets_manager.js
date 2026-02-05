const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Assets Manager for hexo-next-charts
 * Handles automatic downloading and caching of GeoJSON files
 */
class AssetsManager {
    constructor(hexo) {
        this.hexo = hexo;
        this.log = hexo.log;
        // 地图数据源，可以配置为阿里云 DataV 或 jsDelivr
        this.cdnBase = 'https://geo.datav.aliyun.com/areas_v3/bound/';
        this.worldMapUrl = 'https://fastly.jsdelivr.net/npm/echarts/map/json/world.json';
        this.chinaMapUrl = 'https://fastly.jsdelivr.net/npm/echarts/map/json/china.json';
        
        // 映射代码到 CDN 文件名
        this.mapCodeMap = {
            'china': { file: '100000_full.json', cdn: this.chinaMapUrl },
            'world': { file: 'world.json', cdn: this.worldMapUrl },
            'places': { file: 'places.json', cdn: 'https://fastly.jsdelivr.net/gh/moshuchina/hexo-next-charts@main/lib/assets/places.json' }
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
                    reject(new Error(`Failed to download: ${response.statusCode}`));
                    return;
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }).on('error', (err) => {
                fs.unlink(dest, () => {}); 
                reject(err);
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

        // Handle composite maps (like world-cn)
        if (mapConfig.composite) {
            // For composite maps, ensure all component maps are available
            const paths = {};
            for (const subMap of mapConfig.maps) {
                const subPath = await this.ensureMapData(subMap);
                if (subPath) paths[subMap] = subPath;
            }
            return { composite: true, maps: paths };
        }

        const publicDir = path.join(this.hexo.public_dir, 'assets/charts/maps');
        const fileName = mapConfig.file;
        const destPath = path.join(publicDir, fileName);

        // Construct URL respecting site root (for subdirectory deployments)
        const root = this.hexo.config.root || '/';
        const publicUrl = `${root}assets/charts/maps/${fileName}`.replace(/\/+/g, '/');

        if (fs.existsSync(destPath)) return publicUrl;

        // 创建目录
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        const url = mapConfig.cdn || `${this.cdnBase}${mapConfig.file}`;
        
        // Try local fallback first if it's our internal places file
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

        this.log.info(`[Charts] Downloading GeoJSON for ${mapType}...`);
        try {
            await this.fetchFile(url, destPath);
            this.log.info(`[Charts] Successfully cached ${mapType} map.`);
            return publicUrl;
        } catch (err) {
            this.log.error(`[Charts] Download failed for ${mapType}: ${err.message}`);
            return null;
        }
    }
}

module.exports = AssetsManager;