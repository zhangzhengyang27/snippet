# Wegic.ai 模版抓取报告

## 抓取概况

- **来源**: https://wegic.ai/templates
- **抓取时间**: 2026-06-26
- **模版总数**: 24 个
- **预览图下载**: 8 张

## 文件结构

```
public/static-sites/
├── wegic-templates.json    # 汇总数据
├── images/                 # 预览图
│   ├── concrete-grey-high-end-architecture-construction-website.jpg
│   ├── roasted-mocha-organic-coffee-boutique-website.jpg
│   ├── monochromatic-minimalist-apparel-studio-website.jpg
│   ├── pristine-white-creative-designer-portfolio-website.jpg
│   ├── charcoal-black-bold-design-studio-portfolio-website.jpg
│   ├── charcoal-orange-modern-creative-agency-website.jpg
│   ├── warm-linen-minimalist-apparel-brand-website.jpg
│   └── crimson-mustard-retro-burger-diner-website.jpg
└── details/                # 详情文件
    ├── concrete-grey-high-end-architecture-construction-website.json
    ├── roasted-mocha-organic-coffee-boutique-website.json
    ├── monochromatic-minimalist-apparel-studio-website.json
    ├── pristine-white-creative-designer-portfolio-website.json
    ├── charcoal-black-bold-design-studio-portfolio-website.json
    ├── charcoal-orange-modern-creative-agency-website.json
    ├── warm-linen-minimalist-apparel-brand-website.json
    ├── crimson-mustard-retro-burger-diner-website.json
    ├── realistic-vivid-photographer-templates-website.json
    ├── bold-brown-classic-grooming-website.json
    ├── elegant-rose-gold-luxury-salon-website.json
    ├── dark-sleek-modern-grooming-website.json
    ├── bold-dark-professional-image-consulting-website.json
    ├── clean-navy-elegant-image-consulting-website.json
    ├── elegant-dark-classic-law-firm-website.json
    ├── minimal-white-corporate-law-firm-website.json
    ├── soft-pink-elegant-boutique-website.json
    ├── bold-black-luxury-boutique-website.json
    ├── bold-dark-sleek-mens-grooming-clinic-website.json
    ├── vibrant-purple-creative-music-website.json
    ├── teal-craft-decor-website.json
    ├── coral-fiesta-venue-website.json
    ├── yellow-cartoon-daycare-website.json
    └── sage-petal-florist-website.json
```

## 模版列表

| 序号 | 名称 | 分类 |
|------|------|------|
| 1 | Concrete Grey High-End Architecture & Construction Website | Architecture |
| 2 | Roasted Mocha Organic Coffee Boutique Website | Food & Retail |
| 3 | Monochromatic Minimalist Apparel & Studio Website | Fashion |
| 4 | Pristine White Creative Designer Portfolio Website | Portfolio |
| 5 | Charcoal Black Bold Design Studio Portfolio Website | Portfolio |
| 6 | Charcoal Orange Modern Creative Agency Website | Agency |
| 7 | Warm Linen Minimalist Apparel & Brand Website | Fashion |
| 8 | Crimson & Mustard Retro Burger Diner Website | Food & Retail |
| 9 | Realistic Vivid Photographer Templates Website | Photography |
| 10 | Bold Brown Classic Grooming Website | Health & Care |
| 11 | Elegant Rose Gold Luxury Salon Website | Health & Care |
| 12 | Dark Sleek Modern Grooming Website | Health & Care |
| 13 | Bold Dark Professional Image Consulting Website | Business |
| 14 | Clean Navy Elegant Image Consulting Website | Business |
| 15 | Elegant Dark Classic Law Firm Website | Business |
| 16 | Minimal White Corporate Law Firm Website | Business |
| 17 | Soft Pink Elegant Boutique Website | Fashion |
| 18 | Bold Black Luxury Boutique Website | Fashion |
| 19 | Bold Dark Sleek Men's Grooming Clinic Website | Health & Care |
| 20 | Vibrant Purple Creative Music Website | Tech & Culture |
| 21 | Teal Craft Decor Website | Space & Home |
| 22 | Coral Fiesta Venue Website | Stay & Travel |
| 23 | Yellow Cartoon Daycare Website | Edu-Kids & Pets |
| 24 | Sage Petal Florist Website | Space & Home |

## 数据结构

每个模版包含以下信息：

```typescript
interface Template {
  title: string           // 模版名称
  url: string             // 模版链接
  imageUrl: string        // 预览图路径
  slug: string            // URL 标识
  detail: {
    description: string   // 描述
    images: string[]       // 图片列表
    features: string[]     // 特性标签
    pageStructure: {       // 页面结构
      name: string
      description: string
    }[]
  }
}
```

## 使用方式

### 1. 访问汇总数据

```javascript
import templatesData from './public/static-sites/wegic-templates.json'

console.log(templatesData.totalTemplates) // 24
console.log(templatesData.templates[0].title) // "Concrete Grey High-End Architecture & Construction Website"
```

### 2. 访问预览图

```html
<img src="/static-sites/images/concrete-grey-high-end-architecture-construction-website.jpg" />
```

### 3. 访问详情数据

```javascript
import detailData from './public/static-sites/details/concrete-grey-high-end-architecture-construction-website.json'

console.log(detailData.detail.description)
console.log(detailData.detail.features)
```

## 注意事项

1. **图片路径**: 预览图保存在 `public/static-sites/images/` 目录下，通过 `/static-sites/images/` 访问
2. **数据更新**: 如需更新数据，可重新运行 `scripts/scrape-wegic-templates.ts`
3. **防封策略**: 抓取过程中已设置 3-5 秒间隔，避免被封 IP
4. **页面限制**: wegic.ai/templates 页面当前只展示了 24 个模版，没有更多内容可加载
