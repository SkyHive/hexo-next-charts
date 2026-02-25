/**
 * Line Chart Transformer
 * Renders line charts for trend data visualization
 * Perfect for showing changes over time
 */

const BaseTransformer = require("./base");

class LineTransformer extends BaseTransformer {
  /**
   * Get default configuration for line charts
   * @returns {object}
   */
  getDefaultConfig() {
    return {
      backgroundColor: "transparent",
      smooth: true,
      showArea: false,
      showPoints: true,
      lineWidth: 3,
      symbolSize: 8,
      color: null, // Will use default color palette
    };
  }

  /**
   * Validate input data
   * @param {*} data - Input data
   * @returns {object}
   */
  validate(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return { valid: false, error: "Line data must be a non-empty array" };
    }
    return { valid: true };
  }

  /**
   * Transform data to ECharts option
   * @param {Array} data - Array of data points
   * @returns {object} ECharts option
   */
  transform(data) {
    const validation = this.validate(data);
    if (!validation.valid) {
      return {};
    }

    const config = this.mergeConfig(this.config);

    // Process data - support both simple and complex formats
    const { categories, seriesMap } = this.processData(data);

    // Build series
    const seriesNames = Object.keys(seriesMap);
    const series = seriesNames.map((name) => {
      const displayName =
        name === "Value" && config.seriesName && seriesNames.length === 1
          ? config.seriesName
          : name;
      return this.buildLineSeries(displayName, seriesMap[name], config);
    });

    // Build option
    const option = {
      backgroundColor: config.backgroundColor,
      tooltip: this.buildTooltip("axis", {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          label: { backgroundColor: "#6a7985" },
        },
      }),
      toolbox: this.buildToolbox({ restore: false }),
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: config.boundaryGap !== undefined ? config.boundaryGap : false,
        data: categories,
        axisLine: { lineStyle: { color: "#666" } },
        axisLabel: { color: "#666" },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: "#eee" } },
        axisLabel: { 
          color: "#666",
          margin: config.yAxisMargin !== undefined ? config.yAxisMargin : 8
        },
      },
      series: series,
    };

    // Add legend if multiple series or explicitly requested
    if (
      (seriesNames.length > 1 || config.showLegend) &&
      config.showLegend !== false
    ) {
      const legendConfig = {
        data: series.map((s) => s.name),
        textStyle: { color: "#666" },
      };
      
      const legendPos = config.legendPosition || "bottom";
      if (legendPos === "left") {
        legendConfig.orient = "vertical";
        legendConfig.left = "left";
        legendConfig.top = "center";
        if (option.grid.left === "3%") option.grid.left = "15%";
      } else if (legendPos === "right") {
        legendConfig.orient = "vertical";
        legendConfig.right = "right";
        legendConfig.top = "center";
        if (option.grid.right === "4%") option.grid.right = "15%";
      } else if (legendPos === "top") {
        legendConfig.top = "top";
      } else {
        legendConfig.bottom = 0;
        if (option.grid.bottom === "3%") option.grid.bottom = "15%";
      }
      
      option.legend = legendConfig;
    }

    // Add title if provided
    const title = this.buildTitle(config.title);
    if (title) {
      option.title = title;
    }

    // Allow user config to override everything
    return this.merger.merge(option, config.option || {});
  }

  /**
   * Process data into categories and series data
   * @param {Array} data - Input data
   * @returns {object} Processed data
   */
  processData(data) {
    const categories = [];
    const seriesMap = {};

    data.forEach((item, index) => {
      if (typeof item === "object") {
        categories.push(
          item.label || item.name || item.x || `Item ${index + 1}`,
        );

        // Get all keys except the category label
        const reservedKeys = ["label", "name", "x"];
        const keys = Object.keys(item).filter((k) => !reservedKeys.includes(k));

        if (keys.length === 1 && (keys[0] === "value" || keys[0] === "y")) {
          // Single series case
          if (!seriesMap["Value"]) seriesMap["Value"] = Array(index).fill(0);
          seriesMap["Value"].push(item[keys[0]]);
        } else if (keys.length > 0) {
          // Multiple series case
          keys.forEach((k) => {
            if (!seriesMap[k]) seriesMap[k] = Array(index).fill(0);
            seriesMap[k].push(item[k]);
          });
        } else {
          // Missing values
          if (!seriesMap["Value"]) seriesMap["Value"] = Array(index).fill(0);
          seriesMap["Value"].push(0);
        }

        // Fill missing values for series that weren't in this item
        Object.keys(seriesMap).forEach((k) => {
          if (seriesMap[k].length <= index) {
            seriesMap[k].push(0);
          }
        });
      } else {
        categories.push(`Item ${index + 1}`);
        if (!seriesMap["Value"]) seriesMap["Value"] = Array(index).fill(0);
        seriesMap["Value"].push(item);

        // Fill missing values for other series
        Object.keys(seriesMap).forEach((k) => {
          if (seriesMap[k].length <= index) {
            seriesMap[k].push(0);
          }
        });
      }
    });

    return { categories, seriesMap };
  }

  /**
   * Build line series configuration
   * @param {string} seriesName - Name of the series
   * @param {Array} data - Series data
   * @param {object} config - Configuration
   * @returns {object}
   */
  buildLineSeries(seriesName, data, config) {
    const seriesConfig = {
      name: seriesName,
      type: "line",
      smooth: config.smooth !== false,
      symbol: config.showPoints !== false ? "circle" : "none",
      symbolSize: config.symbolSize || 8,
      lineStyle: {
        width: config.lineWidth || 3,
      },
      data: data,
    };

    // Add area style if enabled
    if (config.showArea) {
      seriesConfig.areaStyle = {
        opacity: 0.3,
      };
    }

    if (config.showLabel) {
      seriesConfig.label = {
        show: true,
        position: "top",
        color: "#666",
      };
    }

    return seriesConfig;
  }
}

// Export factory function for ChartRegistry
module.exports = function (data, config = {}) {
  const transformer = new LineTransformer(config);
  return transformer.transform(data);
};

// Also export the class for direct use
module.exports.LineTransformer = LineTransformer;
