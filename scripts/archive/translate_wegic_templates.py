#!/usr/bin/env python3
"""
Translate all English Wegic template index.html files to Chinese (formal business style).
Preserves brand names, code, URLs, and technical terms.
"""

import re
import os
import json

WEGIC_DIR = "/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic"

# ============================================================
# Comprehensive translation dictionary
# Key = English text (from metadata), Value = Chinese translation
# ============================================================

TRANSLATIONS = {
    # ---- Generic / Default ----
    "Wegic": "Wegic",

    # ---- Template 2: MOCHAR Coffee ----
    "MOCHAR | Organic Coffee Roasters": "MOCHAR | 有机精品咖啡烘焙坊",
    # ---- Template 3: GRAIN & GRIT ----
    "GRAIN &amp; GRIT | Urban Streetwear": "GRAIN &amp; GRIT | 都市潮流街头服饰",
    # ---- Template 4: Design Studio ----
    "Design Studio | Creative Portfolio": "Design Studio | 创意设计作品集",
    "Personal Design Studio specializing in Brand Visuals, UI/UX, and Illustration.": "个人设计工作室，专注于品牌视觉、UI/UX 设计与插画创作。",
    # ---- Template 5: Numerous ----
    "Numerous® | Design Studio Portfolio": "Numerous® | 设计工作室作品集",
    "Numerous® is a digital design studio creating timeless brands and digital experiences. Portfolio of work in brand identity, UI/UX, and art direction.": "Numerous® 是一家数字设计工作室，致力于打造历久弥新的品牌与数字体验。涵盖品牌识别、UI/UX 及艺术指导等领域的作品集。",
    "Design Studio, Portfolio, Brand Identity, UI/UX, Web Design, Graphic Design, Creative Agency": "设计工作室、作品集、品牌识别、UI/UX、网页设计、平面设计、创意机构",
    "Numerous Design Studio": "Numerous 设计工作室",
    "Shaping brands and digital experiences through motion, clarity, and timeless craft.": "以动态、清晰与永恒匠心塑造品牌与数字体验。",
    # ---- Template 6: Lumina Photography ----
    "Lumina Photography | Fine Art &amp; Editorial Photographer": "Lumina Photography | 艺术与商业摄影",
    "Lumina Photography | Fine Art & Editorial Photographer": "Lumina Photography | 艺术与商业摄影",
    "Award-winning photography studio specializing in editorial, portrait, and fine art wedding photography. Based in New York, available worldwide.": "屡获殊荣的摄影工作室，专注于商业摄影、人像摄影及艺术婚礼摄影。立足纽约，服务全球。",
    "photographer, photography portfolio, wedding photographer, editorial photography, fine art photography, New York photographer": "摄影师、摄影作品集、婚礼摄影师、商业摄影、艺术摄影、纽约摄影师",
    "Lumina Photography": "Lumina Photography",
    "Award-winning photography studio specializing in editorial, portrait, and fine art wedding photography.": "屡获殊荣的摄影工作室，专注于商业摄影、人像摄影及艺术婚礼摄影。",
    # ---- Template 7: Bold Brown ----
    "Bold Brown | Classic Men's Grooming &amp; Barbershop": "Bold Brown | 经典男士理容与理发店",
    "Experience the timeless art of traditional barbering combined with premium grooming products designed for the modern gentleman.": "体验传统理发技艺与专为现代绅士打造的 premium 理容产品的完美融合。",
    "barbershop, men's grooming, beard oil, classic haircut, hot towel shave, bold brown": "理发店、男士理容、胡须油、经典剪发、热毛巾剃须、Bold Brown",
    "Bold Brown Grooming Co.": "Bold Brown 理容公司",
    "Bold Brown | Classic Men's Grooming": "Bold Brown | 经典男士理容",
    # ---- Template 8: Aura Salon ----
    "Aura | Elegant Rose Gold Luxury Salon": "Aura | 优雅玫瑰金奢华沙龙",
    "Experience the pinnacle of luxury beauty and wellness at Aura. Our rose gold sanctuary offers premium hair, beauty, and spa services tailored to your unique elegance.": "在 Aura 体验奢华美容与健康的巅峰。我们的玫瑰金殿堂提供专为您优雅气质量身打造的高端美发、美容与水疗服务。",
    "luxury salon, rose gold salon, hair styling, spa, wellness, beauty, nail couture, high-end salon": "奢华沙龙、玫瑰金沙龙、发型设计、水疗、健康养生、美容、美甲定制、高端沙龙",
    "Aura Luxury Salon": "Aura 奢华沙龙",
    # ---- Template 9: OBSIDIAN ----
    "OBSIDIAN | Premium Men's Grooming &amp; Barbershop": "OBSIDIAN | 高端男士理容与理发店",
    "OBSIDIAN is a premium men's grooming brand and barbershop offering precision cuts, hot towel shaves, and high-end grooming products.": "OBSIDIAN 是高端男士理容品牌与理发店，提供精剪造型、热毛巾剃须及高品位理容产品。",
    "barbershop, men's grooming, beard oil, haircut, hot towel shave, premium grooming": "理发店、男士理容、胡须油、剪发、热毛巾剃须、高端理容",
    "OBSIDIAN Grooming": "OBSIDIAN 理容",
    "OBSIDIAN | Premium Men's Grooming": "OBSIDIAN | 高端男士理容",
    "Experience the intersection of traditional craftsmanship and contemporary style.": "体验传统工艺与当代风格的完美交汇。",
    # ---- Template 10: AURA Consulting ----
    "AURA | Professional Image Consulting &amp; Executive Styling": "AURA | 专业形象咨询与高管形象设计",
    "Elevate your professional presence with AURA Image Consulting. We offer bespoke wardrobe curation, executive styling, and presence coaching for leaders.": "以 AURA 形象咨询提升您的职业气场。我们为领导者提供定制衣橱规划、高管造型设计及气场塑造指导。",
    "image consulting, executive styling, wardrobe curation, professional presence, personal branding": "形象咨询、高管造型、衣橱规划、职业气场、个人品牌塑造",
    "AURA Image Consulting": "AURA 形象咨询",
    "Aura Image Consulting": "Aura 形象咨询",
    # ---- Template 11: Aura Image Consulting ----
    "Aura | Elegant Image Consulting": "Aura | 优雅形象咨询",
    "Aura Image Consulting offers bespoke styling services, color analysis, and wardrobe audits to help you project confidence and timeless elegance.": "Aura 形象咨询提供定制造型服务、色彩分析与衣橱评估，助您展现自信与永恒的优雅气质。",
    "image consulting, personal styling, color analysis, wardrobe audit, personal shopper, elegant style, professional image": "形象咨询、个人造型、色彩分析、衣橱评估、私人购物顾问、优雅风格、职业形象",
    # ---- Template 12: Sterling & Partners ----
    "Sterling &amp; Partners | Premier Law Firm": "Sterling &amp; Partners | 顶尖律师事务所",
    "Sterling &amp; Partners is a premier law firm providing exceptional legal representation in corporate law, criminal defense, family law, and real estate.": "Sterling &amp; Partners 是一家顶尖律师事务所，在公司法、刑事辩护、家庭法及房地产领域提供卓越的法律代理服务。",
    "law firm, attorneys, corporate law, criminal defense, family law, real estate law, legal representation": "律师事务所、律师、公司法、刑事辩护、家庭法、房地产法、法律代理",
    "Sterling &amp; Partners": "Sterling &amp; Partners",
    # ---- Template 13: Sterling & Co. ----
    "Sterling &amp; Co. | Premier Corporate Law Firm": "Sterling &amp; Co. | 顶尖公司法律事务所",
    "Sterling &amp; Co. is a premier corporate law firm dedicated to providing exceptional legal counsel with uncompromising integrity and precision.": "Sterling &amp; Co. 是一家顶尖公司法律事务所，致力于以坚定不移的正直与精准提供卓越的法律顾问服务。",
    "corporate law, law firm, M&amp;A, commercial litigation, intellectual property, real estate law, legal counsel": "公司法、律师事务所、并购、商业诉讼、知识产权、房地产法、法律顾问",
    "Sterling &amp; Co.": "Sterling &amp; Co.",
    # ---- Template 14: Blush & Bloom ----
    "Blush &amp; Bloom | Elegant Soft Pink Boutique": "Blush &amp; Bloom | 优雅粉嫩精品店",
    "Discover Blush &amp; Bloom, an elegant boutique offering curated collections of timeless fashion, delicate jewelry, and luxury beauty essentials in soft pink and blush tones.": "探索 Blush &amp; Bloom，一家以柔粉色调呈现精选典藏时装的优雅精品店，涵盖经典服饰、精致珠宝与奢华美容臻品。",
    "boutique, elegant fashion, soft pink, blush, luxury beauty, delicate jewelry, women's fashion": "精品店、优雅时装、柔粉色、腮红色、奢华美容、精致珠宝、女士时尚",
    "Blush &amp; Bloom": "Blush &amp; Bloom",
    "Discover our curated selection of timeless fashion, delicate jewelry, and luxury beauty essentials designed for the modern romantic.": "探索我们为现代浪漫主义者精心甄选的经典时装、精致珠宝与奢华美容臻品。",
    # ---- Template 15: NOIR ----
    "NOIR | Bold Black Luxury Boutique": "NOIR | 大胆黑色奢华精品店",
    "Discover NOIR, a luxury boutique redefining modern elegance through bold black aesthetics, uncompromising quality, and timeless design.": "探索 NOIR，一家以大胆黑色美学、极致品质与永恒设计重新定义现代优雅的奢华精品店。",
    "luxury boutique, black aesthetic, high-end fashion, luxury leather goods, luxury timepieces": "奢华精品店、黑色美学、高端时装、奢华皮具、奢华腕表",
    "NOIR Maison": "NOIR Maison",
    "Discover NOIR, a luxury boutique redefining modern elegance through bold black aesthetics.": "探索 NOIR，一家以大胆黑色美学重新定义现代优雅的奢华精品店。",
    # ---- Template 16: BOLD ----
    "BOLD | Men's Grooming Clinic": "BOLD | 男士理容诊所",
    "The premier destination for the modern man. Bold, dark, and sleek grooming services tailored for excellence. Precision cuts, expert beard care, and premium skincare.": "现代男士的首选之地。大胆、深邃而精致的理容服务，专为卓越而生。精剪发型、专业胡须护理及高端皮肤管理。",
    "men's grooming, barbershop, luxury barber, beard trim, men's facial, haircut, grooming clinic": "男士理容、理发店、奢华理发、胡须修剪、男士面部护理、剪发、理容诊所",
    "BOLD Grooming Clinic": "BOLD 理容诊所",
    "The premier destination for the modern man. Bold, dark, and sleek grooming services tailored for excellence.": "现代男士的首选之地。大胆、深邃而精致的理容服务，专为卓越而生。",
    # ---- Template 17: NeonPulse ----
    "NeonPulse | Vibrant Creative Music": "NeonPulse | 活力创意音乐",
    "Experience the vibrant pulse of creative electronic music. Join the movement and feel the neon energy with NeonPulse.": "感受创意电子音乐的动感脉搏。加入我们，与 NeonPulse 共同体验霓虹能量。",
    "music, electronic, synthwave, neon, creative, artist, tour, album": "音乐、电子、合成波、霓虹、创意、艺人、巡演、专辑",
    "NeonPulse": "NeonPulse",
    # ---- Template 18: Teal Craft Co. ----
    "Teal Craft Co. | Boutique On-Site Party &amp; Event Decoration Services": "Teal Craft Co. | 精品派对与活动装饰服务",
    "Teal Craft Co. is a boutique party decoration team offering custom balloon arrangements, backdrop setups, and complete table styling for birthdays, corporate events, and private gatherings.": "Teal Craft Co. 是一支精品派对装饰团队，为生日庆典、企业活动及私人聚会提供定制气球造型、背景布置与全套桌面陈设服务。",
    "party decoration, event styling, balloon arches, custom backdrops, table styling, corporate party decor, birthday decorators, boutique event styling": "派对装饰、活动造型、气球拱门、定制背景、桌面陈设、企业派对装饰、生日布置、精品活动造型",
    # ---- Template 19: Coral Fiesta ----
    "Coral Fiesta | Vibrant Party Venue &amp; Private Event Space Rental": "Coral Fiesta | 活力派对场地与私人活动空间租赁",
    "Host unforgettable celebrations at Coral Fiesta! The ultimate private party venue fully equipped with sound systems, HD projectors, and professional setups. Perfect for birthdays, corporate events, and family celebrations.": "在 Coral Fiesta 举办令人难忘的庆典！配备音响系统、高清投影及专业设施的终极私人派对场地，完美适用于生日、企业活动及家庭聚会。",
    "Coral Fiesta, party venue rental, birthday party space, corporate event venue, family celebration hall, private party rental, event space": "Coral Fiesta、派对场地租赁、生日派对空间、企业活动场地、家庭庆典厅、私人派对租赁、活动空间",
    "Coral Fiesta": "Coral Fiesta",
    "Coral Fiesta | Vibrant Private Party Venue": "Coral Fiesta | 活力私人派对场地",
    "Dazzling decorations, high-end sound &amp; light setup. Coral Fiesta is ready for your birthdays, corporate gatherings, and family events. Walk in, celebrate!": "炫目装饰，高端声光设备。Coral Fiesta 已为您的生日、企业聚会及家庭活动准备就绪。入场即庆！",
    "Coral Fiesta | Private Party Venue": "Coral Fiesta | 私人派对场地",
    "Fully equipped event space for birthday party, family reunion, or corporate gathering. Walk in and start the Fiesta!": "设施齐全的活动空间，适用于生日派对、家庭团聚或企业聚会。入场即开启狂欢！",
    # ---- Template 20: Little Sprout Academy ----
    "Little Sprout Academy | Warm, Playful &amp; Loving Daycare": "Little Sprout Academy | 温馨有趣的爱心托育园",
    "Little Sprout Academy is a bright, safe, and loving daycare in Happyville. We provide high-quality early childhood care and interactive learning for infants, toddlers, and preschoolers.": "Little Sprout Academy 是 Happyville 一家明亮、安全、充满爱心的托育园。我们为婴儿、幼儿及学龄前儿童提供优质的早期教育与互动学习。",
    "daycare, preschool, childcare, Little Sprout Academy, infant care, toddler learning, kindergarten prep, nursery": "托育园、学前班、儿童保育、Little Sprout Academy、婴儿护理、幼儿学习、幼儿园预备、托儿所",
    "Little Sprout Academy": "Little Sprout Academy",
    "A bright, safe, and loving daycare where every child blossoms at their own pace.": "一家明亮、安全、充满爱心的托育园，让每个孩子按照自己的节奏茁壮成长。",
    # ---- Template 21: Sage & Petal ----
    "Sage &amp; Petal | Handcrafted Everyday Bouquets &amp; Seasonal Blooms": "Sage &amp; Petal | 手工日常花束与时令鲜花",
    "Sage &amp; Petal is a small, owner-run neighborhood flower shop in your community. We handcraft fresh everyday bouquets and seasonal arrangements with quiet attention to detail.": "Sage &amp; Petal 是您社区里一家店主经营的小型邻里花店。我们以细致的匠心手工制作新鲜日常花束与时令花艺。",
    "flower shop, florist, handcrafted bouquets, seasonal flowers, local florist, flower delivery, Sage and Petal, everyday flowers": "花店、花艺师、手工花束、时令鲜花、本地花店、鲜花配送、Sage and Petal、日常鲜花",
    "Sage &amp; Petal": "Sage &amp; Petal",
    "Handcrafted fresh seasonal flower bouquets made with quiet attention to detail. Perfect for gifting, your own table, or just because.": "以细腻匠心手工制作的新鲜时令花束，无论是送礼、装点餐桌还是随心而为，皆为佳选。",
    "Sage &amp; Petal | Handcrafted Everyday Bouquets": "Sage &amp; Petal | 手工日常花束",
    # ---- Template 23: MAISON ELARA ----
    "MAISON ELARA | Timeless Fashion for the Free Spirit": "MAISON ELARA | 献给自由灵魂的永恒时装",
    "MAISON ELARA — a fashion brand for those who move through the world with intention. Minimalist design, contemporary silhouettes, built for the generation that defines culture.": "MAISON ELARA —— 为那些有意识地穿行于世界的人而生的时尚品牌。极简设计、当代廓形，为定义文化的世代而造。",
    "fashion brand, minimalist clothing, contemporary fashion, youth fashion, partnership, wholesale fashion": "时尚品牌、极简服装、当代时装、青年时尚、合作、批发时装",
    "MAISON ELARA | Timeless Fashion": "MAISON ELARA | 永恒时装",
    "A fashion brand for those who move through the world with intention.": "为那些有意识地穿行于世界的人而生的时尚品牌。",
    # ---- Template 24: Burivers ----
    "Burivers | Classic 1950s Burger Delivery": "Burivers | 经典 1950 年代风格汉堡外送",
    "Experience the authentic taste of the 50s. Hand-smashed patties, buttery toasted buns, and lightning-fast delivery to your door. Order now from Burivers!": "品味真正 50 年代的经典滋味。手工压制的肉饼、黄油烤制的面包，极速送达您的门前。立即在 Burivers 下单！",
    "burger delivery, retro diner, 1950s burger, double cheeseburger, food delivery, fast food, smash burger": "汉堡外送、复古餐厅、1950 年代汉堡、双层芝士汉堡、美食外送、快餐、手工压制汉堡",
    "Burivers": "Burivers",
    "Authentic 1950s style smashed burgers delivered hot and fast to your door.": "正宗 1950 年代风格手工压制汉堡，热腾腾极速送达。",
    # ---- Template 25: Sunny Steps ----
    "Sunny Steps Daycare | Bright &amp; Playful Learning": "Sunny Steps 托育园 | 阳光趣味学习",
    # ---- Template 26: Warm Orange Daycare ----
    "Warm Orange Daycare | Friendly &amp; Nurturing Childcare": "Warm Orange 托育园 | 温馨关爱儿童保育",
    "Warm Orange Daycare provides a safe, friendly, and nurturing environment for infants, toddlers, and preschoolers. Schedule a tour today!": "Warm Orange 托育园为婴儿、幼儿及学龄前儿童提供安全、友好、充满关爱的成长环境。立即预约参观！",
    "daycare, childcare, preschool, infant care, toddler program, early education, Warm Orange Daycare": "托育园、儿童保育、学前班、婴儿护理、幼儿课程、早期教育、Warm Orange 托育园",
    "Warm Orange Daycare": "Warm Orange 托育园",
    # ---- Template 27: Ignite Events ----
    "Ignite Events | Bold &amp; Vibrant Party Planning": "Ignite Events | 大胆活力派对策划",
    "We create unforgettable, high-energy experiences. From corporate galas to wild birthday bashes, we bring the heat to every event.": "我们打造令人难忘的高能体验。从企业盛典到狂欢生日派对，我们为每一场活动注入热力。",
    "party planning, event planner, corporate events, birthday parties, vibrant events, bold party design": "派对策划、活动策划、企业活动、生日派对、活力活动、大胆派对设计",
    "Ignite Events": "Ignite Events",
    # ---- Template 28: Lumina Events ----
    "Lumina Events | Bright Purple Creative Party Planning": "Lumina Events | 明亮紫色创意派对策划",
    "Lumina Events is a creative party planning agency specializing in weddings, corporate events, and private parties. We design unforgettable experiences.": "Lumina Events 是一家创意派对策划机构，专注于婚礼、企业活动及私人派对。我们设计令人难忘的体验。",
    "party planning, event planner, creative events, weddings, corporate events, bright purple": "派对策划、活动策划、创意活动、婚礼、企业活动、明亮紫色",
    "Lumina Events": "Lumina Events",
    # ---- Template 29: Verdant ----
    "Verdant | Fresh Green Minimal Florist": "Verdant | 清新绿色极简花艺",
    "Verdant is a minimalist botanical studio offering curated floral arrangements, fresh bouquets, and potted plants for the modern home.": "Verdant 是一家极简植物工作室，为现代家居提供精心甄选的花艺、新鲜花束与盆栽绿植。",
    "florist, minimalist florist, fresh flowers, green plants, botanical studio, modern floral design": "花店、极简花艺、鲜花、绿植、植物工作室、现代花艺设计",
    "Verdant Studio": "Verdant Studio",
    "Curated floral arrangements and plants for the modern, minimalist home.": "为现代极简家居精心甄选的花艺与绿植。",
    # ---- Template 30: Grace Church ----
    "Grace Church | A Place to Belong": "Grace Church | 归属之地",
    "Welcome to Grace Church. A welcoming community dedicated to faith, hope, and love. Join us for Sunday worship, ministries, and community outreach.": "欢迎来到 Grace Church。一个以信仰、盼望与爱为根基的温馨社区。加入我们的主日崇拜、事工与社区关怀。",
    "church, grace church, christian, worship, sermons, ministries, community, faith": "教会、Grace Church、基督教、敬拜、讲道、事工、社区、信仰",
    "Grace Church": "Grace Church",
    "Welcome to Grace Church. A welcoming community dedicated to faith, hope, and love.": "欢迎来到 Grace Church。一个以信仰、盼望与爱为根基的温馨社区。",
    # ---- Template 31: Fleur & Co. ----
    "Fleur &amp; Co. | Elegant Soft Pink Florist": "Fleur &amp; Co. | 优雅柔粉花艺",
    "Discover elegant, soft pink floral arrangements for weddings, events, and everyday beauty at Fleur &amp; Co.": "在 Fleur &amp; Co. 发现为婚礼、活动及日常之美打造的优雅柔粉花艺。",
    # ---- Template 32: Electric Bloom ----
    "Electric Bloom | Official Website | Cyberpunk Indie Pop": "Electric Bloom | 官方网站 | 赛博朋克独立流行",
    "Official website of Electric Bloom, a cyberpunk-influenced indie pop band fusing electronic beats with raw guitar energy. Listen to latest singles, view tour dates, and shop official merchandise.": "Electric Bloom 官方网站，一支受赛博朋克影响的独立流行乐队，融合电子节拍与原始吉他能量。收听最新单曲、查看巡演日程、选购官方周边。",
    "Electric Bloom, cyberpunk indie pop, electronic synthwave, raw guitar pop, Echoes Don't Lie, neon band, sci-fi music": "Electric Bloom、赛博朋克独立流行、电子合成波、原始吉他流行、Echoes Don't Lie、霓虹乐队、科幻音乐",
    "Electric Bloom": "Electric Bloom",
    "Electric Bloom | Official Website": "Electric Bloom | 官方网站",
    "Where Neon Meets Sound. Immerse yourself in the synthwave cyber-pop soundscapes of Electric Bloom.": "霓虹与声音在此交汇。沉浸在 Electric Bloom 的合成波赛博流行音乐世界中。",
    # ---- Template 33: NexusBiz ----
    "NexusBiz | Modern Solutions for Small Businesses": "NexusBiz | 中小企业现代解决方案",
    "NexusBiz provides modern web design, digital marketing, and SEO solutions tailored for small businesses to grow and succeed online.": "NexusBiz 为中小企业提供量身定制的现代网页设计、数字营销与 SEO 解决方案，助力在线成长与成功。",
    "small business, web design, digital marketing, SEO, modern website, business growth": "中小企业、网页设计、数字营销、SEO、现代网站、业务增长",
    "NexusBiz": "NexusBiz",
    # ---- Template 34: Alex.dev ----
    "Alex.dev | Creative Developer & Designer": "Alex.dev | 创意开发者与设计师",
    "Portfolio of Alex, a multidisciplinary developer and designer specializing in high-performance, accessible, and visually stunning digital products.": "Alex 的作品集，一位多学科开发者与设计师，专注于打造高性能、无障碍且视觉惊艳的数字产品。",
    "Creative Developer, UI/UX Designer, React, Framer Motion, Portfolio, Web Development": "创意开发者、UI/UX 设计师、React、Framer Motion、作品集、网页开发",
    "Alex": "Alex",
    # ---- Template 35: Lumina Monochrome Gallery ----
    "Lumina | Monochrome Modern Photography Gallery": "Lumina | 黑白现代摄影画廊",
    "Lumina is a modern monochrome photography gallery showcasing fine art, architectural, and portrait photography by an award-winning artist.": "Lumina 是现代黑白摄影画廊，展出获奖艺术家的艺术摄影、建筑摄影与人像摄影作品。",
    "monochrome photography, black and white photography, fine art photography, modern gallery, architectural photography, portrait photography": "黑白摄影、黑白影像、艺术摄影、现代画廊、建筑摄影、人像摄影",
    "Lumina is a modern monochrome photography gallery showcasing fine art, architectural, and portrait photography.": "Lumina 是现代黑白摄影画廊，展出艺术摄影、建筑摄影与人像作品。",
    # ---- Template 36: Emma & James Wedding Lavender ----
    "Emma & James | Romantic Lavender Wedding": "Emma 与 James | 浪漫薰衣草婚礼",
    "Join us in celebrating the wedding of Emma and James in Provence, France. September 12, 2026.": "诚邀您参加 Emma 与 James 于法国普罗旺斯举行的婚礼。2026 年 9 月 12 日。",
    "wedding, emma and james, provence wedding, lavender wedding": "婚礼、Emma 与 James、普罗旺斯婚礼、薰衣草婚礼",
    "Emma & James": "Emma 与 James",
    # ---- Template 37: NexusCorp ----
    "NexusCorp | Modern Business Solutions": "NexusCorp | 现代企业解决方案",
    "NexusCorp provides clean, simple, and effective business strategies to help your company scale, innovate, and succeed.": "NexusCorp 提供简洁高效的企业战略，助力您的公司实现规模化、创新突破与长足发展。",
    "business consulting, digital transformation, data analytics, cloud solutions, corporate strategy": "企业咨询、数字化转型、数据分析、云解决方案、企业战略",
    "NexusCorp": "NexusCorp",
    # ---- Template 38: Emma & James Wedding Pink ----
    "Emma & James | Elegant Pink Wedding": "Emma 与 James | 优雅粉色婚礼",
    "Join us to celebrate the wedding of Emma and James on September 15, 2026, at Château de Villette, France.": "诚邀您参加 Emma 与 James 于 2026 年 9 月 15 日在法国维莱特城堡举行的婚礼。",
    "wedding, emma and james, elegant wedding, pink wedding, chateau de villette": "婚礼、Emma 与 James、优雅婚礼、粉色婚礼、维莱特城堡",
    # ---- Template 39: Onyx ----
    "Onyx | Bold Geometric Digital Agency": "Onyx | 大胆几何数字机构",
    "Onyx is a bold, geometric digital agency crafting high-end experiences for forward-thinking brands.": "Onyx 是一家大胆几何风格的数字机构，为前瞻性品牌打造高端体验。",
    "digital agency, web design, branding, framer, geometric design, bold typography": "数字机构、网页设计、品牌塑造、Framer、几何设计、大胆排版",
    "Onyx Agency": "Onyx 机构",
    # ---- Template 40: Eleanor & James ----
    "Eleanor & James | Wedding Invitation": "Eleanor 与 James | 婚礼邀请函",
    "Join us in celebrating the wedding of Eleanor and James on September 15, 2026 at Lake Como, Italy.": "诚邀您参加 Eleanor 与 James 于 2026 年 9 月 15 日在意大利科莫湖举行的婚礼。",
    # ---- Template 42: NexusCorp Strategic ----
    "NexusCorp | Strategic Business Consulting & Solutions": "NexusCorp | 战略企业咨询与解决方案",
    "NexusCorp provides strategic consulting, digital transformation, and innovative solutions to help forward-thinking companies achieve sustainable growth.": "NexusCorp 提供战略咨询、数字化转型与创新解决方案，助力前瞻性企业实现可持续增长。",
    "business consulting, digital transformation, corporate strategy, data analytics, cloud solutions": "企业咨询、数字化转型、企业战略、数据分析、云解决方案",
    "NexusCorp | Strategic Business Consulting": "NexusCorp | 战略企业咨询",
    "Transforming businesses globally with strategic consulting and digital solutions.": "以战略咨询与数字解决方案推动全球企业转型。",
    # ---- Template 43: AURA E-Commerce ----
    "AURA | Modern E-Commerce Template": "AURA | 现代电商模版",
    "A premium, minimalist e-commerce template for modern brands.": "面向现代品牌的 premium 极简电商模版。",
    # ---- Template 44: BuildCore ----
    "BuildCore | Professional Construction & Contracting Services": "BuildCore | 专业建筑与承包服务",
    "BuildCore provides top-tier commercial and residential construction, remodeling, and civil engineering services. Building your vision with precision.": "BuildCore 提供顶级商业与住宅建造、翻新及土木工程服务。以精准工艺筑就您的愿景。",
    "construction, contractor, building, commercial construction, residential construction, remodeling, civil engineering": "建筑施工、承包商、建筑、商业建筑、住宅建造、翻新、土木工程",
    "BuildCore": "BuildCore",
    "BuildCore | Professional Construction Services": "BuildCore | 专业建筑服务",
    "Top-tier commercial and residential construction services. Building your vision with precision.": "顶级商业与住宅建筑服务。以精准工艺筑就您的愿景。",
    # ---- Template 45: Proxima ----
    "Proxima - Professional Business Website Template": "Proxima - 专业企业网站模版",
    "Proxima is a modern, professional website template for businesses, agencies, and SaaS companies.": "Proxima 是面向企业、机构及 SaaS 公司的现代专业网站模版。",
    "business template, corporate website, agency template, professional design, react template": "企业模版、公司网站、机构模版、专业设计、React 模版",
    "Proxima Inc.": "Proxima Inc.",
    # ---- Template 46: Lens & Light ----
    "Lens & Light | Professional Photography Portfolio": "Lens & Light | 专业摄影作品集",
    "Lens & Light is a premium photography studio specializing in editorial, fashion, portrait, and wedding photography. Based in New York, available worldwide.": "Lens & Light 是 premium 摄影工作室，专注于商业摄影、时尚摄影、人像摄影及婚礼摄影。立足纽约，服务全球。",
    "photography, portfolio, fashion photography, portrait photography, wedding photography, editorial, new york photographer": "摄影、作品集、时尚摄影、人像摄影、婚礼摄影、商业摄影、纽约摄影师",
    "Lens & Light": "Lens & Light",
    "Premium photography studio specializing in editorial, fashion, portrait, and wedding photography.": "高端摄影工作室，专注于商业摄影、时尚摄影、人像摄影及婚礼摄影。",
    # ---- Template 47: James Hartwell ----
    "James Hartwell | Austin Real Estate Advisor & Expert Agent": "James Hartwell | 奥斯汀房产顾问与资深经纪人",
    "Discover premium Austin real estate services with James Hartwell. 12+ years of local expertise, 127+ homes sold, and a 4.9-star rating. Buy or sell your Austin home with a trusted neighborhood authority.": "与 James Hartwell 一同探索奥斯汀 premium 房产服务。12 年以上本地经验、127 套以上房屋成交、4.9 星好评。与值得信赖的社区专家一起买卖您的奥斯汀房产。",
    "James Hartwell, Austin real estate, Austin real estate agent, West Lake Hills real estate, Austin homes for sale, Tarrytown real estate, Austin luxury homes, sell home Austin": "James Hartwell、奥斯汀房产、奥斯汀房产经纪人、West Lake Hills 房产、奥斯汀在售房屋、Tarrytown 房产、奥斯汀豪宅、出售奥斯汀房屋",
    "James Hartwell": "James Hartwell",
    "Partner with Austin's top-producing agent. 12+ years of local market expertise, 127+ homes sold, and unparalleled client satisfaction.": "与奥斯汀顶级经纪人合作。12 年以上本地市场经验、127 套以上房屋成交、无与伦比的客户满意度。",
    # ---- Template 48: Alex Rivera ----
    "Alex Rivera | Content Strategist &amp; Copywriter Portfolio": "Alex Rivera | 内容策略师与文案作品集",
    "Freelance content strategist &amp; copywriter helping brands grow with strategic content, social media, and conversion-focused copywriting. Connect via WhatsApp today.": "自由职业内容策略师与文案写手，以策略内容、社交媒体及转化导向文案助力品牌增长。立即通过 WhatsApp 联系。",
    "Alex Rivera, Freelance Copywriter, Content Strategist, Social Media Manager, Portfolio, Content Marketing, WhatsApp Contact": "Alex Rivera、自由文案写手、内容策略师、社交媒体经理、作品集、内容营销、WhatsApp 联系",
    "Alex Rivera": "Alex Rivera",
    # ---- Template 49: Maya Chen ----
    "Maya Chen | Operations &amp; Strategy Leader | San Francisco": "Maya Chen | 运营与战略负责人 | 旧金山",
    "Portfolio of Maya Chen, an experienced Operations &amp; Strategy Leader based in San Francisco. Dynamic visual resume showcasing 6 years of driving high-impact systems, operational excellence, and data-driven growth.": "Maya Chen 的作品集，一位常驻旧金山的资深运营与战略负责人。动态视觉简历，展示 6 年来推动高影响力系统、卓越运营与数据驱动增长的成果。",
    "Maya Chen, Operations Strategy, Operations Leader San Francisco, Business Operations, Strategy and Operations, Program Manager, Operations Portfolio": "Maya Chen、运营战略、旧金山运营负责人、业务运营、战略与运营、项目经理、运营作品集",
    "Maya Chen": "Maya Chen",
    "Maya Chen | Operations &amp; Strategy Leader": "Maya Chen | 运营与战略负责人",
    "6 years of turning chaotic processes into high-performing systems. Based in San Francisco. Explore key metrics, project history, and professional insights.": "6 年将混沌流程转化为高效系统的经验。常驻旧金山。探索关键指标、项目历程与专业洞见。",
    "6 years of operations excellence, business strategy, and systems building. Explore interactive professional portfolio.": "6 年卓越运营、企业战略与系统构建经验。探索交互式专业作品集。",
    # ---- Template 50: Nora Vane ----
    "Nora Vane — Freelance Writer, Essayist & Brand Storyteller": "Nora Vane — 自由撰稿人、随笔作家与品牌故事讲述者",
    "Nora Vane is a New York City-based freelance writer, essayist, and brand storyteller. Specializing in personal essays, brand copywriting, and cultural criticism.": "Nora Vane 是常驻纽约市的自由撰稿人、随笔作家与品牌故事讲述者。擅长个人随笔、品牌文案及文化评论。",
    "Nora Vane, freelance writer, essayist, brand storyteller, copywriter, New York, creative consulting, ghostwriting": "Nora Vane、自由撰稿人、随笔作家、品牌故事讲述者、文案写手、纽约、创意咨询、代笔写作",
    "Nora Vane": "Nora Vane",
    "Nora Vane is a New York City-based freelance writer and essayist specializing in brand storytelling, personal essays, and cultural criticism.": "Nora Vane 是常驻纽约市的自由撰稿人与随笔作家，擅长品牌故事讲述、个人随笔及文化评论。",
    # ---- Template 51: Radiant Smile Studio ----
    "Radiant Smile Studio | Dr. Emily Carter | Boutique Cosmetic Dentist": "Radiant Smile Studio | Emily Carter 医生 | 精品美容牙科",
    "Welcome to Radiant Smile Studio, a boutique cosmetic dental clinic run by Dr. Emily Carter. Specializing in porcelain veneers, teeth whitening, Invisalign, and full smile makeovers in a warm, anxiety-free, spa-like environment.": "欢迎来到 Radiant Smile Studio，由 Emily Carter 医生主理的精品美容牙科诊所。在温馨、无焦虑的水疗式环境中，专注于瓷贴面、牙齿美白、Invisalign 隐形矫正及全方位微笑改造。",
    "cosmetic dentist, boutique dental clinic, porcelain veneers, teeth whitening, Invisalign, Dr. Emily Carter, dental bonding, smile makeover, luxury dental, anxiety-free dentistry": "美容牙科、精品牙科诊所、瓷贴面、牙齿美白、Invisalign 隐形矫正、Emily Carter 医生、牙齿粘接、微笑改造、奢华牙科、无焦虑牙科",
    "Dr. Emily Carter, DDS": "Emily Carter 医生 (DDS)",
    "Radiant Smile Studio | Boutique Cosmetic Dentistry": "Radiant Smile Studio | 精品美容牙科",
    "Transform your smile with Dr. Emily Carter at Radiant Smile Studio. Enjoy world-class cosmetic dental treatments in a warm, spa-like clinic designed to soothe anxiety.": "在 Radiant Smile Studio 与 Emily Carter 医生一同焕新您的微笑。在旨在舒缓焦虑的温馨水疗式诊所中，享受世界级美容牙科治疗。",
    # ---- Template 52: Warm Coral ----
    "Warm Coral | Luxury Travel & Tourism": "Warm Coral | 奢华旅行与旅游",
    "Experience the world's most breathtaking destinations with Warm Coral's curated luxury travel packages. Your dream vacation awaits.": "以 Warm Coral 精心策划的奢华旅行套餐，体验全球最令人叹为观止的目的地。您的梦幻假期正待启程。",
    "luxury travel, tourism, vacation packages, warm coral, tropical destinations, travel agency": "奢华旅行、旅游、度假套餐、Warm Coral、热带目的地、旅行社",
    "Warm Coral": "Warm Coral",
    "Experience the world's most breathtaking destinations with Warm Coral's curated luxury travel packages.": "以 Warm Coral 精心策划的奢华旅行套餐，体验全球最令人叹为观止的目的地。",
    # ---- Template 53: Serenity Spa ----
    "Serenity Spa & Wellness | Boutique Day Spa & Relaxation Sanctuary": "Serenity Spa & 康体中心 | 精品日间水疗与放松圣地",
    "Serenity Spa & Wellness is a warm, welcoming day spa offering personalized massage, facial, and body treatment experiences. Restore, Renew, Reconnect.": "Serenity Spa & 康体中心是一家温馨宜人的日间水疗，提供个性化按摩、面部护理及身体护理体验。修复、焕新、重连。",
    "day spa, serenity spa, wellness, massage, swedish massage, signature facial, botanical body wrap, relaxation, beauty treatment": "日间水疗、Serenity Spa、康体、按摩、瑞典式按摩、招牌面部护理、植物身体裹敷、放松、美容护理",
    "Serenity Spa & Wellness": "Serenity Spa & 康体中心",
    "Serenity Spa & Wellness | Boutique Day Spa": "Serenity Spa & 康体中心 | 精品日间水疗",
    "Serenity Spa & Wellness is a warm, welcoming day spa offering personalized massage, facial, and body treatment experiences.": "Serenity Spa & 康体中心是一家温馨宜人的日间水疗，提供个性化按摩、面部护理及身体护理体验。",
    # ---- Template 54: TradeCore ----
    "TradeCore | Global B2B E-commerce & Wholesale Sourcing Platform": "TradeCore | 全球 B2B 电商与批发采购平台",
    "TradeCore is the leading B2B e-commerce platform connecting buyers with verified global suppliers. Source industrial equipment, electronics, and wholesale goods securely.": "TradeCore 是领先的 B2B 电商平台，连接买家与全球认证供应商。安全采购工业设备、电子产品及批发商品。",
    "B2B e-commerce, wholesale sourcing, global trade, industrial equipment, bulk ordering, verified suppliers, procurement platform": "B2B 电商、批发采购、全球贸易、工业设备、批量订购、认证供应商、采购平台",
    "TradeCore": "TradeCore",
    "TradeCore | Global B2B E-commerce Platform": "TradeCore | 全球 B2B 电商平台",
    "Source products globally with verified suppliers, secure payments, and wholesale pricing.": "全球采购产品，认证供应商、安全支付与批发价格。",
    # ---- Template 55: SparkleClean ----
    "SparkleClean | Professional Cleaning Services": "SparkleClean | 专业清洁服务",
    "Top-rated professional cleaning services for residential and commercial spaces. We make your space sparkle.": "备受好评的专业清洁服务，覆盖住宅与商业空间。让您的空间焕然一新。",
    # ---- Template 56: LUMIERE ----
    "LUMIERE | High-End Minimalist Fashion": "LUMIERE | 高端极简时装",
    "Discover LUMIERE's latest collection of minimalist, high-end fashion. Shop elegant clothing designed for the modern wardrobe.": "探索 LUMIERE 最新极简高端时装系列。选购为现代衣橱而设计的优雅服饰。",
    "fashion, minimalist clothing, high-end fashion, LUMIERE, modern wardrobe, elegant clothes": "时装、极简服装、高端时装、LUMIERE、现代衣橱、优雅服饰",
    # ---- Template 57: PeptiCore ----
    "PeptiCore | Advanced Peptide Technology": "PeptiCore | 先进肽技术",
    "PeptiCore engineers bio-active peptides for revolutionary applications in skincare, health optimization, and scientific research.": "PeptiCore 工程化生物活性肽，广泛应用于护肤、健康优化及科学研究的革命性领域。",
    "peptides, biotech, skincare, research, GHK-Cu, BPC-157": "肽、生物技术、护肤、科研、GHK-Cu、BPC-157",
    "PeptiCore": "PeptiCore",
    # ---- Template 58: Bootstrap ----
    "Bootstrap - The Ultimate Foundation for Your Next Big Idea": "Bootstrap - 您下一个宏伟创意的终极基础",
    "Bootstrap your startup in minutes, not days. Everything you need to build, scale, and launch your product with confidence.": "数分钟内启动您的创业项目，而非数日。构建、扩展与自信发布产品所需的一切。",
    "bootstrap, startup, template, react, tailwind, vite": "bootstrap、创业、模版、React、Tailwind、Vite",
    "Bootstrap Inc.": "Bootstrap Inc.",
    # ---- Template 59: Lumina Lifestyle ----
    "Lumina | Minimalist Lifestyle Essentials": "Lumina | 极简生活精选",
    "Discover our curated collection of minimalist essentials designed for the modern lifestyle. High-quality home goods and accessories.": "探索我们为现代生活方式精心甄选的极简生活必备品。高品质家居用品与配饰。",
    "ecommerce, minimalist, lifestyle, fashion, home goods, accessories": "电商、极简、生活方式、时尚、家居用品、配饰",
    # ---- Template 60: Aura Studio Art ----
    "Aura Studio | Contemporary Art Portfolio": "Aura Studio | 当代艺术作品集",
    "Explore the contemporary fine art portfolio of Aura Studio. Discover minimalist sculptures, abstract oil paintings, and mixed media artworks.": "探索 Aura Studio 的当代艺术作品集。发现极简雕塑、抽象油画与综合媒介艺术作品。",
    "art portfolio, contemporary art, minimalist sculpture, abstract painting, fine art, Aura Studio": "艺术作品集、当代艺术、极简雕塑、抽象绘画、艺术、Aura Studio",
    "Aura Studio": "Aura Studio",
    # ---- Template 61: Oblivion ----
    "Oblivion | Creative Advertising Agency": "Oblivion | 创意广告机构",
    "Oblivion is an independent creative agency building brands that refuse to be ignored. Strategy, design, and digital execution for the modern era.": "Oblivion 是一家独立创意机构，打造令人无法忽视的品牌。为现代时代提供策略、设计与数字执行。",
    "advertising agency, creative agency, brand strategy, digital design, marketing, campaigns": "广告机构、创意机构、品牌策略、数字设计、营销、广告活动",
    "Oblivion Agency": "Oblivion 机构",
    "Oblivion is an independent creative agency building brands that refuse to be ignored.": "Oblivion 是一家独立创意机构，打造令人无法忽视的品牌。",
    # ---- Template 62: ADULT. ----
    "ADULT. | Mastering the Art of Adulthood": "ADULT. | 精通成人生活艺术",
    "A premium editorial destination for modern living, sophisticated tastes, financial independence, and personal growth.": "面向现代生活、品味修养、财务独立与个人成长的 premium 编辑平台。",
    "adult, lifestyle, finance, career, modern living, sophisticated, magazine": "成人、生活方式、理财、职业、现代生活、精致、杂志",
    "ADULT. Magazine": "ADULT. 杂志",
    # ---- Template 63: Lumina Gallery ----
    "Lumina Gallery | Contemporary Art": "Lumina Gallery | 当代艺术",
    "Lumina is a contemporary art gallery dedicated to showcasing innovative and thought-provoking works by emerging and established artists worldwide.": "Lumina 是一家当代艺术画廊，致力于展示全球新锐与知名艺术家创新且发人深省的作品。",
    "art gallery, contemporary art, modern art, exhibitions, artists, paintings, sculptures": "艺术画廊、当代艺术、现代艺术、展览、艺术家、绘画、雕塑",
    "Lumina Gallery": "Lumina Gallery",
    "A contemporary art gallery dedicated to showcasing innovative and thought-provoking works.": "一家致力于展示创新且发人深省作品的当代艺术画廊。",
    # ---- Template 64: LinkForge ----
    "LinkForge | Premium Affiliate Marketing Network": "LinkForge | 高端联盟营销网络",
    "LinkForge is the premier affiliate marketing network connecting top-tier creators with high-converting brands. Scale your revenue with precision.": "LinkForge 是顶尖的联盟营销网络，连接顶级创作者与高转化品牌。精准扩大您的收入规模。",
    "affiliate marketing, affiliate network, CPA offers, RevShare, high-ticket affiliate programs, performance marketing": "联盟营销、联盟网络、CPA 推广、收入分成、高客单价联盟计划、效果营销",
    "LinkForge": "LinkForge",
    "Connect with top-tier brands and elite creators. LinkForge provides the infrastructure, tracking, and high-converting offers you need to dominate affiliate marketing.": "连接顶级品牌与精英创作者。LinkForge 提供您主导联盟营销所需的基础设施、追踪系统与高转化推广。",
    # ---- Template 65: Lumina 3D ----
    "Lumina 3D | Premier 3D Animation & VFX Studio": "Lumina 3D | 顶尖 3D 动画与视觉特效工作室",
    "Award-winning 3D animation studio specializing in high-end CGI, motion graphics, character design, and visual effects for forward-thinking brands.": "屡获殊荣的 3D 动画工作室，专注于为前瞻性品牌提供高端 CGI、动态图形、角色设计及视觉特效。",
    "3D animation, VFX, motion graphics, CGI, 3D modeling, rendering, studio": "3D 动画、视觉特效、动态图形、CGI、3D 建模、渲染、工作室",
    "Lumina 3D": "Lumina 3D",
    "Award-winning 3D animation studio specializing in high-end CGI, motion graphics, character design, and visual effects.": "屡获殊荣的 3D 动画工作室，专注于高端 CGI、动态图形、角色设计及视觉特效。",
    # ---- Template 66: Aegis Archives ----
    "Aegis Archives | Secure Document Storage & Digital Archiving": "Aegis Archives | 安全文档存储与数字归档",
    "Aegis Archives provides enterprise-grade physical document storage, digital archiving, and secure shredding services for organizations demanding absolute compliance.": "Aegis Archives 为有严格合规要求的组织提供企业级实体文档存储、数字归档及安全销毁服务。",
    "archive services, document storage, digital archiving, secure shredding, data preservation, compliance": "归档服务、文档存储、数字归档、安全销毁、数据保存、合规",
    "Aegis Archives": "Aegis Archives",
    "Aegis Archives | Secure Document Storage": "Aegis Archives | 安全文档存储",
    "Enterprise-grade physical document storage, digital archiving, and secure shredding services.": "企业级实体文档存储、数字归档及安全销毁服务。",
    # ---- Template 67: Chronicle ----
    "Chronicle | Modern Design & Culture Blog": "Chronicle | 现代设计与文化博客",
    "A digital publication exploring design, technology, and the art of living well in the modern age.": "探索现代设计、科技与美好生活艺术的数字刊物。",
    "blog, design, technology, culture, minimalist, architecture": "博客、设计、科技、文化、极简、建筑",
    "Chronicle Team": "Chronicle 团队",
    # ---- Template 69: Hygge & Haus ----
    "Hygge & Haus | Timeless Scandinavian &amp; Japandi Furniture": "Hygge & Haus | 永恒斯堪的纳维亚与 Japandi 家具",
    "Discover handcrafted premium furniture inspired by Scandinavian simplicity and Japanese wabi-sabi. Elevate your home living with sustainable, timeless designs at Hygge & Haus.": "探索以斯堪的纳维亚简约与日式侘寂为灵感的精工 premium 家具。在 Hygge & Haus，以可持续的永恒设计提升您的家居生活。",
    "premium furniture, Japandi furniture, Scandinavian design, handcrafted wood furniture, sustainable home decor, luxury minimalist interiors, walnut sideboard, minimalist sofa": "高端家具、Japandi 家具、斯堪的纳维亚设计、手工木家具、可持续家居装饰、奢华极简室内、胡桃木边柜、极简沙发",
    "Hygge & Haus": "Hygge & Haus",
    "Discover handcrafted premium furniture inspired by Scandinavian simplicity and Japanese wabi-sabi. Sustainable, cozy, and timeless designs.": "探索以斯堪的纳维亚简约与日式侘寂为灵感的精工 premium 家具。可持续、舒适而永恒的设计。",
    # ---- Template 70: AffiliateBoost ----
    "AffiliateBoost | Build Profitable Affiliate Websites Faster": "AffiliateBoost | 更快打造盈利型联盟营销网站",
    "Launch high-converting, SEO-ready niche sites in minutes with premium WordPress templates designed for bloggers, marketers, and niche site owners.": "使用专为博主、营销人员及垂直网站所有者设计的 premium WordPress 模版，数分钟内发布高转化、SEO 就绪的垂直网站。",
    "affiliate marketing templates, wordpress affiliate, niche site builder, SEO themes": "联盟营销模版、WordPress 联盟、垂直网站构建器、SEO 主题",
    # ---- Template 71: InteractFlow ----
    "InteractFlow | Templates": "InteractFlow | 模版",
    # ---- Template 72: CODOT. ----
    "CODOT. | The Premier Community for Visionary Creators": "CODOT. | 远见创作者首选社区",
    "A curated community platform designed for the world's most visionary creators. Connect, inspire, and grow in a structured yet organic digital sanctuary.": "专为全球最具远见的创作者打造的精选社区平台。在一个结构化而又自然有机的数字圣地中连接、启发与成长。",
    "Influencer community, creative network, creator platform, aesthetic moodboards, design community, Codot, brutalist design": "创作者社区、创意网络、创作者平台、审美情绪板、设计社区、Codot、粗野主义设计",
    "Codot Community": "Codot 社区",
    # ---- Template 73: Coachify ----
    "Coachify | Build a 6-Figure Personal Brand in 90 Days": "Coachify | 90 天打造六位数个人品牌",
    "The proven 90-day system for digital experts, consultants, and coaches to attract premium clients without expensive agencies.": "为数字专家、顾问及教练打造的经过验证的 90 天系统，无需昂贵的代理机构即可吸引高端客户。",
    "personal branding, business coaching, digital consultant, high-ticket clients, coaching program, grow your business": "个人品牌、商业教练、数字顾问、高客单价客户、教练课程、业务增长",
    "Coachify": "Coachify",
    "The proven 90-day system for digital experts, consultants, and coaches to attract premium clients.": "为数字专家、顾问及教练打造的经过验证的 90 天系统，吸引高端客户。",
    # ---- Template 74: CT Executive Training ----
    "CT Executive Training | Corporate Leadership & Management": "CT 高管培训 | 企业领导力与管理",
    "Elevate your executive impact with our world-class corporate training programs. Master strategic management, advanced negotiation, and corporate leadership.": "以世界级企业培训课程提升您的高管影响力。掌握战略管理、高级谈判及企业领导力。",
    "executive training, corporate leadership, strategic management, corporate elite, advanced negotiation, business strategy": "高管培训、企业领导力、战略管理、企业精英、高级谈判、商业策略",
    "CT Executive Training": "CT 高管培训",
    "Elevate your executive impact with our world-class corporate training programs.": "以世界级企业培训课程提升您的高管影响力。",
    # ---- Template 76: WixBuilder ----
    "WixBuilder | Create a Website Without Limits": "WixBuilder | 无限制创建网站",
    "Build your dream website instantly with WixBuilder's drag-and-drop platform. No coding required. Perfect for beginners, freelancers, and small businesses.": "使用 WixBuilder 的拖拽式平台即刻打造您的梦想网站。无需编程，完美适用于初学者、自由职业者及中小企业。",
    "website builder, no-code, drag and drop, website templates, ecommerce, portfolio, create website": "网站构建器、无代码、拖拽式、网站模版、电商、作品集、创建网站",
    "WixBuilder": "WixBuilder",
    "Effortless creation, powerful results. Launch your vision today with our intuitive drag-and-drop editor.": "轻松创建，强大成果。使用我们直观的拖拽式编辑器，今日即发布您的愿景。",
    # ---- Template 77: Elara Studio ----
    "Elara Studio | Luxury Wedding Photography": "Elara Studio | 奢华婚礼摄影",
    "Capturing love, timelessly. A curated collection of intimate, cinematic, and emotional love stories by Elara Studio.": "永恒捕捉爱的瞬间。由 Elara Studio 呈现的精选亲密、电影感与深情爱情故事集。",
    "luxury wedding photography, editorial wedding photographer, fine art weddings, elopements, romantic photography": "奢华婚礼摄影、商业婚礼摄影师、艺术婚礼、私奔婚礼、浪漫摄影",
    "Elara Studio": "Elara Studio",
    # ---- Template 78: CUP CULT ----
    "CUP CULT | Your Obsession. Your Hydration.": "CUP CULT | 你的执念，你的补水。",
    "Shop the most obsessed-over tumblers, mugs, and water bottles. Join the cult for limited edition, vibrant, and unique drinkware. Stay Weird.": "选购最令人着迷的随行杯、马克杯与水壶。加入我们的狂热社区，获取限量版、活力四射的独特饮水器具。保持与众不同。",
    # ---- Template 79: AI Payroll ----
    "AI Payroll - Global Compensation Software for B2B Enterprises": "AI Payroll - B2B 企业全球薪酬软件",
    "Future-proof your payroll with our intelligent, automated global compensation software. Seamlessly run global payments, auto-compliance, and AI-driven workflow.": "以我们智能自动化的全球薪酬软件为您的薪酬体系保驾护航。无缝运行全球支付、自动合规及 AI 驱动工作流。",
    "AI Payroll, Global Compensation, SaaS, B2B Payroll, Automated Payroll, Compliance": "AI Payroll、全球薪酬、SaaS、B2B 薪酬、自动化薪酬、合规",
    "AI Payroll Tech": "AI Payroll Tech",
    "AI Payroll - Global Compensation Software": "AI Payroll - 全球薪酬软件",
    "Intelligent, automated, and seamless global compensation for B2B enterprises.": "为 B2B 企业提供智能、自动化且无缝的全球薪酬方案。",
    # ---- Template 80: The Slow Travel Manifesto ----
    "The Slow Travel Manifesto - WanderFolio": "慢旅行宣言 - WanderFolio",
    "Why rushing through ten countries is killing your inspiration, and how to embrace mindful exploration instead. Read Kimmy's guide on slow travel.": "为什么匆匆穿越十个国家正在扼杀你的灵感，以及如何拥抱正念探索。阅读 Kimmy 的慢旅行指南。",
    "slow travel, digital nomad, remote work, study abroad, inspiration, travel blog": "慢旅行、数字游民、远程工作、海外留学、灵感、旅行博客",
    "Kimmy": "Kimmy",
    "Why rushing through ten countries is killing your inspiration, and how to embrace mindful exploration instead.": "为什么匆匆穿越十个国家正在扼杀你的灵感，以及如何拥抱正念探索。",
    # ---- Template 81: Urban Living ----
    "Urban Living | Premium Real Estate in Amsterdam": "Urban Living | 阿姆斯特丹高端房产",
    "Elevating urban living for first-time buyers, investors, and luxury seekers in Amsterdam with unmatched local expertise.": "以无可匹敌的本地专业经验，为阿姆斯特丹的首购者、投资者及奢华追求者提升都市生活品质。",
    "Amsterdam real estate, luxury apartments Amsterdam, investment property Amsterdam, buy home Amsterdam, Urban Living": "阿姆斯特丹房产、阿姆斯特丹豪华公寓、阿姆斯特丹投资房产、阿姆斯特丹购房、Urban Living",
    "Urban Living": "Urban Living",
    # ---- Template 83: Lex Advisors ----
    "Lex Advisors | General Practice Law Firm": "Lex Advisors | 综合律师事务所",
    "Lex Advisors is a premium general practice law firm providing expert counsel in corporate law, litigation, and real estate.": "Lex Advisors 是一家 premium 综合律师事务所，在公司法、诉讼及房地产领域提供专业法律顾问服务。",
    "law firm, legal advisors, corporate law, litigation, real estate law, experienced advocates": "律师事务所、法律顾问、公司法、诉讼、房地产法、资深律师",
    "Lex Advisors": "Lex Advisors",
    "Lex Advisors | Expert Legal Counsel": "Lex Advisors | 专业法律顾问",
    "Premium legal services tailored to your needs. Experienced advocates, trusted counsel.": "为您量身定制的 premium 法律服务。资深律师，可信顾问。",
}

