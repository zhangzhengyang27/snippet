#!/usr/bin/env python3
"""Batch 2: templates 13-30"""
import re, os
WEGIC = "/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic"

def safe_replace(html, en_sub, zh_full):
    pattern = rf'>([^<]*{re.escape(en_sub)}[^<]*)<'
    m = re.search(pattern, html)
    if m:
        return html.replace(m.group(0), f'>{zh_full}<')
    return html

ALL = {
13: {
    "STERLING &amp; CO.": "STERLING &amp; CO.",
    "关于 Firm": "关于律所",
    "Excellence in 公司法": "公司法卓越服务",
    "Clarity in": "化繁为",
    "Complexity.": "简。",
    "We provide strategic legal counsel to visionary enterprises, navigating the intricacies of corporate law with precision, integrity, and unwavering dedication.": "我们为有远见的企业提供战略法律顾问服务，以精准、正直与坚定不移的奉献精神驾驭公司法的复杂领域。",
    "Consult With Us": "咨询我们",
    "A legacy of trust, built on modern legal strategies.": "建立在现代法律策略之上的信任传承。",
    "At Sterling &amp; Co., we believe that exceptional legal representation requires more than just knowledge of the law. It demands a profound understanding of our clients' business o": "在 Sterling &amp; Co.，我们相信卓越的法律代理不仅需要法律知识，更需要深刻理解客户的业务目标、行业挑战与战略愿景。我们以现代简约的方式将每个案件化繁为简。",
    "Our minimalist approach to complex legal challenges ensures that we cut through the noise, delivering clear, actionable, and strategic advice that drives success.": "我们以极简方式应对复杂法律挑战，确保穿透纷扰，提供清晰、可执行且战略性的建议，推动客户走向成功。",
    "发现 Our Firm": "了解我们的律所",
    "— Managing Partner": "— 管理合伙人",
    "Focused practices for comprehensive solutions.": "专注的业务领域，全面的解决方案。",
    "查看全部 Areas": "查看全部领域",
    "Strategic counsel for mergers, acquisitions, and corporate governance.": "并购与公司治理的战略顾问。",
    "Aggressive representation in complex business disputes.": "复杂商业纠纷中的强势代理。",
    "专业版tecting and monetizing your most valuable assets.": "保护并变现您最有价值的资产。",
    "Navigating complex regulatory landscapes with confidence.": "自信驾驭复杂的监管环境。",
    "Ready to discuss your legal needs?": "准备好讨论您的法律需求了吗？",
},
14: {
    "免费 shipping on all orders over $150. 商店 the new Spring Collection.": "满$150包邮。选购全新春季系列。",
    "The Spring Collection": "春季系列",
    "优雅 in Every Detail": "每个细节尽显优雅",
    "Beauty": "美",
    "探索 our latest additions, carefully selected to bring a touch of soft elegance to your everyday life.": "探索我们的最新臻品，精心甄选，为您日常生活带来一抹柔美优雅。",
    "Pearl Drop Necklace": "珍珠吊坠项链",
    "Blush Leather Handbag": "腮红皮革手袋",
    "Rose Petal Perfume": "玫瑰花瓣香水",
    "Satin Ankle Heels": "缎面踝靴",
    "Celebrating the beauty of soft femininity.": "颂扬柔美女性之美。",
    "Blush &amp; Bloom was founded on the belief that elegance should be effortless. We curate collections that blend timeless silhouettes with modern sensibilities, always keeping a so": "Blush &amp; Bloom 创立于优雅理应不费力的信念之上。我们甄选融合经典廓形与现代审美的系列，始终保持柔和的粉色调。每件单品都精心挑选，使其品质与美感兼顾。",
    "Every piece in our boutique is selected for its quality, craftsmanship, and ability to make you feel beautiful inside and out.": "精品店中的每件单品都因其品质、工艺以及让您由内而外变美的能力而被选中。",
    "Sign up for our newsletter to receive 10% off your first order, early access to new collections, and exclusive styling tips.": "订阅我们的通讯，享受首单九折优惠、新系列优先访问及独家造型技巧。",
    "Curating elegance and sophistication for the modern woman. 发现 our collection of timeless fashion, delicate jewelry, and luxury beauty.": "为现代女性甄选优雅与精致。探索我们的经典时装、精致珠宝与奢华美容系列。",
    "定制er Care": "客户关怀",
    "加入 The 列表": "加入订阅列表",
    "© 2026 Blush &amp; Bloom. 版权所有。": "© 2026 Blush &amp; Bloom. 版权所有。",
},
15: {
    "EMBRACE THE": "拥抱",
    "DARKNESS": "暗黑之美",
    "发现 our latest collection of uncompromising luxury. Bold aesthetics crafted for the modern avant-garde.": "探索我们最新不妥协的奢华系列。为现代先锋打造的大胆美学。",
    "探索 Collection": "探索系列",
    "Iconic pieces that define the NOIR aesthetic. Meticulously crafted, unapologetically bold.": "定义 NOIR 美学的标志性单品。精心打造，毫无保留的大胆。",
    "Leather Goods": "皮具",
    "The Obsidian Tote": "黑曜石托特包",
    "Timepieces": "腕表",
    "Chronograph Noir": "黑色计时码表",
    "Ready to Wear": "成衣",
    "Midnight Silk Gown": "午夜真丝礼服",
    "Darkness": "暗黑之美",
    "At NOIR, we believe that true luxury lies in the absence of the superfluous. Our creations are born from a deep appreciation for stark contrasts, impeccable materials, and masterfu": "在 NOIR，我们相信真正的奢华在于摒弃多余。我们的创作源于对强烈对比、无瑕材质与精湛工艺的深刻欣赏。每件作品都是我们对大胆黑色美学的承诺——一种让形态、质感与廓形来讲述一切的永恒底色。",
    "Every piece is a testament to our commitment to the bold black aesthetic—a timeless canvas that allows form, texture, and silhouette to speak volumes.": "每件单品都是我们对大胆黑色美学承诺的见证——一幅让形态、质感与廓形讲述故事的不朽画布。",
    "订阅 to receive exclusive access to limited releases, private events, and the latest from the 品牌.": "订阅以获取限量发售、私人活动及品牌最新资讯的独家访问权限。",
    "Redefining modern luxury through bold aesthetics, uncompromising quality, and timeless design.": "以大胆美学、极致品质与永恒设计重新定义现代奢华。",
    "Boutique": "精品店",
    "Boutiques": "门店",
},
16: {
    "REDEFINE YOUR": "重新定义您的",
    "PRESENCE": "气场",
    "The ultimate grooming experience for the modern man. Precision cuts, expert beard care, and premium skincare in a bold, sleek environment.": "为现代男士打造的极致理容体验。精剪发型、专业胡须护理与高端护肤，尽在大胆精致的环境中。",
    "Master Barbers": "大师理发师",
    "Our team consists of elite professionals with years of experience in classic and contemporary men's styling.": "我们的团队由拥有多年经典与当代男士造型经验的精英专业人士组成。",
    "We exclusively use top-tier, luxury grooming products designed specifically for men's hair and skin.": "我们独家使用专为男士发质与肤质设计的顶级奢华理容产品。",
    "Efficient 奢华": "高效奢华",
    "体验 uncompromising quality without wasting your valuable time. Punctual, precise, and perfect.": "体验不妥协的品质，不浪费您的宝贵时间。准时、精准、完美。",
    "SIGNATURE": "招牌服务",
    "Elevate your routine with our specialized grooming treatments.": "以我们的专业理容护理提升您的日常。",
    "A tailored haircut designed for your face shape and lifestyle, finished with a straight razor neck shave and styling.": "为您脸型与生活方式量身定制的剪发，以直剃刀颈部修面与造型收尾。",
    "Beard Sculpt": "胡须塑形",
    "Detailed beard shaping, trimming, and conditioning, complete with a relaxing hot towel treatment and straight razor line-up.": "精细胡须塑形、修剪与护理，搭配放松热毛巾护理与直剃刀轮廓整理。",
    "Deep cleansing, exfoliation, and hydration specifically formulated for men's skin to combat fatigue and aging.": "专为男士肌肤配方的深层清洁、去角质与补水，对抗疲劳与衰老。",
    "CLIENT": "客户",
    "REVIEWS": "评价",
    '"The attention to detail here is unmatched. Best haircut and beard trim I\'ve ever had. The atmosphere is incredibly sleek."': '"这里对细节的关注无与伦比。我体验过最好的剪发与胡须修剪。氛围极为精致。"',
    '"Finally, a grooming clinic that understands modern men\'s needs. The executive facial is a game-changer before big meetings."': '"终于有一家理解现代男士需求的理容诊所了。高管面部护理在重要会议前是改变游戏规则的存在。"',
},
17: {
    "NEON": "霓虹",
    "PULSE": "脉动",
    "Tour": "巡演",
    "NeonPulse": "NeonPulse",
    'The new album "Cybernetic Pulse" is out now. 体验 the future of sound.': '全新专辑《Cybernetic Pulse》现已发布。体验声音的未来。',
    "列表en Now": "立即收听",
    "Get Tickets": "购票",
    "最新 Release": "最新发布",
    "Cybernetic Pulse": "Cybernetic Pulse",
    "A journey through neon-lit streets and digital landscapes. The highly anticipated third studio album pushes the boundaries of electronic music, blending retro-synthwave with modern": "一场穿越霓虹街道与数字景观的旅程。备受期待的第三张录音室专辑突破了电子音乐的边界，融合复古合成波与现代制作技术，创造出既怀旧又具未来感的声音。",
    "Neon Dreams": "霓虹之梦",
    "1.2M plays": "120万播放",
    "890K plays": "89万播放",
    "Midnight Synth": "午夜合成",
    "2.1M plays": "210万播放",
    "Digital Horizon": "数字地平线",
    "1.5M plays": "150万播放",
    "View Full Discography": "查看完整作品目录",
},
18: {
    "Bespoke Celebration Styling": "定制庆典造型",
    '"We 装饰ate, You Celebrate"': '"我们装饰，您只管庆祝"',
    "邮箱 Us to 开始使用": "邮件联系我们以开始",
    "We design boutique spaces, tailor gorgeous custom backdrops, and curate sophisticated table layouts, taking care of setup and teardown so you can fully enjoy your special event.": "我们设计精品空间，定制精美独有背景，精心策划精致的桌面布局，负责搭建与拆除，让您尽情享受特别的活动。",
    "Our Core 服务": "核心服务",
    "Entryways • Grand Entrances • 定制 颜色 Themes": "入口 • 壮观门廊 • 定制色彩主题",
    "Balloon Arches": "气球拱门",
    "Impactful entry arches, custom organic garlands, and stunning column installations built by hand.": "手工打造的震撼入口拱门、定制自然花环与惊艳立柱装置。",
    "Photo Booths • Main Stage • Neon Signage": "拍照亭 • 主舞台 • 霓虹标识",
    "返回drops &amp; Walls": "背景与墙面",
    "高级版 wood arch backdrops, balloon walls, and flower displays crafted to make perfect photoshoots.": "高端木拱背景、气球墙面与花艺展示，精心打造完美拍照场景。",
    "Dining Layouts • Dessert Buffets • 个人ized Accents": "用餐布局 • 甜品自助 • 个性化点缀",
    "Table Centerpieces": "桌面中心装饰",
    "Elegant custom balloon bouquets, artistic floral accents, and meticulously curated themed tablescapes.": "优雅定制气球花束、艺术花卉点缀与精心策划的主题桌面景观。",
    "Full 水疗ce Harmony • Concept 设计 • Absolute Ease": "全空间和谐 • 概念设计 • 绝对省心",
    "Full Room Styling": "全屋造型",
    "End-to-end event setup for birthdays, weddings, or corporate spaces, taking care of every tiny corner.": "生日、婚礼或企业空间的全包式活动布置，照顾每一个细节角落。",
},
19: {
    "Coral": "Coral",
    "Fiesta": "Fiesta",
    "Your Party, Your 水疗ce": "您的派对，您的空间",
    "Our Venue": "场地参观",
    "Packages &amp; 定价": "套餐与定价",
    "THE ULTIMATE PARTY VENUE": "终极派对场地",
    "UNLEASH THE VIBES.": "释放活力。",
    "YOUR EVENT,": "您的活动，",
    "AMPLIFIED.": "极致放大。",
    "Vibrant Private Event Venue. Perfect for Birthdays, 企业 Gatherings, Family Celebrations &amp; More.": "活力四射的私人活动场地。生日、企业聚会、家庭庆典等完美之选。",
    "Book Your 日期": "预约日期",
    "探索 Venue": "探索场地",
    "YOUR": "您的",
    "CANVAS": "画布",
    "AWAITS": "虚位以待",
    "Whether it's an intimate gathering or a full-on bash, we customize our vibrant space to make your milestone unforgettable.": "无论是亲密聚会还是盛大庆典，我们定制活力空间，让您的重要时刻难以忘怀。",
    "Fun &amp; Bold": "趣味与大胆",
    "Blow out the candles in style! From themed kid bashes to epic adult milestones, we set the stage for major fun.": "时尚地吹灭蜡烛！从主题儿童派对到史诗级成人里程碑，我们为极致乐趣搭建舞台。",
    "Book Birthday": "预约生日派对",
},
20: {
    "Little Sprout": "Little Sprout",
    "Academy": "托育园",
    "Parent Info": "家长信息",
    "Book a Tour": "预约参观",
    "Where Little Minds 增长 Big": "小小头脑，大大成长",
    "Nurturing Curiosity.": "培育好奇心。",
    "Inspiring Joy.": "激发快乐。",
    "Watch 品牌故事": "观看品牌故事",
    "A Place to 学习, 播放 &amp; 增长 Together": "一同学习、玩耍与成长的地方",
    "We blend play-based learning with kindness, creativity, and structured growth to support every single developmental step of your child.": "我们将基于游戏的学习与善良、创造力和结构化成长相结合，支持孩子发展的每一步。",
    "Our Focus": "我们的重点",
    "Holistic 专业版gress": "全面发展",
    "Our Core 课程": "核心课程",
    "Carefully tailored curricula for every growing milestone": "为每个成长里程碑精心定制的课程",
    "Infants": "婴儿",
    "Loving care, cozy sensory play, and personal development tracking.": "爱心护理、温馨感官游戏与个人发展追踪。",
    "Toddlers": "幼儿",
    "Independence building, verbal motor skills, and happy peer play.": "独立性培养、语言运动技能与快乐同伴游戏。",
    "学前班ers": "学龄前儿童",
},
}

def apply(tid, trans):
    path = os.path.join(WEGIC, str(tid), 'index.html')
    if not os.path.exists(path): return 0
    with open(path, encoding='utf-8') as f: html = f.read()
    count = 0
    for en, zh in sorted(trans.items(), key=lambda x: len(x[0]), reverse=True):
        if en == zh: continue
        if en in html:
            new_html = safe_replace(html, en, zh)
            if new_html != html:
                html = new_html; count += 1
    if count:
        with open(path, 'w', encoding='utf-8') as f: f.write(html)
    return count

total = 0
for tid, trans in sorted(ALL.items()):
    c = apply(tid, trans)
    if c: print(f'  [#{tid}] {c}'); total += c
print(f'\nTotal: {total}')
