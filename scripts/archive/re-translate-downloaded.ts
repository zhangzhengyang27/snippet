/**
 * Re-translate newly downloaded Wegic templates (32-102).
 * Run this AFTER download-blank-wegic batches complete.
 */
import fs from 'fs/promises'
import path from 'path'

const WEGIC_DIR = '/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic'

// Reuse the same translations from the Python script
const TRANSLATIONS: Record<string, string> = {
  // ---- Template 32: Electric Bloom ----
  "Electric Bloom | Official Website | Cyberpunk Indie Pop":
    "Electric Bloom | 官方网站 | 赛博朋克独立流行",
  "Official website of Electric Bloom, a cyberpunk-influenced indie pop band fusing electronic beats with raw guitar energy. Listen to latest singles, view tour dates, and shop official merchandise.":
    "Electric Bloom 官方网站，一支受赛博朋克影响的独立流行乐队，融合电子节拍与原始吉他能量。收听最新单曲、查看巡演日程、选购官方周边。",
  "Electric Bloom, cyberpunk indie pop, electronic synthwave, raw guitar pop, Echoes Don't Lie, neon band, sci-fi music":
    "Electric Bloom、赛博朋克独立流行、电子合成波、原始吉他流行、Echoes Don't Lie、霓虹乐队、科幻音乐",
  // Note: brand names like "Electric Bloom" stay as-is

  // ---- Template 33: NexusBiz ----
  "NexusBiz | Modern Solutions for Small Businesses":
    "NexusBiz | 中小企业现代解决方案",
  "NexusBiz provides modern web design, digital marketing, and SEO solutions tailored for small businesses to grow and succeed online.":
    "NexusBiz 为中小企业提供量身定制的现代网页设计、数字营销与 SEO 解决方案，助力在线成长与成功。",
  "small business, web design, digital marketing, SEO, modern website, business growth":
    "中小企业、网页设计、数字营销、SEO、现代网站、业务增长",

  // ---- Template 34: Alex.dev ----
  "Alex.dev | Creative Developer & Designer": "Alex.dev | 创意开发者与设计师",
  "Portfolio of Alex, a multidisciplinary developer and designer specializing in high-performance, accessible, and visually stunning digital products.":
    "Alex 的作品集，一位多学科开发者与设计师，专注于打造高性能、无障碍且视觉惊艳的数字产品。",
  "Creative Developer, UI/UX Designer, React, Framer Motion, Portfolio, Web Development":
    "创意开发者、UI/UX 设计师、React、Framer Motion、作品集、网页开发",

  // ---- Template 35: Lumina Monochrome ----
  "Lumina | Monochrome Modern Photography Gallery": "Lumina | 黑白现代摄影画廊",
  "Lumina is a modern monochrome photography gallery showcasing fine art, architectural, and portrait photography by an award-winning artist.":
    "Lumina 是现代黑白摄影画廊，展出获奖艺术家的艺术摄影、建筑摄影与人像摄影作品。",
  "monochrome photography, black and white photography, fine art photography, modern gallery, architectural photography, portrait photography":
    "黑白摄影、黑白影像、艺术摄影、现代画廊、建筑摄影、人像摄影",
  "Lumina is a modern monochrome photography gallery showcasing fine art, architectural, and portrait photography.":
    "Lumina 是现代黑白摄影画廊，展出艺术摄影、建筑摄影与人像作品。",

  // ---- Template 36: Emma & James Lavender ----
  "Emma & James | Romantic Lavender Wedding": "Emma 与 James | 浪漫薰衣草婚礼",
  "Join us in celebrating the wedding of Emma and James in Provence, France. September 12, 2026.":
    "诚邀您参加 Emma 与 James 于法国普罗旺斯举行的婚礼。2026 年 9 月 12 日。",
  "wedding, emma and james, provence wedding, lavender wedding":
    "婚礼、Emma 与 James、普罗旺斯婚礼、薰衣草婚礼",

  // ---- Template 37: NexusCorp ----
  "NexusCorp | Modern Business Solutions": "NexusCorp | 现代企业解决方案",
  "NexusCorp provides clean, simple, and effective business strategies to help your company scale, innovate, and succeed.":
    "NexusCorp 提供简洁高效的企业战略，助力您的公司实现规模化、创新突破与长足发展。",
  "business consulting, digital transformation, data analytics, cloud solutions, corporate strategy":
    "企业咨询、数字化转型、数据分析、云解决方案、企业战略",

  // ---- Template 38: Emma & James Pink ----
  "Emma & James | Elegant Pink Wedding": "Emma 与 James | 优雅粉色婚礼",
  "Join us to celebrate the wedding of Emma and James on September 15, 2026, at Château de Villette, France.":
    "诚邀您参加 Emma 与 James 于 2026 年 9 月 15 日在法国维莱特城堡举行的婚礼。",
  "wedding, emma and james, elegant wedding, pink wedding, chateau de villette":
    "婚礼、Emma 与 James、优雅婚礼、粉色婚礼、维莱特城堡",

  // ---- Template 39: Onyx ----
  "Onyx | Bold Geometric Digital Agency": "Onyx | 大胆几何数字机构",
  "Onyx is a bold, geometric digital agency crafting high-end experiences for forward-thinking brands.":
    "Onyx 是一家大胆几何风格的数字机构，为前瞻性品牌打造高端体验。",
  "digital agency, web design, branding, framer, geometric design, bold typography":
    "数字机构、网页设计、品牌塑造、Framer、几何设计、大胆排版",

  // ---- Template 40: Eleanor & James ----
  "Eleanor & James | Wedding Invitation": "Eleanor 与 James | 婚礼邀请函",
  "Join us in celebrating the wedding of Eleanor and James on September 15, 2026 at Lake Como, Italy.":
    "诚邀您参加 Eleanor 与 James 于 2026 年 9 月 15 日在意大利科莫湖举行的婚礼。",

  // ---- Template 41: Lumina Photography (variant) ----
  "Lumina Photography | Fine Art & Editorial Photographer":
    "Lumina Photography | 艺术与商业摄影",
  "Lumina Photography | Fine Art &amp; Editorial Photographer":
    "Lumina Photography | 艺术与商业摄影",

  // ---- Template 42: NexusCorp Strategic ----
  "NexusCorp | Strategic Business Consulting & Solutions":
    "NexusCorp | 战略企业咨询与解决方案",
  "NexusCorp provides strategic consulting, digital transformation, and innovative solutions to help forward-thinking companies achieve sustainable growth.":
    "NexusCorp 提供战略咨询、数字化转型与创新解决方案，助力前瞻性企业实现可持续增长。",
  "business consulting, digital transformation, corporate strategy, data analytics, cloud solutions":
    "企业咨询、数字化转型、企业战略、数据分析、云解决方案",
  "Transforming businesses globally with strategic consulting and digital solutions.":
    "以战略咨询与数字解决方案推动全球企业转型。",

  // ---- Template 43: AURA E-Commerce ----
  "AURA | Modern E-Commerce Template": "AURA | 现代电商模版",
  "A premium, minimalist e-commerce template for modern brands.":
    "面向现代品牌的 premium 极简电商模版。",

  // ---- Template 44: BuildCore ----
  "BuildCore | Professional Construction & Contracting Services":
    "BuildCore | 专业建筑与承包服务",
  "BuildCore provides top-tier commercial and residential construction, remodeling, and civil engineering services. Building your vision with precision.":
    "BuildCore 提供顶级商业与住宅建造、翻新及土木工程服务。以精准工艺筑就您的愿景。",
  "construction, contractor, building, commercial construction, residential construction, remodeling, civil engineering":
    "建筑施工、承包商、建筑、商业建筑、住宅建造、翻新、土木工程",
  "Top-tier commercial and residential construction services. Building your vision with precision.":
    "顶级商业与住宅建筑服务。以精准工艺筑就您的愿景。",

  // ---- Template 45: Proxima ----
  "Proxima - Professional Business Website Template": "Proxima - 专业企业网站模版",
  "Proxima is a modern, professional website template for businesses, agencies, and SaaS companies.":
    "Proxima 是面向企业、机构及 SaaS 公司的现代专业网站模版。",
  "business template, corporate website, agency template, professional design, react template":
    "企业模版、公司网站、机构模版、专业设计、React 模版",

  // ---- Template 46: Lens & Light ----
  "Lens & Light | Professional Photography Portfolio": "Lens & Light | 专业摄影作品集",
  "Lens & Light is a premium photography studio specializing in editorial, fashion, portrait, and wedding photography. Based in New York, available worldwide.":
    "Lens & Light 是 premium 摄影工作室，专注于商业摄影、时尚摄影、人像摄影及婚礼摄影。立足纽约，服务全球。",
  "photography, portfolio, fashion photography, portrait photography, wedding photography, editorial, new york photographer":
    "摄影、作品集、时尚摄影、人像摄影、婚礼摄影、商业摄影、纽约摄影师",
  "Premium photography studio specializing in editorial, fashion, portrait, and wedding photography.":
    "高端摄影工作室，专注于商业摄影、时尚摄影、人像摄影及婚礼摄影。",

  // ---- Template 47: James Hartwell ----
  "James Hartwell | Austin Real Estate Advisor & Expert Agent":
    "James Hartwell | 奥斯汀房产顾问与资深经纪人",
  "Discover premium Austin real estate services with James Hartwell. 12+ years of local expertise, 127+ homes sold, and a 4.9-star rating. Buy or sell your Austin home with a trusted neighborhood authority.":
    "与 James Hartwell 一同探索奥斯汀 premium 房产服务。12 年以上本地经验、127 套以上房屋成交、4.9 星好评。与值得信赖的社区专家一起买卖您的奥斯汀房产。",
  "James Hartwell, Austin real estate, Austin real estate agent, West Lake Hills real estate, Austin homes for sale, Tarrytown real estate, Austin luxury homes, sell home Austin":
    "James Hartwell、奥斯汀房产、奥斯汀房产经纪人、West Lake Hills 房产、奥斯汀在售房屋、Tarrytown 房产、奥斯汀豪宅、出售奥斯汀房屋",
  "Partner with Austin's top-producing agent. 12+ years of local market expertise, 127+ homes sold, and unparalleled client satisfaction.":
    "与奥斯汀顶级经纪人合作。12 年以上本地市场经验、127 套以上房屋成交、无与伦比的客户满意度。",

  // ---- Template 48: Alex Rivera ----
  "Alex Rivera | Content Strategist &amp; Copywriter Portfolio":
    "Alex Rivera | 内容策略师与文案作品集",
  "Alex Rivera | Content Strategist & Copywriter Portfolio":
    "Alex Rivera | 内容策略师与文案作品集",
  "Freelance content strategist &amp; copywriter helping brands grow with strategic content, social media, and conversion-focused copywriting. Connect via WhatsApp today.":
    "自由职业内容策略师与文案写手，以策略内容、社交媒体及转化导向文案助力品牌增长。立即通过 WhatsApp 联系。",
  "Freelance content strategist & copywriter helping brands grow with strategic content, social media, and conversion-focused copywriting. Connect via WhatsApp today.":
    "自由职业内容策略师与文案写手，以策略内容、社交媒体及转化导向文案助力品牌增长。立即通过 WhatsApp 联系。",
  "Alex Rivera, Freelance Copywriter, Content Strategist, Social Media Manager, Portfolio, Content Marketing, WhatsApp Contact":
    "Alex Rivera、自由文案写手、内容策略师、社交媒体经理、作品集、内容营销、WhatsApp 联系",

  // ---- Template 49: Maya Chen ----
  "Maya Chen | Operations &amp; Strategy Leader | San Francisco":
    "Maya Chen | 运营与战略负责人 | 旧金山",
  "Maya Chen | Operations & Strategy Leader | San Francisco":
    "Maya Chen | 运营与战略负责人 | 旧金山",
  "Portfolio of Maya Chen, an experienced Operations &amp; Strategy Leader based in San Francisco. Dynamic visual resume showcasing 6 years of driving high-impact systems, operational excellence, and data-driven growth.":
    "Maya Chen 的作品集，一位常驻旧金山的资深运营与战略负责人。动态视觉简历，展示 6 年来推动高影响力系统、卓越运营与数据驱动增长的成果。",
  "Portfolio of Maya Chen, an experienced Operations & Strategy Leader based in San Francisco. Dynamic visual resume showcasing 6 years of driving high-impact systems, operational excellence, and data-driven growth.":
    "Maya Chen 的作品集，一位常驻旧金山的资深运营与战略负责人。动态视觉简历，展示 6 年来推动高影响力系统、卓越运营与数据驱动增长的成果。",
  "Maya Chen, Operations Strategy, Operations Leader San Francisco, Business Operations, Strategy and Operations, Program Manager, Operations Portfolio":
    "Maya Chen、运营战略、旧金山运营负责人、业务运营、战略与运营、项目经理、运营作品集",

  // ---- Template 50: Nora Vane ----
  "Nora Vane \u2014 Freelance Writer, Essayist & Brand Storyteller":
    "Nora Vane — 自由撰稿人、随笔作家与品牌故事讲述者",
  "Nora Vane is a New York City-based freelance writer, essayist, and brand storyteller. Specializing in personal essays, brand copywriting, and cultural criticism.":
    "Nora Vane 是常驻纽约市的自由撰稿人、随笔作家与品牌故事讲述者。擅长个人随笔、品牌文案及文化评论。",
  "Nora Vane, freelance writer, essayist, brand storyteller, copywriter, New York, creative consulting, ghostwriting":
    "Nora Vane、自由撰稿人、随笔作家、品牌故事讲述者、文案写手、纽约、创意咨询、代笔写作",
  "Nora Vane is a New York City-based freelance writer and essayist specializing in brand storytelling, personal essays, and cultural criticism.":
    "Nora Vane 是常驻纽约市的自由撰稿人与随笔作家，擅长品牌故事讲述、个人随笔及文化评论。",

  // ---- Template 51: Radiant Smile ----
  "Radiant Smile Studio | Dr. Emily Carter | Boutique Cosmetic Dentist":
    "Radiant Smile Studio | Emily Carter 医生 | 精品美容牙科",
  "Welcome to Radiant Smile Studio, a boutique cosmetic dental clinic run by Dr. Emily Carter. Specializing in porcelain veneers, teeth whitening, Invisalign, and full smile makeovers in a warm, anxiety-free, spa-like environment.":
    "欢迎来到 Radiant Smile Studio，由 Emily Carter 医生主理的精品美容牙科诊所。在温馨、无焦虑的水疗式环境中，专注于瓷贴面、牙齿美白、Invisalign 隐形矫正及全方位微笑改造。",
  "cosmetic dentist, boutique dental clinic, porcelain veneers, teeth whitening, Invisalign, Dr. Emily Carter, dental bonding, smile makeover, luxury dental, anxiety-free dentistry":
    "美容牙科、精品牙科诊所、瓷贴面、牙齿美白、Invisalign 隐形矫正、Emily Carter 医生、牙齿粘接、微笑改造、奢华牙科、无焦虑牙科",
  "Dr. Emily Carter, DDS": "Emily Carter 医生 (DDS)",
  "Transform your smile with Dr. Emily Carter at Radiant Smile Studio. Enjoy world-class cosmetic dental treatments in a warm, spa-like clinic designed to soothe anxiety.":
    "在 Radiant Smile Studio 与 Emily Carter 医生一同焕新您的微笑。在旨在舒缓焦虑的温馨水疗式诊所中，享受世界级美容牙科治疗。",

  // ---- Template 52: Warm Coral ----
  "Warm Coral | Luxury Travel & Tourism": "Warm Coral | 奢华旅行与旅游",
  "Experience the world's most breathtaking destinations with Warm Coral's curated luxury travel packages. Your dream vacation awaits.":
    "以 Warm Coral 精心策划的奢华旅行套餐，体验全球最令人叹为观止的目的地。您的梦幻假期正待启程。",
  "luxury travel, tourism, vacation packages, warm coral, tropical destinations, travel agency":
    "奢华旅行、旅游、度假套餐、Warm Coral、热带目的地、旅行社",
  "Experience the world's most breathtaking destinations with Warm Coral's curated luxury travel packages.":
    "以 Warm Coral 精心策划的奢华旅行套餐，体验全球最令人叹为观止的目的地。",

  // ---- Template 53: Serenity Spa ----
  "Serenity Spa & Wellness | Boutique Day Spa & Relaxation Sanctuary":
    "Serenity Spa & 康体中心 | 精品日间水疗与放松圣地",
  "Serenity Spa & Wellness is a warm, welcoming day spa offering personalized massage, facial, and body treatment experiences. Restore, Renew, Reconnect.":
    "Serenity Spa & 康体中心是一家温馨宜人的日间水疗，提供个性化按摩、面部护理及身体护理体验。修复、焕新、重连。",
  "day spa, serenity spa, wellness, massage, swedish massage, signature facial, botanical body wrap, relaxation, beauty treatment":
    "日间水疗、Serenity Spa、康体、按摩、瑞典式按摩、招牌面部护理、植物身体裹敷、放松、美容护理",
  "Serenity Spa & Wellness is a warm, welcoming day spa offering personalized massage, facial, and body treatment experiences.":
    "Serenity Spa & 康体中心是一家温馨宜人的日间水疗，提供个性化按摩、面部护理及身体护理体验。",

  // ---- Template 54: TradeCore ----
  "TradeCore | Global B2B E-commerce & Wholesale Sourcing Platform":
    "TradeCore | 全球 B2B 电商与批发采购平台",
  "TradeCore is the leading B2B e-commerce platform connecting buyers with verified global suppliers. Source industrial equipment, electronics, and wholesale goods securely.":
    "TradeCore 是领先的 B2B 电商平台，连接买家与全球认证供应商。安全采购工业设备、电子产品及批发商品。",
  "B2B e-commerce, wholesale sourcing, global trade, industrial equipment, bulk ordering, verified suppliers, procurement platform":
    "B2B 电商、批发采购、全球贸易、工业设备、批量订购、认证供应商、采购平台",
  "Source products globally with verified suppliers, secure payments, and wholesale pricing.":
    "全球采购产品，认证供应商、安全支付与批发价格。",

  // ---- Template 55: SparkleClean ----
  "SparkleClean | Professional Cleaning Services": "SparkleClean | 专业清洁服务",
  "Top-rated professional cleaning services for residential and commercial spaces. We make your space sparkle.":
    "备受好评的专业清洁服务，覆盖住宅与商业空间。让您的空间焕然一新。",

  // ---- Template 56: LUMIERE ----
  "LUMIERE | High-End Minimalist Fashion": "LUMIERE | 高端极简时装",
  "Discover LUMIERE's latest collection of minimalist, high-end fashion. Shop elegant clothing designed for the modern wardrobe.":
    "探索 LUMIERE 最新极简高端时装系列。选购为现代衣橱而设计的优雅服饰。",
  "fashion, minimalist clothing, high-end fashion, LUMIERE, modern wardrobe, elegant clothes":
    "时装、极简服装、高端时装、LUMIERE、现代衣橱、优雅服饰",

  // ---- Template 57: PeptiCore ----
  "PeptiCore | Advanced Peptide Technology": "PeptiCore | 先进肽技术",
  "PeptiCore engineers bio-active peptides for revolutionary applications in skincare, health optimization, and scientific research.":
    "PeptiCore 工程化生物活性肽，广泛应用于护肤、健康优化及科学研究的革命性领域。",
  "peptides, biotech, skincare, research, GHK-Cu, BPC-157": "肽、生物技术、护肤、科研、GHK-Cu、BPC-157",

  // ---- Template 58: Bootstrap ----
  "Bootstrap - The Ultimate Foundation for Your Next Big Idea":
    "Bootstrap - 您下一个宏伟创意的终极基础",
  "Bootstrap your startup in minutes, not days. Everything you need to build, scale, and launch your product with confidence.":
    "数分钟内启动您的创业项目，而非数日。构建、扩展与自信发布产品所需的一切。",
  "bootstrap, startup, template, react, tailwind, vite":
    "bootstrap、创业、模版、React、Tailwind、Vite",

  // ---- Template 59: Lumina Lifestyle ----
  "Lumina | Minimalist Lifestyle Essentials": "Lumina | 极简生活精选",
  "Discover our curated collection of minimalist essentials designed for the modern lifestyle. High-quality home goods and accessories.":
    "探索我们为现代生活方式精心甄选的极简生活必备品。高品质家居用品与配饰。",
  "ecommerce, minimalist, lifestyle, fashion, home goods, accessories":
    "电商、极简、生活方式、时尚、家居用品、配饰",

  // ---- Template 60: Aura Studio Art ----
  "Aura Studio | Contemporary Art Portfolio": "Aura Studio | 当代艺术作品集",
  "Explore the contemporary fine art portfolio of Aura Studio. Discover minimalist sculptures, abstract oil paintings, and mixed media artworks.":
    "探索 Aura Studio 的当代艺术作品集。发现极简雕塑、抽象油画与综合媒介艺术作品。",
  "art portfolio, contemporary art, minimalist sculpture, abstract painting, fine art, Aura Studio":
    "艺术作品集、当代艺术、极简雕塑、抽象绘画、艺术、Aura Studio",

  // ---- Template 61: Oblivion ----
  "Oblivion | Creative Advertising Agency": "Oblivion | 创意广告机构",
  "Oblivion is an independent creative agency building brands that refuse to be ignored. Strategy, design, and digital execution for the modern era.":
    "Oblivion 是一家独立创意机构，打造令人无法忽视的品牌。为现代时代提供策略、设计与数字执行。",
  "advertising agency, creative agency, brand strategy, digital design, marketing, campaigns":
    "广告机构、创意机构、品牌策略、数字设计、营销、广告活动",
  "Oblivion is an independent creative agency building brands that refuse to be ignored.":
    "Oblivion 是一家独立创意机构，打造令人无法忽视的品牌。",

  // ---- Template 62: ADULT. ----
  "ADULT. | Mastering the Art of Adulthood": "ADULT. | 精通成人生活艺术",
  "A premium editorial destination for modern living, sophisticated tastes, financial independence, and personal growth.":
    "面向现代生活、品味修养、财务独立与个人成长的 premium 编辑平台。",
  "adult, lifestyle, finance, career, modern living, sophisticated, magazine":
    "成人、生活方式、理财、职业、现代生活、精致、杂志",

  // ---- Template 63: Lumina Gallery ----
  "Lumina Gallery | Contemporary Art": "Lumina Gallery | 当代艺术",
  "Lumina is a contemporary art gallery dedicated to showcasing innovative and thought-provoking works by emerging and established artists worldwide.":
    "Lumina 是一家当代艺术画廊，致力于展示全球新锐与知名艺术家创新且发人深省的作品。",
  "art gallery, contemporary art, modern art, exhibitions, artists, paintings, sculptures":
    "艺术画廊、当代艺术、现代艺术、展览、艺术家、绘画、雕塑",
  "A contemporary art gallery dedicated to showcasing innovative and thought-provoking works.":
    "一家致力于展示创新且发人深省作品的当代艺术画廊。",

  // ---- Template 64: LinkForge ----
  "LinkForge | Premium Affiliate Marketing Network": "LinkForge | 高端联盟营销网络",
  "LinkForge is the premier affiliate marketing network connecting top-tier creators with high-converting brands. Scale your revenue with precision.":
    "LinkForge 是顶尖的联盟营销网络，连接顶级创作者与高转化品牌。精准扩大您的收入规模。",
  "affiliate marketing, affiliate network, CPA offers, RevShare, high-ticket affiliate programs, performance marketing":
    "联盟营销、联盟网络、CPA 推广、收入分成、高客单价联盟计划、效果营销",
  "Connect with top-tier brands and elite creators. LinkForge provides the infrastructure, tracking, and high-converting offers you need to dominate affiliate marketing.":
    "连接顶级品牌与精英创作者。LinkForge 提供您主导联盟营销所需的基础设施、追踪系统与高转化推广。",

  // ---- Template 65: Lumina 3D ----
  "Lumina 3D | Premier 3D Animation & VFX Studio": "Lumina 3D | 顶尖 3D 动画与视觉特效工作室",
  "Award-winning 3D animation studio specializing in high-end CGI, motion graphics, character design, and visual effects for forward-thinking brands.":
    "屡获殊荣的 3D 动画工作室，专注于为前瞻性品牌提供高端 CGI、动态图形、角色设计及视觉特效。",
  "3D animation, VFX, motion graphics, CGI, 3D modeling, rendering, studio":
    "3D 动画、视觉特效、动态图形、CGI、3D 建模、渲染、工作室",
  "Award-winning 3D animation studio specializing in high-end CGI, motion graphics, character design, and visual effects.":
    "屡获殊荣的 3D 动画工作室，专注于高端 CGI、动态图形、角色设计及视觉特效。",

  // ---- Template 66: Aegis Archives ----
  "Aegis Archives | Secure Document Storage & Digital Archiving":
    "Aegis Archives | 安全文档存储与数字归档",
  "Aegis Archives provides enterprise-grade physical document storage, digital archiving, and secure shredding services for organizations demanding absolute compliance.":
    "Aegis Archives 为有严格合规要求的组织提供企业级实体文档存储、数字归档及安全销毁服务。",
  "archive services, document storage, digital archiving, secure shredding, data preservation, compliance":
    "归档服务、文档存储、数字归档、安全销毁、数据保存、合规",
  "Enterprise-grade physical document storage, digital archiving, and secure shredding services.":
    "企业级实体文档存储、数字归档及安全销毁服务。",

  // ---- Template 67: Chronicle ----
  "Chronicle | Modern Design & Culture Blog": "Chronicle | 现代设计与文化博客",
  "A digital publication exploring design, technology, and the art of living well in the modern age.":
    "探索现代设计、科技与美好生活艺术的数字刊物。",
  "blog, design, technology, culture, minimalist, architecture":
    "博客、设计、科技、文化、极简、建筑",

  // ---- Template 69: Hygge & Haus ----
  "Hygge & Haus | Timeless Scandinavian & Japandi Furniture":
    "Hygge & Haus | 永恒斯堪的纳维亚与 Japandi 家具",
  "Discover handcrafted premium furniture inspired by Scandinavian simplicity and Japanese wabi-sabi. Elevate your home living with sustainable, timeless designs at Hygge & Haus.":
    "探索以斯堪的纳维亚简约与日式侘寂为灵感的精工 premium 家具。在 Hygge & Haus，以可持续的永恒设计提升您的家居生活。",
  "premium furniture, Japandi furniture, Scandinavian design, handcrafted wood furniture, sustainable home decor, luxury minimalist interiors, walnut sideboard, minimalist sofa":
    "高端家具、Japandi 家具、斯堪的纳维亚设计、手工木家具、可持续家居装饰、奢华极简室内、胡桃木边柜、极简沙发",
  "Discover handcrafted premium furniture inspired by Scandinavian simplicity and Japanese wabi-sabi. Sustainable, cozy, and timeless designs.":
    "探索以斯堪的纳维亚简约与日式侘寂为灵感的精工 premium 家具。可持续、舒适而永恒的设计。",

  // ---- Template 70: AffiliateBoost ----
  "AffiliateBoost | Build Profitable Affiliate Websites Faster":
    "AffiliateBoost | 更快打造盈利型联盟营销网站",
  "Launch high-converting, SEO-ready niche sites in minutes with premium WordPress templates designed for bloggers, marketers, and niche site owners.":
    "使用专为博主、营销人员及垂直网站所有者设计的 premium WordPress 模版，数分钟内发布高转化、SEO 就绪的垂直网站。",
  "affiliate marketing templates, wordpress affiliate, niche site builder, SEO themes":
    "联盟营销模版、WordPress 联盟、垂直网站构建器、SEO 主题",

  // ---- Template 72: CODOT. ----
  "CODOT. | The Premier Community for Visionary Creators":
    "CODOT. | 远见创作者首选社区",
  "A curated community platform designed for the world's most visionary creators. Connect, inspire, and grow in a structured yet organic digital sanctuary.":
    "专为全球最具远见的创作者打造的精选社区平台。在一个结构化而又自然有机的数字圣地中连接、启发与成长。",
  "Influencer community, creative network, creator platform, aesthetic moodboards, design community, Codot, brutalist design":
    "创作者社区、创意网络、创作者平台、审美情绪板、设计社区、Codot、粗野主义设计",

  // ---- Template 73: Coachify ----
  "Coachify | Build a 6-Figure Personal Brand in 90 Days":
    "Coachify | 90 天打造六位数个人品牌",
  "The proven 90-day system for digital experts, consultants, and coaches to attract premium clients without expensive agencies.":
    "为数字专家、顾问及教练打造的经过验证的 90 天系统，无需昂贵的代理机构即可吸引高端客户。",
  "personal branding, business coaching, digital consultant, high-ticket clients, coaching program, grow your business":
    "个人品牌、商业教练、数字顾问、高客单价客户、教练课程、业务增长",
  "The proven 90-day system for digital experts, consultants, and coaches to attract premium clients.":
    "为数字专家、顾问及教练打造的经过验证的 90 天系统，吸引高端客户。",

  // ---- Template 74: CT Executive Training ----
  "CT Executive Training | Corporate Leadership & Management":
    "CT 高管培训 | 企业领导力与管理",
  "Elevate your executive impact with our world-class corporate training programs. Master strategic management, advanced negotiation, and corporate leadership.":
    "以世界级企业培训课程提升您的高管影响力。掌握战略管理、高级谈判及企业领导力。",
  "executive training, corporate leadership, strategic management, corporate elite, advanced negotiation, business strategy":
    "高管培训、企业领导力、战略管理、企业精英、高级谈判、商业策略",
  "Elevate your executive impact with our world-class corporate training programs.":
    "以世界级企业培训课程提升您的高管影响力。",

  // ---- Template 76: WixBuilder ----
  "WixBuilder | Create a Website Without Limits": "WixBuilder | 无限制创建网站",
  "Build your dream website instantly with WixBuilder's drag-and-drop platform. No coding required. Perfect for beginners, freelancers, and small businesses.":
    "使用 WixBuilder 的拖拽式平台即刻打造您的梦想网站。无需编程，完美适用于初学者、自由职业者及中小企业。",
  "website builder, no-code, drag and drop, website templates, ecommerce, portfolio, create website":
    "网站构建器、无代码、拖拽式、网站模版、电商、作品集、创建网站",
  "Effortless creation, powerful results. Launch your vision today with our intuitive drag-and-drop editor.":
    "轻松创建，强大成果。使用我们直观的拖拽式编辑器，今日即发布您的愿景。",

  // ---- Template 77: Elara Studio ----
  "Elara Studio | Luxury Wedding Photography": "Elara Studio | 奢华婚礼摄影",
  "Capturing love, timelessly. A curated collection of intimate, cinematic, and emotional love stories by Elara Studio.":
    "永恒捕捉爱的瞬间。由 Elara Studio 呈现的精选亲密、电影感与深情爱情故事集。",
  "luxury wedding photography, editorial wedding photographer, fine art weddings, elopements, romantic photography":
    "奢华婚礼摄影、商业婚礼摄影师、艺术婚礼、私奔婚礼、浪漫摄影",

  // ---- Template 78: CUP CULT ----
  "CUP CULT | Your Obsession. Your Hydration.": "CUP CULT | 你的执念，你的补水。",
  "Shop the most obsessed-over tumblers, mugs, and water bottles. Join the cult for limited edition, vibrant, and unique drinkware. Stay Weird.":
    "选购最令人着迷的随行杯、马克杯与水壶。加入我们的狂热社区，获取限量版、活力四射的独特饮水器具。保持与众不同。",

  // ---- Template 79: AI Payroll ----
  "AI Payroll - Global Compensation Software for B2B Enterprises":
    "AI Payroll - B2B 企业全球薪酬软件",
  "Future-proof your payroll with our intelligent, automated global compensation software. Seamlessly run global payments, auto-compliance, and AI-driven workflow.":
    "以我们智能自动化的全球薪酬软件为您的薪酬体系保驾护航。无缝运行全球支付、自动合规及 AI 驱动工作流。",
  "AI Payroll, Global Compensation, SaaS, B2B Payroll, Automated Payroll, Compliance":
    "AI Payroll、全球薪酬、SaaS、B2B 薪酬、自动化薪酬、合规",
  "Intelligent, automated, and seamless global compensation for B2B enterprises.":
    "为 B2B 企业提供智能、自动化且无缝的全球薪酬方案。",

  // ---- Template 80: Slow Travel ----
  "The Slow Travel Manifesto - WanderFolio": "慢旅行宣言 - WanderFolio",
  "Why rushing through ten countries is killing your inspiration, and how to embrace mindful exploration instead. Read Kimmy's guide on slow travel.":
    "为什么匆匆穿越十个国家正在扼杀你的灵感，以及如何拥抱正念探索。阅读 Kimmy 的慢旅行指南。",
  "slow travel, digital nomad, remote work, study abroad, inspiration, travel blog":
    "慢旅行、数字游民、远程工作、海外留学、灵感、旅行博客",
  "Why rushing through ten countries is killing your inspiration, and how to embrace mindful exploration instead.":
    "为什么匆匆穿越十个国家正在扼杀你的灵感，以及如何拥抱正念探索。",

  // ---- Template 81: Urban Living ----
  "Urban Living | Premium Real Estate in Amsterdam": "Urban Living | 阿姆斯特丹高端房产",
  "Elevating urban living for first-time buyers, investors, and luxury seekers in Amsterdam with unmatched local expertise.":
    "以无可匹敌的本地专业经验，为阿姆斯特丹的首购者、投资者及奢华追求者提升都市生活品质。",
  "Amsterdam real estate, luxury apartments Amsterdam, investment property Amsterdam, buy home Amsterdam, Urban Living":
    "阿姆斯特丹房产、阿姆斯特丹豪华公寓、阿姆斯特丹投资房产、阿姆斯特丹购房、Urban Living",

  // ---- Template 83: Lex Advisors ----
  "Lex Advisors | General Practice Law Firm": "Lex Advisors | 综合律师事务所",
  "Lex Advisors is a premium general practice law firm providing expert counsel in corporate law, litigation, and real estate.":
    "Lex Advisors 是一家 premium 综合律师事务所，在公司法、诉讼及房地产领域提供专业法律顾问服务。",
  "law firm, legal advisors, corporate law, litigation, real estate law, experienced advocates":
    "律师事务所、法律顾问、公司法、诉讼、房地产法、资深律师",
  "Premium legal services tailored to your needs. Experienced advocates, trusted counsel.":
    "为您量身定制的 premium 法律服务。资深律师，可信顾问。",

  // ---- Template 85: 图虫 AI (already Chinese, keep as-is) ----

  // ---- Generic / metadata-only templates ----
  "Wegic": "Wegic",

  // Common descriptions for templates that share similar patterns
  "Creative Agency, Branding, Web Development, Digital Marketing, Portfolio, Graphic Design":
    "创意机构、品牌塑造、网页开发、数字营销、作品集、平面设计",
}