# ============================================================
# Helper: apply translation to HTML content
# ============================================================


def apply_translations(html_text, translations_for_template):
    """Apply all translations for a template to its HTML content."""
    result = html_text

    for old_text, new_text in translations_for_template.items():
        if old_text == new_text:
            continue
        if old_text in result:
            result = result.replace(old_text, new_text)
        else:
            # Try HTML-escaped version
            escaped_old = old_text.replace("&", "&amp;").replace("'", "&#39;").replace('"', "&quot;")
            if escaped_old != old_text and escaped_old in result:
                result = result.replace(escaped_old, new_text)
            else:
                # Try double-escaped
                double_escaped = old_text.replace("&", "&amp;amp;")
                if double_escaped != old_text and double_escaped in result:
                    result = result.replace(double_escaped, new_text)

    # Change lang attribute
    result = result.replace('<html lang="en"', '<html lang="zh-CN"')
    result = result.replace("<html lang='en'", "<html lang='zh-CN'")

    return result


def main():
    with open(
        os.path.join(os.path.dirname(__file__), "i18n_strings_to_translate.json"),
        "r",
        encoding="utf-8",
    ) as f:
        string_data = json.load(f)

    success_count = 0
    skip_count = 0
    error_count = 0

    for tid_str, fields in sorted(string_data.items(), key=lambda x: int(x[0])):
        tid = int(tid_str)
        filepath = os.path.join(WEGIC_DIR, str(tid), "index.html")

        if not os.path.exists(filepath):
            print(f"  [{tid}] FILE NOT FOUND - skipping")
            skip_count += 1
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            html_text = f.read()

        # Build translations for this template
        template_translations = {}
        for key, value in fields.items():
            if key.startswith("_"):
                continue
            if key == "inline_texts":
                # Handle inline text translations (list of dicts)
                for item in value:
                    template_translations[item["text"]] = item.get("translated", item["text"])
            else:
                # Direct field translation
                if value in TRANSLATIONS:
                    template_translations[value] = TRANSLATIONS[value]
                else:
                    print(f"  [{tid}] WARNING: No translation for '{key}': {value[:80]}...")

        # Apply translations
        new_html = apply_translations(html_text, template_translations)

        # Always change lang
        new_html = new_html.replace('<html lang="en"', '<html lang="zh-CN"')
        new_html = new_html.replace("<html lang='en'", "<html lang='zh-CN'")

        # Write back
        if new_html != html_text:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_html)
            success_count += 1
            print(f"  [{tid}] ✓ Applied {len(template_translations)} translations")
        else:
            print(f"  [{tid}] - No changes (may already be translated)")
            skip_count += 1

    print(f"\n=== Summary ===")
    print(f"Successfully translated: {success_count}")
    print(f"Skipped/no changes:   {skip_count}")
    print(f"Errors:               {error_count}")
    print(f"Total processed:      {success_count + skip_count + error_count}")


if __name__ == "__main__":
    main()
