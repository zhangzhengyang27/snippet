#!/usr/bin/env python3
"""Final ALL-templates body translation - text-node safe."""
import re, os
WEGIC = "/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic"

def s(html, en, zh):
    p = rf'>([^<]*{re.escape(en)}[^<]*)<'
    m = re.search(p, html)
    return html.replace(m.group(0), f'>{zh}<') if m else html

ALL = {
31: {
"Artisanal Floral 设计":"手工花艺设计","优雅 in":"优雅于","Every Petal":"每片花瓣",
"A Symphony of Soft Hues":"柔和色调的交响",
"At Fleur &amp; Co., we believe in the quiet power of elegance. Specializing in soft pinks, creamy whites, and muted greens, our arrangements are designed to bri":"在 Fleur &amp; Co.，我们相信优雅的静默力量。专注于柔粉、奶白与哑绿色调，我们的花艺旨在为每个空间带来低调而精致的美。",
"精选 Bouquets":"精选花束","Blush Peony Dream":"腮红牡丹之梦","Elegant Dahlia Mix":"优雅大丽花混搭",
"Romantic Bridal Classic":"浪漫新娘经典","Bespoke 服务":"定制服务","婚礼s &amp; Events":"婚礼与活动",
"Transform your special day with our signature soft pink and elegant floral designs. From intimate gatherings to grand celebrations, we work closely with you to":"以我们招牌的柔粉优雅花艺设计点亮您的特别日子。从亲密聚会到盛大庆祝，我们与您紧密合作，打造与您愿景完美契合的花艺。",
'"The most beautiful arrangements I\'ve ever seen. The soft pink tones were exactly what I wanted for my anniversary."':'"我见过最美的花艺布置。柔粉色调正是我纪念日想要的。"',
"— Sarah Jenkins":"— Sarah Jenkins",
},
32: {
"ELECTRIC BLOOM":"ELECTRIC BLOOM","MUSIC":"音乐","MERCH":"周边","LISTEN NOW":"立即收听",
"ELECTRONIC HEART. GUITAR SOUL.":"电子之心。吉他之魂。","WE ARE":"我们是","ELECTRIC":"电动的","BLOOM":"绽放",
"Cyberpunk-influenced indie pop. Synthetic nights. Honest lyrics. Louder together. Fusing high-voltage guitar riffs with cosmic dancefloor beats.":"受赛博朋克影响的独立流行。合成之夜。真诚歌词。一起更响亮。融合高压吉他连复段与宇宙舞池节拍。",
"GET TICKETS":"购票","SPOTIFY":"Spotify","1.2M MONTHLY LISTENERS":"120万月收听","Shop Merch":"周边商店",
"Tour Dates":"巡演日程",
},
33: {
"Nexus":"Nexus","Log In":"登录","Empowering 中小企业es":"赋能中小企业","增长 your business with":"自信地","confidence":"增长您的业务",
"We provide the tools, strategies, and support you need to build your brand, reach more customers, and scale your small business in the digital age.":"我们提供您需要的工具、策略与支持，在数字时代打造品牌、触达更多客户并扩展您的中小企业。",
"开始 Your Journey":"开启您的旅程","No credit card required":"无需信用卡","14-day free trial":"14天免费试用",
"Everything you need to succeed online":"您在线成功所需的一切",
"Our comprehensive suite of services is designed specifically for the unique challenges and opportunities of small businesses.":"我们全面的服务体系专为中小企业的独特挑战与机遇而设计。",
"Get a stunning, mobile-responsive website that captures your brand's essence and converts visitors into customers.":"获得一个令人惊艳的移动响应式网站，捕捉您品牌的精髓，将访客转化为客户。",
"Reach your target audience effectively with targeted campaigns, SEO优化 optimization, and actionable analytics.":"通过精准广告系列、SEO优化和可执行的分析数据，有效触达您的目标受众。",
"Rest easy knowing your business data and customer information are protected with enterprise-grade security.":"放心无忧——您的业务数据和客户信息受到企业级安全保护。",
},
34: {
"SOPHIA":"SOPHIA","Creative 开发er &amp; 设计er":"创意开发者与设计师",
"构建ing digital":"构建有意义的","experiences that":"数字体验。","matter.":"",
"View 作品":"查看作品","联系我们 Me":"联系我",
"A collection of my recent projects, focusing on web development, UI/UX design, and interactive experiences.":"我近期项目的合集，聚焦网页开发、UI/UX 设计与交互体验。",
"A high-performance headless e-commerce platform built with 下一步.js and 商店ify.":"基于 Next.js 与 Shopify 构建的高性能无头电商平台。",
"UI/UX 设计 &amp; Dev":"UI/UX 设计与开发","Nexus 仪表盘":"Nexus 仪表盘",
"Analytics dashboard for SaaS platforms with real-time data visualization.":"面向 SaaS 平台的实时数据可视化分析仪表盘。",
"Creative 作品集":"创意作品集","Lumina Creative":"Lumina Creative",
},
35: {
"Lumina":"Lumina","Seeing in":"以","Monochrome":"黑白之眼观看",
"Capturing the essence of light, shadow, and form through the timeless medium of black and white photography.":"通过永恒的黑白摄影媒介，捕捉光影与形态的本质。",
"A curated collection of recent explorations in contrast and composition.":"近期对比度与构图探索的精选集。",
"Concrete Silence":"混凝土寂静","Urban Echoes":"城市回响","Noir 优雅":"黑色优雅","Abstract":"抽象","Geometric Shadows":"几何阴影",
"The Artist":"艺术家",
"I believe that stripping away color reveals the true soul of a subject. Without the distraction of hue, we are left with the raw elements of photography: light,":"我相信去除色彩能揭示主体的真实灵魂。没有色调的干扰，我们直面摄影的原始元素：光线、阴影、质感与形态。每张照片都成为一场纯粹的光影对话。",
"立足纽约, specializing in fine art, architectural, and portrait photography.":"立足纽约，专注于艺术摄影、建筑摄影与人像摄影。",
"Read Full Bio":"阅读完整介绍",
},
36: {
"&amp;":"&amp;","Emma &amp; James":"Emma 与 James","加入 us in celebrating our love":"与我们一起庆祝我们的爱",
"We are so excited to share this special day with our favorite people. Surrounded by the beautiful lavender fields of Provence, we will exchange our vows and beg":"我们非常兴奋能与最爱的人们分享这特别的一天。在普罗旺斯美丽薰衣草田的环绕中，我们将交换誓言，开启我们共同的下一个篇章。",
"敬请回复 Now":"立即回复",
"From a chance meeting at a coffee shop in Paris to a romantic proposal under the stars in Tuscany, our journey has been nothing short of magical. We can't wait":"从巴黎咖啡馆的偶遇到托斯卡纳星空下的浪漫求婚，我们的旅程充满魔力。我们迫不及待要与你们所有人一起庆祝下一篇章。",
"Read Full Story →":"阅读完整故事 →","September 12, 2026 • Provence, France":"2026年9月12日 • 法国普罗旺斯",
},
37: {
"NexusCorp":"NexusCorp","Empowering Your 企业 for the":"为您的企业赋能，迎接","Digital Future":"数字未来",
"We provide clean, simple, and effective strategies to help your company scale, innovate, and succeed in today's competitive landscape.":"我们提供简洁高效的战略，帮助您的公司在当今竞争激烈的环境中实现规模化、创新与成功。",
"为什么选择 NexusCorp":"为什么选择 NexusCorp",
"We combine industry expertise with cutting-edge technology to deliver solutions that drive real business value.":"我们结合行业专业知识与前沿技术，交付推动真实商业价值的解决方案。",
"Fast Execution":"快速执行","We deliver results quickly without compromising on quality or attention to detail.":"我们快速交付成果，不妥协品质或对细节的关注。",
"企业版-grade security protocols to keep your business data safe and protected.":"企业级安全协议，保护您的业务数据安全。",
"Strategic decisions backed by comprehensive analytics and market research.":"基于全面分析与市场研究的战略决策。",
"Expand your business across borders with our international market strategies.":"借助我们的国际市场战略，拓展您的跨境业务。",
"Ready to Transform Your 企业?":"准备好转型您的企业了吗？",
"加入 hundreds of companies that have successfully scaled their operations with our strategic solutions.":"加入数百家已通过我们的战略解决方案成功扩展运营的企业。",
},
38: {
"It all started with a chance encounter at a small coffee shop in the heart of the city. James spilled his espresso, Emma offered a napkin, and what followed was":"一切始于市中心一家小咖啡馆的偶遇。James 洒了浓缩咖啡，Emma 递上了一张纸巾，随后便是我们永远珍视的故事。",
"Five years later, through countless adventures, shared dreams, and endless laughter, we found ourselves back at that very same spot. Only this time, James had a":"五年后，经历了无数冒险、共同梦想和无尽欢笑，我们又回到了同一个地方。只不过这一次，James 口袋里装着一枚戒指，心里装着一生的问题。",
"We are so incredibly excited to celebrate this next chapter of our lives with the people who mean the most to us. Thank you for being part of our journey.":"我们无比激动地与对我们最重要的人一起庆祝人生的下一篇章。感谢你们成为我们旅程的一部分。",
"With love,":"充满爱意，",
"We can't wait to celebrate with you. Here is everything you need to know about our special day.":"我们迫不及待想与你们一起庆祝。以下是我们特别日子的所有详情。",
"September 15, 2026":"2026年9月15日","3:00 PM - 4:00 PM":"下午3:00 - 4:00","Château de Villette":"维莱特城堡",
"5:00 PM - Late":"下午5:00 - 深夜","The Grand Orangery":"大橘园","Kindly respond by August 1st, 2026":"请于2026年8月1日前回复",
},
39: {
"We 构建":"我们构建","Digital":"数字","Futures":"未来",
"A geometric-driven creative agency pushing the boundaries of web design, branding, and motion.":"一家以几何驱动的创意机构，突破网页设计、品牌塑造与动态设计的边界。",
"Bold Ideas":"大胆创意","Expertise":"专长",
"We combine strategic thinking with bold geometric aesthetics to deliver unparalleled digital solutions.":"我们将战略思维与大胆几何美学相结合，交付无与伦比的数字解决方案。",
"Digital 设计":"数字设计","Crafting immersive digital experiences that captivate and convert.":"打造引人入胜且能转化的沉浸式数字体验。",
"构建ing bold, memorable brands that stand out in the noise.":"打造大胆而难忘的品牌，在喧嚣中脱颖而出。",
"High-performance, cutting-edge websites built with modern tech.":"采用现代技术构建的高性能、前沿网站。",
},
40: {
"Eleanor &amp; James | 婚礼 Invitation":"Eleanor 与 James | 婚礼邀请函",
"SEPTEMBER 15, 2026":"2026年9月15日","LAKE COMO, ITALY":"意大利科莫湖",
"How We Met":"我们的相遇",
"It all started on a rainy evening in a small café in Paris. James was reading his favorite book, and Eleanor accidentally spilled her coffee on his table. What":"一切始于巴黎一个小咖啡馆的雨夜。James 正读着他最喜欢的书，Eleanor 不小心把咖啡洒在了他的桌上。本可能是尴尬的瞬间，却成了跨越两个灵魂的对话。",
"Five years, countless adventures, and one beautiful sunset proposal later, we are thrilled to invite you to celebrate the beginning of our forever.":"五年、无数冒险和一次美丽的日落求婚后，我们激动地邀请您来庆祝我们永恒的开始。",
"When &amp; Where":"时间与地点","4:00 PM":"下午4:00","周六, September 15, 2026":"周六, 2026年9月15日",
"Villa del Balbianello":"巴尔比亚内洛别墅","Via Guido Monzino, 1":"Guido Monzino 路1号",
"22016 Tremezzina CO, Italy":"22016 Tremezzina CO, 意大利","6:00 PM":"下午6:00","晚餐 &amp; Dancing to follow":"晚宴与舞会随后",
},
42: {
"Transforming 企业es Globally":"推动全球企业转型","Elevate your business to new heights.":"将您的业务提升到新高度。",
"We provide strategic consulting and innovative digital solutions to help forward-thinking companies navigate complex challenges and achieve sustainable growth.":"我们提供战略咨询与创新数字解决方案，帮助前瞻性企业应对复杂挑战，实现可持续增长。",
"为什么选择 NexusCorp":"为什么选择 NexusCorp",
"We combine industry expertise with cutting-edge technology to deliver exceptional results for our clients.":"我们结合行业专业知识与前沿技术，为客户交付卓越成果。",
"Operating across borders to bring international perspectives to local challenges.":"跨境运营，以国际视角应对本地挑战。",
"Agile Execution":"敏捷执行","Rapid deployment of strategies and solutions to keep you ahead of the curve.":"快速部署战略与解决方案，让您始终领先一步。",
"Risk Mitigation":"风险缓解","Comprehensive analysis to protect your assets and ensure compliance.":"全面分析，保护您的资产并确保合规。",
"Decisions backed by robust analytics and actionable intelligence.":"以强大分析与可执行洞察支撑的决策。",
"A legacy of excellence and innovation.":"卓越与创新的传承。",
"For over a decade, NexusCorp has been the trusted partner for enterprises seeking transformation. We don't just advise; we implement, measure, and optimize to e":"十多年来，NexusCorp 一直是寻求转型企业的可信伙伴。我们不仅提供建议，更实施、衡量并优化，确保每位客户都实现有意义的成果。",
"Award-winning consulting team":"获奖咨询团队",
},
43: {
"发现 our curated collection of minimalist essentials designed for modern living.":"探索我们为现代生活甄选的极简生活必备品。",
"The latest additions to our collection, featuring clean lines and premium materials.":"系列最新臻品，以简洁线条与高级材质呈现。",
"Modern Leather Tote":"现代皮革托特包","Classic Silver Watch":"经典银表","Matte Black Table Lamp":"哑光黑台灯",
'"设计 is not just what it looks like and feels like. 设计 is how it works."':'"设计不仅是外观与感觉。设计是它如何运作。"',
"At AURA, we believe in the power of simplicity. Every piece in our collection is carefully selected to bring harmony and function to your daily life.":"在 AURA，我们坚信简约的力量。系列中每件单品都精心挑选，为您日常生活带来和谐与功能。",
"Elevating everyday living through minimalist design and exceptional craftsmanship. 加入 our newsletter for updates and exclusive offers.":"以极简设计与卓越工艺提升日常生活。订阅我们的通讯获取最新资讯与独家优惠。",
"© 2026 AURA. 版权所有。":"© 2026 AURA. 版权所有。",
},
44: {
"构建Core | 专业 建筑施工 &amp; Contracting 服务":"BuildCore | 专业建筑施工与承包服务",
"BUILDCORE":"BUILDCORE","Industry Leaders":"行业领导者","BUILDING YOUR":"筑就您的","VISION":"愿景","WITH":"以","PRECISION":"精准",
"We deliver exceptional commercial and residential construction services, combining innovative engineering with uncompromising quality and safety standards.":"我们提供卓越的商业与住宅建筑服务，融合创新工程与不妥协的品质及安全标准。",
"View Our 项目":"查看项目","Expert Engineering":"专业工程","Precision planning and structural integrity in every project we undertake.":"每个项目中的精准规划与结构完整性。",
"Highly skilled architects, engineers, and builders dedicated to excellence.":"致力于卓越的高技能建筑师、工程师与建造师。",
"On-Time 外送":"准时交付","Strict adherence to timelines without compromising on quality or safety.":"严格遵循时间表，不妥协品质或安全。",
"Years of":"多年",
},
45: {
"专业版xima - 专业企业网站模版":"Proxima - 专业企业网站模版",
"专业版xima":"Proxima","ELEVATE YOUR BUSINESS":"提升您的业务","Modern Brands":"现代品牌",
"We build scalable, high-performance digital experiences that drive growth and establish your industry authority.":"我们构建可扩展、高性能的数字体验，推动增长并建立您的行业权威。",
"Why Choose 专业版xima":"为什么选择 Proxima",
"Our comprehensive suite of tools and services provides everything you need to scale your operations efficiently.":"我们全面的工具与服务套件，提供您高效扩展运营所需的一切。",
"Optimized performance that keeps your users engaged and improves conversion rates.":"优化性能，保持用户参与度并提高转化率。",
"Bank-grade security protocols to ensure your data and customer information is safe.":"银行级安全协议，确保您的数据和客户信息安全。",
"Infrastructure designed to scale globally with minimal latency and maximum uptime.":"专为全球扩展设计的基础设施，最小延迟与最大正常运行时间。",
"Deep insights into user behavior to help you make data-driven business decisions.":"深入了解用户行为，帮助您做出数据驱动的业务决策。",
"Transforming visions into digital reality":"将愿景转化为数字现实",
"Since 2015, 专业版xima has been at the forefront of digital innovation. We partner with forward-thinking companies to create products that not only look beautiful":"自2015年以来，Proxima 一直站在数字创新的前沿。我们与前瞻性企业合作，创造不仅外观精美而且性能卓越的产品。",
"Award-winning design team":"获奖设计团队","Agile development methodology":"敏捷开发方法论",
},
}

total = 0
for tid, trans in sorted(ALL.items()):
    path = os.path.join(WEGIC, str(tid), 'index.html')
    if not os.path.exists(path): continue
    with open(path, encoding='utf-8') as f: html = f.read()
    count = 0
    for en, zh in sorted(trans.items(), key=lambda x: len(x[0]), reverse=True):
        if en == zh: continue
        if en in html:
            n = s(html, en, zh)
            if n != html: html = n; count += 1
    if count:
        with open(path, 'w', encoding='utf-8') as f: f.write(html)
        total += count; print(f'  [#{tid}] {count}')
print(f'\nTotal: {total}')