// Additional metadata translations (for keywords/descriptions that may appear in any template)
const COMMON_TRANSLATIONS: Record<string, string> = {
  "Website, Template, Business, Modern, Professional, Responsive, Creative":
    "网站、模版、企业、现代、专业、响应式、创意",
  "Create your professional website with this modern, customizable template":
    "用这个现代、可定制的模版打造您的专业网站",
  "Professional website template designed for modern businesses and creative professionals":
    "专为现代企业与创意专业人士设计的专业网站模版",
}

async function main() {
  const rangeStart = parseInt(process.argv[2]) || 32
  const rangeEnd = parseInt(process.argv[3]) || 102

  console.log(`\n🔄 Re-translating templates ${rangeStart}-${rangeEnd}\n`)

  let translated = 0

  for (let i = rangeStart; i <= rangeEnd; i++) {
    const filePath = path.join(WEGIC_DIR, String(i), 'index.html')

    try {
      let html = await fs.readFile(filePath, 'utf-8')

      // Skip if < 2000 chars (not downloaded yet)
      if (html.length < 2000) {
        console.log(`[#${i}] Too small (${html.length}B), skipping (not downloaded yet)`)
        continue
      }

      let changed = false

      // Apply translations
      for (const [en, zh] of Object.entries(TRANSLATIONS)) {
        if (html.includes(en) && en !== zh) {
          html = html.replace(new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), zh)
          changed = true
        }
      }

      // Apply common translations
      for (const [en, zh] of Object.entries(COMMON_TRANSLATIONS)) {
        if (html.includes(en)) {
          html = html.replace(new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), zh)
          changed = true
        }
      }

      // Change lang
      if (html.includes('lang="en"')) {
        html = html.replace(/lang="en"/g, 'lang="zh-CN"')
        changed = true
      }

      if (changed) {
        await fs.writeFile(filePath, html)
        translated++
        console.log(`[#${i}] ✓ Translated & saved (${Buffer.byteLength(html)}B)`)
      } else {
        console.log(`[#${i}] - No changes needed`)
      }
    } catch (error: unknown) {
      console.log(`[#${i}] - File not found`)
    }
  }

  console.log(`\n📊 Re-translated: ${translated} templates`)
}

main().catch(console.error)
