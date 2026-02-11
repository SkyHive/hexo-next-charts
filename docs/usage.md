# 使用指南

## 基础语法

```markdown
{% echart [type] [data_source] [options] %}
```

- **type**: 图表类型（支持 `radar`, `map`, `tree`, `line`, `bar`, `pie`）。
- **data_source**: 数据路径（对应 Front-matter 里的 key）。
- **options**: (可选) 键值对参数，如 `title:"标题"` `height:500px` `map:china`。

---

## 图表示例

### 1. 雷达图 (Radar)

**Front-matter:**

```yaml
skills:
  - { label: "Javascript", value: 90 }
  - { label: "Python", value: 85 }
  - { label: "K8s", value: 70 }
```

**Markdown:**

```markdown
{% echart radar skills title:"我的技能" %}
```

---

### 2. 足迹图 (Map)

**Front-matter:**

```yaml
travels:
  - "Shanghai" # 自动获取坐标
  - "张掖" # 中文名自动支持
  - "London" # 英文名自动支持
  - { code: "MY PEN", label: "槟城", effect: true } # 混合对象写法
```

**Markdown:**

```markdown
{% echart map travels title:"我的足迹" map:china %}
```

**地图类型说明**：

- `map:world` - 世界地图（主要显示国家边界）
- `map:china` - 中国地图（高精度，基于阿里云 DataV 数据）
- `map:world-cn` - **世界 + 中国**（推荐，在世界地图基础上合并了中国详细省界）

**数据格式支持**：

1. **城市名称（推荐）**：直接使用中文或英文名称，插件会自动查询坐标。
   - 示例：`"上海"`, `"张掖"`, `"London"`, `"New York"`
2. **标准代码**：支持 UN/LOCODE 或 IATA 机场代码。
   - 示例：`"CN SHA"`, `"PVG"`, `"LAX"`
3. **高级对象**：自定义标签或高亮效果。
   - 示例：`{ name: "Beijing", label: "首都", effect: true }`

---

### 3. 技能树 (Tree)

**Front-matter:**

```yaml
skills_tree:
  name: "编程语言"
  children:
    - name: "前端"
      children: [{ name: "Vue" }, { name: "React" }]
    - name: "后端"
      children: [{ name: "Python" }, { name: "Go" }]
```

**Markdown:**

```markdown
{% echart tree skills_tree title:"技能树" %}
```

---

### 4. 折线图 (Line)

**Front-matter:**

```yaml
monthly_visits:
  - { label: "1月", value: 1200 }
  - { label: "2月", value: 1500 }
  - { label: "3月", value: 1800 }
  - { label: "4月", value: 2200 }
  - { label: "5月", value: 2800 }
  - { label: "6月", value: 3500 }
```

**Markdown:**

```markdown
{% echart line monthly_visits title:"博客月访问量" smooth:true showArea:true %}
```

---

### 5. 柱状图 (Bar)

**Front-matter:**

```yaml
framework_stats:
  - { label: "React", value: 45 }
  - { label: "Vue", value: 38 }
  - { label: "Angular", value: 22 }
  - { label: "Svelte", value: 15 }
```

**Markdown:**

```markdown
{% echart bar framework_stats title:"前端框架使用统计" horizontal:false %}
```

---

### 6. 饼图 (Pie)

**Front-matter:**

```yaml
expense_breakdown:
  - { name: "交通", value: 3500, color: "#5470c6" }
  - { name: "住宿", value: 2400, color: "#91cc75" }
  - { name: "餐饮", value: 1800, color: "#fac858" }
  - { name: "门票", value: 800, color: "#ee6666" }
  - { name: "购物", value: 1200, color: "#73c0de" }
```

**Markdown:**

```markdown
{% echart pie expense_breakdown title:"旅行费用构成" %}
```

**饼图变体**：

- 普通饼图：`radius: ["0%", "70%"]`
- 甜甜圈图：`radius: ["40%", "70%"]`（默认）
- 玫瑰图：`roseType:"radius"`
- 南丁格尔图：`roseType:"area"`

---

## 配置选项

### 基础配置

在 Hexo 项目的 `_config.yml` 中配置：

```yaml
next_charts:
  amap_key: your_amap_key_here # 可选，用于更准确的国内城市定位
```

### ECharts 版本配置

插件已默认使用 ECharts v6.0.0。

```yaml
next_charts:
  amap_key: your_amap_key_here
  echarts:
    # 自定义 ECharts CDN 地址
    cdn: https://cdn.jsdelivr.net/npm/echarts@6.0.0/dist/echarts.min.js
    # 自定义地图 CDN 回退地址
    map_cdn:
      world: https://cdn.jsdelivr.net/npm/echarts/map/js/world.js
      china: https://cdn.jsdelivr.net/npm/echarts/map/js/china.js
```

**使用其他 CDN：**

```yaml
next_charts:
  echarts:
    cdn: https://unpkg.com/echarts@6.0.0/dist/echarts.min.js
    # 或
    cdn: https://cdnjs.cloudflare.com/ajax/libs/echarts/6.0.0/echarts.min.js
```
