# 开发与扩展

## 本地开发测试

如果你想修改插件或贡献代码，可以按以下步骤在本地 Hexo 环境中进行测试：

### 1. 准备插件源码

确保你在 `hexo-next-charts` 目录中。

安装所有依赖（包括 devDependencies）：

```bash
# 使用 npm
npm install

# 或使用 pnpm
pnpm install
```

### 2. 运行 CI 检查

提交代码前，请务必运行以下命令确保通过 CI 检查：

```bash
# 运行 ESLint 代码检查
npm run lint
# 或
pnpm lint

# 运行自动化测试
npm test
# 或
pnpm test

# 运行逻辑验证脚本
node tests/verify.js
```

### 3. 链接到 Hexo 项目

在你的 **Hexo 博客根目录**中，使用 `npm link` 挂载本地开发的插件：

```bash
# 在 hexo-next-charts 目录运行
npm link
# 或
pnpm link

# 进入你的 Hexo 博客根目录运行
npm link hexo-next-charts
# 或
pnpm link hexo-next-charts
```

### 4. 配置测试数据

在 Hexo 的一篇文章中添加点测试数据：

```yaml
---
title: Chart Test
layout: post
my_chart_data:
  - { label: "A", value: 50 }
  - { label: "B", value: 80 }
---
{% echart radar my_chart_data %}
```

### 5. 运行 Hexo

```bash
hexo clean && hexo s
```

打开浏览器访问 `http://localhost:4000` 查看效果。

### 6. 运行内置验证脚本

本仓库提供了一个简单的脚本来验证核心逻辑（数据解析、标签渲染、注入逻辑）：

```bash
node verify.js
```

---

## 扩展图表类型

你可以通过在 `lib/charts/` 目录下添加新的 JS 文件来扩展图表类型。插件使用 **ChartRegistry** 自动扫描并注册图表转换器。

### 快速创建新图表类型

继承 `BaseTransformer` 基类，实现三个核心方法：

```javascript
// lib/charts/my_chart.js
const BaseTransformer = require('./base');

class MyChartTransformer extends BaseTransformer {
    /**
     * 返回默认配置
     */
    getDefaultConfig() {
        return {
            backgroundColor: 'transparent',
            // ... 其他默认配置
        };
    }

    /**
     * 验证输入数据
     */
    validate(data) {
        if (!Array.isArray(data)) {
            return { valid: false, error: 'Data must be an array' };
        }
        return { valid: true };
    }

    /**
     * 转换数据为 ECharts Option
     */
    transform(data) {
        const config = this.mergeConfig(this.config);

        // 构建 ECharts Option
        const option = {
            series: [{
                type: 'line', // 或其他图表类型
                data: data
            }]
        };

        // 允许用户通过 option 参数覆盖任意配置
        return this.merger.merge(option, config.option || {});
    }
}

// 导出工厂函数（必需，用于 ChartRegistry 自动加载）
module.exports = function(data, config = {}) {
    return new MyChartTransformer(config).transform(data);
};

// 可选：导出类以便直接实例化
module.exports.MyChartTransformer = MyChartTransformer;
```

### 特性说明

1. **自动注册**：将文件放入 `lib/charts/` 目录即可自动加载，无需修改其他代码
2. **配置合并**：用户可通过 `option:{...}` 参数覆盖任意 ECharts 配置
3. **验证支持**：在 `validate()` 中实现数据校验，失败时会输出友好错误信息
4. **工具方法**：基类提供 `buildTitle()`, `buildTooltip()`, `buildToolbox()` 等便捷方法

### 使用示例

创建文件后，立即可以在 Markdown 中使用：

```markdown
{% echart my_chart my_data title:"我的图表" option:{color:['#ff5722']} %}
```
