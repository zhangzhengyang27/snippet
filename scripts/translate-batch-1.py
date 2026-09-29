#!/usr/bin/env python3
"""Final batch: per-template English text-node translations for ALL templates."""
import re, os

WEGIC = "/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic"

def safe_replace(html, en_sub, zh_full):
    pattern = rf'>([^<]*{re.escape(en_sub)}[^<]*)<'
    m = re.search(pattern, html)
    if m:
        return html.replace(m.group(0), f'>{zh_full}<')
    return html

# Per-template translation dict: template_id -> {english_text: chinese_text}
ALL = {
1: {
    "Urban水疗ce 开发商 CEO": "城市空间开发 CEO",
    "[ hello@structora.com ]": "[ hello@structora.com ]",
    "38914 Gow St, Ultimo, Pyrmont": "38914 Gow St, Ultimo, Pyrmont",
    "2009 Jerry 街拍": "2009 Jerry Street",
    "2187 Ivar Ave, Los Angeles,": "2187 Ivar Ave, 洛杉矶",
    "[BERLIN]": "[柏林]",
    "[MELBOURNE]": "[墨尔本]",
    "[NEW YORK]": "[纽约]",
    "Michael Reynolds": "Michael Reynolds",
},
2: {
    "Order Awaits": "静候您的订单",
    "订阅 and unlock 20% off your first purchase. Fresh roasts, delivered to your door.": "订阅即可享受首单八折优惠。新鲜烘焙，直送到家。",
    "免费 sample with every order": "每单赠送免费样品",
    "Offer expires in 24 hours": "优惠将于24小时后到期",
    "CLAIM MY DISCOUNT": "领取我的折扣",
    "No thanks, I'll pay full price": "不了谢谢，我按原价购买",
    "A BREWING": "匠心烘焙",
    "COFFEE 商店": "咖啡商城",
    "MAKE YOUR ORDER": "立即下单",
    "THE ORGANIC ADVANTAGE": "有机优势",
    "Pure ingredients for a healthier lifestyle": "纯净原料，健康生活",
    "Pure Source": "纯净源头",
    "100% organic beans from sustainable farms around the world": "来自全球可持续农场的100%有机咖啡豆",
    "Sustained Energy": "持久能量",
    "Natural caffeine boost without the crash or jitters": "天然咖啡因提神，无副作用",
    "Rich Antioxidants": "丰富抗氧化物",
},
3: {
    "Each collection embodies the intersection of form and function.": "每个系列都体现着形式与功能的交汇。",
    "Grain &amp; Grit presents our design ethos through minimalism and purpose.": "Grain &amp; Grit 以极简与目的性呈现我们的设计理念。",
    "GRAIN &amp; GRIT 版本 1.0.1": "GRAIN &amp; GRIT v1.0.1",
},
4: {
    "Hello, I'm a freelancer specializing in minimal design with 10 years of expertise — based in Tokyo, working remote. Let's create!": "您好，我是一名专注极简设计的自由职业者，拥有10年经验——常驻东京，远程工作。一起创作吧！",
    "Skincare Bottle": "护肤瓶",
    "奢华 Handbag": "奢华手袋",
    "咖啡 Packaging": "咖啡包装",
    "设计er Sunglasses": "设计师墨镜",
    "Know More": "了解更多",
    "I collaborate with businesses of all sizes worldwide, using the latest technologies. My designs have also earned multiple awards.": "我与全球各类规模的企业合作，使用最新技术。我的设计作品也获得过多项奖项。",
    "I'm dedicated to crafting beautiful and highly functional designs that seamlessly align with my clients' unique needs and long-term goals.": "我致力于打造美观且高度实用的设计，无缝契合客户的独特需求与长期目标。",
    "Let's bring something": "让我们一起创造",
    "extraordinary": "非凡之作",
    "to life!": "！",
    "加入 and start creating together.": "加入并开始共创。",
},
5: {
    "NUMEROUS": "NUMEROUS",
    "NUMEROUS®": "NUMEROUS®",
    "BRAND ESSENCE": "品牌精髓",
    "Packaging 设计": "包装设计",
    "WHO": "关于我们",
    "WE ARE A DIGITAL DESIGN STUDIO CRAFTING EXPERIENCES THAT ARE VISUALLY STUNNING AND STRATEGICALLY SOUND.": "我们是一家数字设计工作室，打造视觉惊艳且策略严谨的体验。",
    "We believe in the power of design to transform businesses. Our approach is collaborative, transparent, and driven by a passion for excellence. Whether it's a brand overhaul or a di": "我们相信设计的力量可以改变企业。我们的理念是协作、透明，以对卓越的热情为驱动。无论是品牌重塑还是数字化转型，我们都将创意与策略完美融合。",
    "Clients": "客户",
    "Tech 创业公司s": "科技创业公司",
    "时装 Brands": "时装品牌",
    "建筑 Firms": "建筑事务所",
    "Cultural Institutions": "文化机构",
    "hello@yourdesign.com": "hello@yourdesign.com",
    "Based in Digital 水疗ce": "立足于数字空间",
},
7: {
    "Classic Haircut": "经典剪发",
    "Precision cutting, styling, and a hot lather neck shave to finish.": "精剪造型，热泡沫颈部剃须完美收尾。",
    "Traditional straight razor shave with premium lather and hot towels.": "传统直剃刀剃须，搭配高级泡沫与热毛巾。",
    "Detailed trimming, shaping, and conditioning with our signature oils.": "精细修剪、造型与护理，搭配我们的招牌精油。",
    "Bold Brown Collection": "Bold Brown 系列",
    "Elevate your daily routine with our premium line of grooming essentials, crafted for the modern gentleman.": "用我们的高端理容必备系列提升您的日常，专为现代绅士打造。",
    "Amber &amp; Sandalwood": "琥珀与檀木",
    "Classic Pomade": "经典发油",
    "Firm Hold, Medium Shine": "强力定型，中度光泽",
    "Word on the 街拍": "客户口碑",
    '"The best hot towel shave I\'ve ever had. The atmosphere is incredible and the attention to detail is unmatched."': '"我体验过最好的热毛巾剃须。氛围令人惊叹，对细节的关注无与伦比。"',
    '"Their signature beard oil completely changed my grooming routine. Smells amazing and keeps my beard perfectly conditioned."': '"他们的招牌胡须油彻底改变了我的理容习惯。香气迷人，让我的胡须保持完美状态。"',
    '"A true classic barbershop experience. 专业, skilled barbers who know exactly what they\'re doing."': '"真正的经典理发店体验。专业、技艺精湛的理发师，清楚自己在做什么。"',
    'Bold Brown': 'Bold Brown',
},
8: {
    "Haute Coiffure": "高级发型",
    "Precision cutting, bespoke coloring, and transformative styling by master artisans.": "由大师级工匠提供的精剪、定制染发与焕然一新的造型。",
    "Rejuvenating massages and holistic therapies in our tranquil rose gold suites.": "在我们宁静的玫瑰金套房里享受焕活按摩与整体疗法。",
    "Nail Couture": "美甲定制",
    "Impeccable manicures and pedicures featuring luxury polishes and intricate artistry.": "无可挑剔的美甲与足部护理，采用奢华甲油与精湛工艺。",
    "Client Voices": "客户之声",
    "Words of 优雅": "优雅之声",
    '"The most luxurious salon experience I have ever had. The rose gold interior is stunning, and the service is impeccable."': '"我体验过最奢华的沙龙。玫瑰金内饰惊艳，服务无可挑剔。"',
    "Eleanor Vance": "Eleanor Vance",
    '"Aura transformed my hair completely. Their attention to detail and the serene atmosphere make every visit a retreat."': '"Aura 彻底改变了我的发型。他们对细节的关注和宁静的氛围让每次光临都成为一次休憩。"',
    "Sophia Laurent": "Sophia Laurent",
    '"From the moment you walk in, you are treated like royalty. The spa services are truly world-class."': '"从你进门的那一刻起，你就被当作皇室般对待。水疗服务真正是世界级的。"',
    "Isabella Chen": "Isabella Chen",
    "体验 the epitome of luxury and relaxation. Our rose gold sanctuary offers premium hair, beauty, and spa services tailored to your unique elegance.": "体验奢华与放松的极致。我们的玫瑰金殿堂提供为您独特优雅量身定制的高端美发、美容与水疗服务。",
},
9: {
    "Detailed beard trim, line-up, and conditioning treatment.": "精细胡须修剪、轮廓整理与护理。",
    "The Obsidian": "黑曜石",
    "Elixir": "精华油",
    "Our signature beard oil, crafted with a proprietary blend of argan, jojoba, and sandalwood. 设计ed to nourish, soften, and impart a subtle, masculine scent that lasts all day.": "我们的招牌胡须油，采用摩洛哥坚果油、荷荷巴油与檀香木的专有配方精心调制。旨在滋养、软化胡须，散发持久一整天的细腻阳刚气息。",
    "100% Natural Ingredients": "100% 天然成分",
    "Non-greasy formula": "无油腻配方",
    "专业版motes healthy growth": "促进健康生长",
    "The 体验": "极致体验",
    "More than just a haircut. A sanctuary for the modern man.": "不仅仅是理发。现代男士的圣地。",
    "高级版 men's grooming and barbershop. We blend traditional techniques with modern aesthetics to deliver an unparalleled grooming experience.": "高端男士理容与理发店。我们融合传统技艺与现代美学，提供无与伦比的理容体验。",
    "123 男士理容 Ave, Suite 100": "123 男士理容大道，100室",
    "hello@obsidian.com": "hello@obsidian.com",
    "© 2026 OBSIDIAN 理容. 版权所有。": "© 2026 OBSIDIAN 理容. 版权所有。",
},
10: {
    "Strategic editing and building of a versatile, high-impact professional wardrobe.": "战略性地编辑与构建多功能、高影响力的职业衣橱。",
    "高管 Styling": "高管造型",
    "个人ized styling for keynotes, board meetings, and high-stakes professional events.": "为主题演讲、董事会议和高规格职业活动提供个性化造型。",
    "Brand Alignment": "品牌一致",
    "Ensuring your personal presentation perfectly aligns with your corporate identity.": "确保您的个人形象与公司身份完美一致。",
    'Sarah Jenkins': 'Sarah Jenkins',
    "Chief 高管 Officer, TechNova": "首席高管，TechNova",
    "Elevating personal and professional brands through strategic image consulting, wardrobe curation, and executive presence coaching.": "通过战略形象咨询、衣橱规划与高管气场指导，提升个人与职业品牌。",
    "Wardrobe 咨询": "衣橱咨询",
    "个人 Styling": "个人造型",
    "© 2026 AURA 形象咨询. 版权所有。": "© 2026 AURA 形象咨询. 版权所有。",
    "设计ed for the modern professional.": "为现代专业人士而设计。",
},
11: {
    "发现 Your": "发现您的",
    "Style": "风格",
    "Expert image consulting to help you project confidence, authenticity, and timeless elegance in every aspect of your life.": "专业的形象咨询，帮助您在生活的每个方面展现自信、真实与永恒的优雅。",
    "Style is a reflection of your": "风格是您",
    "attitude": "态度",
    "and your personality.": "与个性的映射。",
    "At Aura, we believe that your image is your most powerful communication tool. We don't just change what you wear; we transform how you feel and how the world perceives you.": "在 Aura，我们相信您的形象是最有力的沟通工具。我们不只是改变您的穿着，而是转变您的感受方式和世界对您的认知。",
    "Whether you're stepping into a new executive role, navigating a life transition, or simply ready to refine your aesthetic, our bespoke consulting services are designed to align you": "无论您是步入新高管职位、经历人生转折，还是仅仅准备精进您的审美，我们的定制咨询服务旨在将您的内在力量与外在形象统一起来。",
    "Meet Your Consultant": "认识您的顾问",
    "Bespoke Styling 服务": "定制造型服务",
    "Comprehensive solutions tailored to your unique lifestyle, body architecture, and personal goals.": "为您独特的生活方式、身形结构与个人目标量身定制的全方位解决方案。",
    "发现 the precise palette of colors that harmonize with your natural undertones to make your skin glow and eyes pop.": "发现与您的自然肤色底色协调的精准色盘，让肌肤焕发光彩、眼眸熠熠生辉。",
    "A strategic review of your current closet to eliminate clutter, identify gaps, and create new combinations from existing pieces.": "对您现有衣橱进行战略审视，消除杂乱、发现空缺，从现有单品中创造全新搭配。",
    "个人 商店ping": "个人购物",
    "Curated shopping experiences designed to efficiently build a cohesive, versatile wardrobe that aligns with your personal brand.": "精心策划的购物体验，高效构建与您的个人品牌相契合的统一多变衣橱。",
    "The Aura Difference": "Aura 与众不同",
    "Strategic Approach": "战略理念",
    "We treat your wardrobe as an investment portfolio, ensuring every piece serves a distinct purpose.": "我们将您的衣橱视为投资组合，确保每件单品都服务于明确的目标。",
},
12: {
    "Sterling &amp; 合作伙伴": "Sterling &amp; 合作伙伴",
    "contact@sterlinglaw.com": "contact@sterlinglaw.com",
    "可用 全天候 for Emergency Consultations": "全天候紧急咨询可用",
    "STERLING": "STERLING",
    "&amp; Partners": "&amp; 合作伙伴",
    "Excellence in 法律 Representation": "卓越的法律代理",
    "Justice. Integrity.": "正义。正直。",
    "Sterling & Partners is a premier law firm dedicated to providing exceptional legal counsel and unwavering advocacy for our clients.": "Sterling & Partners 是一家顶尖律师事务所，致力于为客户提供卓越的法律顾问与坚定不移的辩护。",
    "Our 业务领域": "业务领域",
    "Unwavering Defense": "坚定辩护",
    "We protect your rights with aggressive, strategic representation tailored to your unique situation.": "我们以针对您独特情况而制定的强势策略性代理来保护您的权利。",
    "Balanced Counsel": "均衡顾问",
    "专业版viding objective, clear-sighted legal advice to help you navigate complex legal challenges.": "提供客观、洞见清晰的法律建议，帮助您应对复杂的法律挑战。",
    "Decades of combined experience delivering favorable outcomes in high-stakes litigation.": "数十年综合经验，在高风险诉讼中交付有利成果。",
    "关于 Our Firm": "关于本所",
    "A Legacy of 法律": "法律传承",
    "Excellence Since 1985": "始于1985的卓越",
    "At Sterling &amp; Partners, we believe that exceptional legal representation requires more than just knowledge of the law. It demands strategic thinking, meticulous preparation, an": "在 Sterling &amp; Partners，我们相信卓越的法律代理不仅需要法律知识，更需要战略思维、精心准备和对客户目标的深刻理解。我们的使命是在每次代理中维护正义与正直的最高标准。",
    "Our team of distinguished attorneys brings decades of experience across multiple disciplines, ensuring that whether you are facing a complex corporate dispute or a sensitive family": "我们杰出的律师团队带来跨多个学科的数十年经验，确保无论您是面对复杂的公司纠纷还是敏感的家族事务，都能获得最有能力、最富有同情心的法律顾问服务。",
    "发现 Our History": "了解我们的历史",
},
}

def apply_all():
    total = 0
    for tid, trans in sorted(ALL.items()):
        path = os.path.join(WEGIC, str(tid), 'index.html')
        if not os.path.exists(path): continue
        with open(path, encoding='utf-8') as f: html = f.read()
        count = 0
        for en, zh in sorted(trans.items(), key=lambda x: len(x[0]), reverse=True):
            if en == zh: continue
            if en in html:
                new_html = safe_replace(html, en, zh)
                if new_html != html:
                    html = new_html
                    count += 1
        if count:
            with open(path, 'w', encoding='utf-8') as f: f.write(html)
            total += count
            print(f'  [#{tid}] {count}')
    print(f'\nTotal: {total}')

apply_all()
