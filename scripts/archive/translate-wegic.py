import re, os

BASE = '/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic'

# Comprehensive English → Chinese translation map
T = {
    # === NAVIGATION ===
    '• Services': '• 服务',
    '• Projects': '• 项目',  
    '• Contact': '• 联系',
    'Services': '服务',
    'Projects': '项目',
    'Contact': '联系',
    'Contact Us': '联系我们',
    'Navigation': '导航',
    'Quick Links': '快速链接',
    'About': '关于',
    '• About': '• 关于',
    'License': '许可协议',
    'HOME': '首页',
    'CONTACT': '联系',
    'DISCOVER': '发现',
    'SHOP': '商城',
    'About Us': '关于我们',
    'WHO': '关于',

    # === HERO / CTA ===
    'Build Your': '塑造您的',
    'Vision Inspire': '愿景 激发灵感',
    'Build your': '打造您的',
    'sustainable peace': '可持续宁静空间',
    "Let's build your": '让我们一起打造您的',
    'extraordinary vision': '非凡愿景',
    'extraordinary': '非凡',
    "Let's bring something": "让我们一起创造",
    'to life!': '！',
    'Get Started Now': '立即开始',
    'Get Started': '开始使用',
    'Subscribe Now': '立即订阅',
    'Subscribe': '订阅',
    'SUBSCRIBE': '订阅',
    'Join': '加入',
    'Sign In': '登录',
    'Book A Free Appointment': '预约免费咨询',
    'Learn More': '了解更多',
    'LEARN MORE': '了解更多',
    'Show More': '查看更多',
    'Know More': '了解更多',
    "Let's Talk": '联系我们',

    # === SECTIONS ===
    'Our Services': '我们的服务',
    'Our Works': '我们的作品',
    'Our Story': '我们的故事',
    'OUR STORY': '我们的故事',
    'OUR STORY': '品牌故事',
    'Our Menu': '我们的菜单',
    'Why Choose Us': '为什么选择我们',
    'Our People': '我们的团队',
    'Quality Assurance': '品质保障',
    'Committed Advisory': '专业顾问服务',
    'Customer Centric': '以客户为中心',
    'Testimonials': '客户评价',
    'Newsletter': '邮件订阅',
    'Portfolio': '作品集',
    'SELECTED WORK': '精选作品',
    'Featured Collections': '精选系列',
    'Collections': '系列',
    'Social': '社交',
    'Socials': '社交媒体',
    'Clients': '客户',
    'Location': '位置',
    'WORK': '作品',
    'STUDIO': '工作室',
    'CONTACT': '联系',

    # === DESCRIPTIONS ===
    'Crafting visionary spaces with precision and artistry. Elevate your architecture with cutting-edge design and innovation.':
        '以精准与艺术打造富有远见的空间，用尖端设计与创新提升您的建筑品质。',
    'Creating innovative and functional spaces that blend aesthetics with purpose. We ensure every detail matches your vision.':
        '打造兼具美学与实用功能的创新空间，确保每一处细节都与您的愿景完美契合。',
    'Crafting visionary spaces with precision and artistry. Elevate your architecture.':
        '以精准与艺术打造富有远见的空间，提升您的建筑品质。',
    'Turn your vision into reality with our expertise in architecture and design. Connect with us today.':
        '借助我们在建筑与设计领域的专业能力，将您的愿景变为现实。立即联系我们。',

    # === TESTIMONIALS ===
    '"Working with Structora was an incredible experience. Their attention to detail and innovative designs brought our vision to life. The team\'s expertise transformed our space into a perfect blend of aesthetics and functionality."':
        '"与 Structora 的合作是一段非凡的体验。团队对细节的关注与创新的设计将我们的愿景变为现实，专业能力让我们的空间完美融合了美学与功能性。"',

    # === FOOTER ===
    '© 2025 Structora All Rights Reserved Powered by Wegic.':
        '© 2025 Structora 版权所有 由 Wegic 提供技术支持。',
    'All Rights Reserved': '版权所有',
    'Privacy Policy': '隐私政策',
    'Terms of Service': '服务条款',
    'Based in Digital Space': '立足数字空间',

    # === TEMPLATE 2: COFFEE SHOP ===
    'MOCHAR': 'MOCHAR',
    'MOCHAR | Organic Coffee Roasters': 'MOCHAR | 有机咖啡烘焙工坊',
    'Welcome to MOCHAR': '欢迎来到 MOCHAR',
    'Pure Source': '纯粹来源',
    'Dark &amp; Bold': '深烘 &amp; 浓郁',
    'Medium &amp; Balanced': '中烘 &amp; 均衡',
    'Light &amp; Fruity': '浅烘 &amp; 果香',
    'OUR SIGNATURE BLENDS': '我们的招牌拼配',
    'HEALTH BENEFITS': '健康益处',
    'Rich Antioxidants': '丰富抗氧化物',
    'Natural Boost': '自然提神',
    'Sustained Energy': '持久能量',
    'Mental Clarity': '头脑清晰',
    'Heart Health': '心脏健康',
    'THE ORGANIC ADVANTAGE': '有机的优势',
    '100% organic beans from sustainable farms around the world': '100% 来自全球可持续农场的有机咖啡豆',
    'Pure ingredients for a healthier lifestyle': '纯净原料，健康生活',
    'Packed with nutrients that support overall wellness': '富含支持全身健康的营养成分',
    'Carefully roasted to perfection': '精心烘焙至完美',
    'Clean energy throughout the day': '全天持续精力充沛',
    'Supports cardiovascular wellness': '有益心血管健康',
    'Enhances focus and concentration': '提升注意力与专注力',
    'Natural caffeine boost without the crash or jitters': '咖啡因自然提神，无后续疲惫感',
    'CAFE MENU': '咖啡菜单',
    'A BREWING': '一杯',
    'COFFEE SHOP': '咖啡工坊',
    'SUNRISE ROAST': '晨曦烘焙',
    'MOUNTAIN FRESH': '山间清新',
    'EVENING DREAM': '暮光之梦',
    'MAKE YOUR ORDER': '下单点餐',
    'Order Awaits': '等待您的订单',
    'Order Online': '在线下单',
    'SHOP BEANS': '购买咖啡豆',
    'Shop Beans': '购买咖啡豆',
    'Your First': '您的首单',
    'Limited Time Offer': '限时优惠',
    'CLAIM MY DISCOUNT': '领取我的折扣',
    'Offer expires in 24 hours': '优惠将在 24 小时后过期',
    'Free sample with every order': '每单附赠样品',
    "No thanks, I'll pay full price": '不了，我按原价购买',
    'CATCH US HERE': '来这里找我们',
    'Daily: 7am - 8pm': '每日: 早 7 点 - 晚 8 点',
    'Get Directions': '获取路线',
    '123 Coffee Lane, Brew City, CA 90210': '加利福尼亚州 Brew 市咖啡巷 123 号',
    'Crafting the perfect cup with organic, sustainably sourced beans. Taste the difference in every sip.':
        '用有机可持续采购的咖啡豆精心制作每一杯，品味每一口的独特魅力。',
    'Subscribe and unlock 20% off your first purchase. Fresh roasts, delivered to your door.':
        '订阅即可享受首单 8 折优惠。新鲜烘焙，送货上门。',
    'Subscribe for updates and 10% off your first order.':
        '订阅更新，首单即享 9 折优惠。',
    '"THE BEST COFFEE EXPERIENCE I\'VE EVER HAD"':
        '"我体验过的最好的咖啡"',
    '- ANNA L.': '- ANNA L.',
    '© 2024 MOCHAR Coffee. All rights reserved.':
        '© 2024 MOCHAR 咖啡 版权所有。',

    # === TEMPLATE 3: STREETWEAR/FASHION ===
    'GRAIN &amp; GRIT | Urban Streetwear': 'GRAIN &amp; GRIT | 都市街头服饰',
    'GRAIN &amp; GRIT v.1.0.1': 'GRAIN &amp; GRIT v.1.0.1',
    'Grain &amp; Grit': 'Grain &amp; Grit',
    'Structured Outerwear': '结构感外套',
    'Oversized Essentials': '宽松必备款',
    'Minimalist comfort redefined': '重新定义极简舒适',
    'Join the Movement': '加入我们',
    'We believe in timeless design that transcends seasonal trends.':
        '我们坚信超越季节性潮流的永恒设计。',
    'Each collection embodies the intersection of form and function.':
        '每个系列都体现了形式与功能的完美交融。',
    'Dynamic energy captured in every frame.':
        '每一帧都捕捉着动感能量。',
    'Movement defines our approach to modern streetwear.':
        '运动定义了我们对现代街头服饰的理解。',
    'Redefining streetwear through minimalist design and authentic craftsmanship.':
        '通过极简设计与真诚工艺重新定义街头服饰。',
    "We're a design studio focused on creating simple, purposeful, and timeless solutions.":
        '我们是一家专注于创造简洁、有目的性、永恒方案的设计工作室。',
    'We focus on simplicity —': '我们专注于简约 —',
    'We value craftsmanship': '我们珍视工艺',
    'We build on concept —': '我们基于概念构建 —',
    'We embrace purposeful design —': '我们拥抱有目的的设计 —',
    'Urban landscapes as our canvas.': '以城市景观为画布。',
    'Subscribe to receive updates on new releases and editorial content.':
        '订阅以获取新品发布与编辑内容更新。',
    'Form meets function': '形式与功能的相遇',
    '© 2024 Grain &amp; Grit. All rights reserved.':
        '© 2024 Grain &amp; Grit 版权所有。',
    'Photography: Studio Noir —': '摄影: Studio Noir —',
    'Photography by Studio Noir —': '摄影由 Studio Noir —',
    'Art Direction: M. Chen —': '艺术指导: M. Chen —',
    'Styling: J. Martinez —': '造型: J. Martinez —',
    'Model: Alexandra K.': '模特: Alexandra K.',
    'Concept: Motion &amp; Stillness': '概念: 运动 &amp; 静止',
    'Location: Urban District —': '地点: 城市街区 —',
    'info@grainandgrit.com': 'info@grainandgrit.com',

    # === TEMPLATE 4: DESIGNER PORTFOLIO ===
    'YUYA': 'YUYA',
    'CREATIVE': '创意',
    'DESIGNER': '设计师',
    'Design Studio | Creative Portfolio': '设计工作室 | 创意作品集',
    'I collaborate with businesses of all sizes worldwide, using the latest technologies. My designs have also earned multiple awards.':
        '我与全球各类规模的企业合作，使用最新技术。我的设计作品曾多次获奖。',
    "Hello, I'm a freelancer specializing in minimal design with 10 years of expertise — based in Tokyo, working remote. Let's create!":
        '您好，我是一名专注于极简设计的自由设计师，拥有 10 年经验 — 坐标东京，远程工作。让我们一起创作吧！',
    "I'm dedicated to crafting beautiful and highly functional designs that seamlessly align with my clients' unique needs and long-term goals.":
        '我致力于打造美观且高度实用的设计，无缝契合客户的独特需求与长期目标。',
    'Join and start creating together.': '加入我们，共同创作。',
    'about.': '关于。',
    'work.': '作品。',
    'contact.': '联系。',
    'hello@studio.com': 'hello@studio.com',

    # === TEMPLATE 5: DESIGN STUDIO ===
    'NUMEROUS': 'NUMEROUS',
    'NUMEROUS®': 'NUMEROUS®',
    'Numerous® | Design Studio Portfolio': 'Numerous® | 设计工作室作品集',
    'WE ARE A DIGITAL DESIGN STUDIO CRAFTING EXPERIENCES THAT ARE VISUALLY STUNNING AND STRATEGICALLY SOUND.':
        '我们是一家数字设计工作室，打造视觉震撼且策略精准的体验。',
    'A design studio shaping brands and digital experiences through motion, clarity, and timeless craft.':
        '一个通过动感、清晰和永恒工艺塑造品牌与数字体验的设计工作室。',
    "We believe in the power of design to transform businesses. Our approach is collaborative, transparent, and driven by a passion for excellence. Whether it's a brand overhaul or a digital product, we bring clarity and creativity to every project.":
        '我们相信设计的力量能够改变企业。我们的方法是协作的、透明的，以追求卓越的热情为驱动。无论是品牌重塑还是数字产品，我们为每个项目注入清晰与创意。',
    'MOMENTUM': '动势',
    'PURE FORM': '纯粹形态',
    'TYPE MATTERS': '字体即是力量',
    'BRAND ESSENCE': '品牌本质',
    'SELECTED WORK': '精选作品',
    'UI/UX Design': 'UI/UX 设计',
    'Art Direction': '艺术指导',
    'Brand Identity': '品牌识别',
    'Brand Campaign': '品牌活动',
    'Web Development': '网站开发',
    'Packaging Design': '包装设计',
    'Editorial Design': '编辑设计',
    'Working Globally': '全球协作',
    'Tech Startups': '科技初创公司',
    'Fashion Brands': '时尚品牌',
    'Architecture Firms': '建筑设计公司',
    'Cultural Institutions': '文化机构',
    '© 2026 Design Studio. All rights reserved.': '© 2026 设计工作室 版权所有。',
    '© 2026 MÖBIUS Design Studio': '© 2026 MÖBIUS 设计工作室',
    'hello@yourdesign.com': 'hello@yourdesign.com',
    'Based in Digital Space': '立足数字空间',

    # === COMMON WORDS ===
    'Design': '设计',
    'design': '设计',
    'Architectural': '建筑',
    'View Project': '查看项目',
    'View All Works ↗': '查看全部作品 ↗',
    'Eco Retreats Villas': '生态度假别墅',
    'Luxury': '奢华',
    'Instagram': 'Instagram',
    'LinkedIn': 'LinkedIn',
    'Facebook': 'Facebook',
    'Twitter': 'Twitter',
    'Behance': 'Behance',
    'Dribbble': 'Dribbble',
    'OFF': '优惠',
    'Product Photography': '产品摄影',
    'Fashion Photography': '时尚摄影',
    'Accessories Photography': '配饰摄影',
    'Luxury Handbag': '奢华手袋',
    'Skincare Bottle': '护肤品瓶身',
    'Coffee Packaging': '咖啡包装',
    'Designer Sunglasses': '设计师墨镜',

    # === ALT TEXTS ===
    'alt="Luxury Villa"': 'alt="豪华别墅"',
    'alt="Eco Retreats"': 'alt="生态度假村"',
    'alt="Thumb"': 'alt="缩略图"',
    'alt="Sustainability"': 'alt="可持续性"',
    'alt="Detail"': 'alt="细节"',
}

def extract_and_translate(filepath):
    with open(filepath) as f:
        html = f.read()

    # Clean script/style/svg tags
    cleaned = re.sub(r'<(script|style|svg|path|circle|rect|line|polygon|polyline|ellipse)\b[^>]*>[\s\S]*?</\1>', '', html)
    cleaned = re.sub(r'<(script|style|svg|path|circle|rect|line|polygon|polyline|ellipse)\b[^>]*/>', '', cleaned)

    # Find all text nodes
    texts = re.findall(r'>([^<>]+)<', cleaned)
    untranslated = []
    for t in texts:
        t_stripped = t.strip()
        if not t_stripped or len(t_stripped) < 2: continue
        if re.match(r'^[\d\s.,;:!?\-–—()\[\]{}/\\"\']+$', t_stripped): continue
        if re.match(r'^[.,/\-+=*&#@!%^~{}|[\]();:\s]+$', t_stripped): continue
        if not re.search(r'[a-zA-Z]{2,}', t_stripped): continue
        full = t_stripped if t_stripped == t else t_stripped
        if full not in T:
            untranslated.append(full)

    return untranslated

# Apply translations to all files
processed = 0
for num in range(1, 103):
    fpath = os.path.join(BASE, str(num), 'index.html')
    try:
        with open(fpath) as f:
            html = f.read()

        changes = 0
        for en, zh in T.items():
            count = html.count(en)
            if count > 0:
                html = html.replace(en, zh)
                changes += count

        if changes > 0:
            with open(fpath, 'w') as f:
                f.write(html)
            untranslated = extract_and_translate(fpath)
            status = f"✅ {changes} changes"
            if len(untranslated) < 80:
                status += f", {len(untranslated)} remaining"
            print(f"  {num}: {status}")
        else:
            print(f"  {num}: ⏭️ no matches")

        processed += 1
    except Exception as e:
        print(f"  {num}: ❌ {e}")

print(f"\n📊 Processed: {processed}/102")
