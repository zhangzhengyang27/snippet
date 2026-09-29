#!/usr/bin/env python3
"""
Text-node safe batch translator for Wegic templates.
Only replaces text between > and <, never touches attributes/JS/CSS.
"""

import re, os

WEGIC = "/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic"

# Translation map: English_substring → Full Chinese replacement
# The script finds >...substring...< and replaces the entire text node
TR = {
    # ==== High-frequency across many templates ====
    "Hero Background": "主视觉背景",
    "Lumina Logo": "Lumina 标志",
    "Meet The Artist": "认识艺术家",
    
    # Photography templates
    "Capturing the Poetry of Light": "捕捉光影诗意",
    "Golden Hour Vows": "金色誓言",
    "Neon Nights": "霓虹之夜",
    "Vogue Silhouette": "时尚剪影",
    "We don't just take photographs; we craft visual legacies": "我们不仅拍摄照片，更是打造超越时间的视觉遗产",
    "A curated collection of our most recent and celebrated photographic stories": "我们最新最受欢迎的摄影故事精选集",
    "Capturing life's most precious moments with elegance and authenticity": "以优雅与真实捕捉生命中最珍贵的瞬间",
    "Based in New York, available worldwide": "立足纽约，服务全球",
    "Based in Los Angeles, available worldwide": "立足洛杉矶，服务全球",
    "Our approach is rooted in authenticity and artistic vision": "我们的理念植根于真实与艺术视野",
    "Award-winning photography studio specializing in editorial, portrait, and fine art wedding photography": "屡获殊荣的摄影工作室，专注于商业摄影、人像及艺术婚礼摄影",
    
    # Furniture/Interior
    "A study in balance": "平衡之美——利落的线条、柔和的曲线与天然材料和谐相融，打造沉稳而高雅的作品",
    "Timeless furniture for meaningful living": "为有意义的生活而生的永恒家具",
    "Timeless furniture for meaningful living. Crafted with care, inspired by nature": "为有意义的生活而生的永恒家具。精心打造，源于自然，为您的家而生",
    "Thoughtful pieces that stand the test of time": "经得起时间考验的用心之作",
    "Explore our journal for stories": "浏览我们的日志，探索正念生活、室内灵感与慢节奏家居设计的美好",
    "Be the first to hear about new collections": "第一时间了解新系列、设计师特辑与独家季节产品",
    "The Beauty of Imperfection": "不完美之美：侘寂家居美学",
    "5 Ways to Create a Calm and Cozy": "打造宁静温馨客厅的 5 种方式",
    "A Guide to Choosing Solid Wood": "实木家具选购指南",
    "The quality, the craftsmanship, the beautiful natural materials": "品质、工艺、精美的天然材料——你能从每一件作品中感受到那份热爱",
    "Our approach honors the Japanese concept of wabi-sabi": "我们的理念致敬日本侘寂美学——在不完美与无常中发现美。天然木纹、手工编织的纤维与独特的变化，让每一件作品都独一无二",
    "We believe that great design tells a story": "我们相信，好的设计讲述着自然、传统与背后匠人的故事。每件作品都由技艺精湛的工匠以可持续材料精心打造",
    "more about us": "了解更多",
    "Hygge Lounge Chair": "Hygge 休闲椅",
    "Sabi Dining Chair": "Sabi 餐椅",
    "Elysian Wool Rug": "Elysian 羊毛地毯",
    "The Kina Collection": "Kina 系列",
    "The Kina Sideboard": "Kina 边柜",
    
    # Spa/Wellness
    "Restore. Renew. Reconnect": "修复。焕新。重连。",
    "Swedish Massage": "瑞典式按摩",
    "Signature Facial": "招牌面部护理",
    "Botanical Body Wrap": "植物身体裹敷",
    "Serenity Spa & Wellness is a warm, welcoming day spa": "Serenity 水疗与康体中心是一家温馨宜人的日间水疗，提供个性化按摩、面部与身体护理体验",
    "Holistic Healing": "整体疗愈",
    "Deep Tissue": "深层组织按摩",
    "Hot Stone": "热石疗法",
    "Aromatherapy": "芳香疗法",
    
    # Dental
    "Radiant Smile Studio": "Radiant Smile 牙科诊所",
    "Boutique Cosmetic": "精品美容牙科",
    "Teeth Whitening": "牙齿美白",
    "Porcelain Veneers": "瓷贴面",
    "Invisalign": "隐适美",
    "Smile Makeover": "微笑改造",
    "Anxiety-Free Dentistry": "无焦虑牙科",
    "Dr. Emily Carter": "Emily Carter 医生",
    "Transform your smile": "焕新您的微笑——在温馨舒适的诊所里享受世界级美容牙科治疗",
    "Your comfort is as important as your final smile": "您的舒适与最终的笑容同样重要",
    
    # Coaching/Training
    "CT Executive Training": "CT 高管培训",
    "Executive Leadership": "高管领导力",
    "Strategic Management": "战略管理",
    "Advanced Negotiation": "高级谈判",
    "Elevate your executive impact": "以世界级企业培训课程提升您的高管影响力",
    "Coachify": "Coachify",
    "Build a 6-Figure Personal Brand": "90 天打造六位数个人品牌",
    "The proven 90-day system": "经过验证的 90 天系统——为数字专家、顾问及教练打造的无需昂贵代理即可吸引高端客户的方法",
    
    # Real Estate
    "James Hartwell": "James Hartwell",
    "Austin Real Estate": "奥斯汀房产",
    "12+ years of local expertise": "12 年以上本地经验，127 套以上房屋成交，4.9 星好评",
    
    # Legal
    "Sterling & Partners": "Sterling & Partners",
    "Sterling & Co": "Sterling & Co",
    "Premier Law Firm": "顶尖律师事务所",
    "Corporate Law": "公司法",
    "Family Law": "家庭法",
    "Real Estate Law": "房地产法",
    "Criminal Defense": "刑事辩护",
    "Commercial Litigation": "商业诉讼",
    "Lex Advisors": "Lex Advisors",
    "General Practice": "综合法律",
    "Premium legal services tailored to your needs": "为您量身定制的高端法律服务。资深律师，值得信赖的法律顾问",
    
    # Construction
    "BuildCore": "BuildCore",
    "Professional Construction": "专业建筑服务",
    "Commercial Construction": "商业建筑",
    "Residential Construction": "住宅建造",
    "Civil Engineering": "土木工程",
    "Building your vision with precision": "以精准工艺筑就您的愿景",
    
    # Tech/SaaS
    "NexusCorp": "NexusCorp",
    "NexusBiz": "NexusBiz",
    "Modern Business Solutions": "现代企业解决方案",
    "Digital Transformation": "数字化转型",
    "Strategic Consulting": "战略咨询",
    "AI Payroll": "AI Payroll",
    "Global Compensation": "全球薪酬",
    "Future-proof your payroll": "以智能自动化全球薪酬软件为您的薪酬体系保驾护航",
    
    # Food/Coffee
    "MOCHAR": "MOCHAR",
    "Organic Coffee Roasters": "有机精品咖啡烘焙",
    "Burivers": "Burivers",
    "Classic 1950s Burger": "经典 1950 年代风格汉堡",
    "CUP CULT": "CUP CULT",
    "Your Obsession. Your Hydration": "你的执念，你的补水",
    "Stay Weird": "保持独特",
    
    # Wedding
    "Emma & James": "Emma 与 James",
    "Eleanor & James": "Eleanor 与 James", 
    "We are getting married": "我们要结婚了",
    "Joyfully Accept": "欣然接受",
    "Regretfully Decline": "遗憾婉拒",
    "The Ceremony": "典礼详情",
    "The Reception": "婚宴详情",
    
    # Church
    "Grace Church": "Grace Church",
    "A Place to Belong": "归属之地",
    "Faith, Hope, and Love": "信、望、爱",
    "Sunday Worship": "主日崇拜",
    "Sermons": "讲道信息",
    "Community Outreach": "社区关怀",
    
    # Daycare
    "Little Sprout Academy": "Little Sprout 托育园",
    "Warm Orange Daycare": "Warm Orange 托育园",
    "Sunny Steps": "Sunny Steps",
    "A bright, safe, and loving daycare": "明亮、安全而充满爱心的托育园，让每个孩子按自己的节奏茁壮成长",
    "Schedule a Tour": "预约参观",
    
    # Party/Events
    "Coral Fiesta": "Coral Fiesta",
    "Ignite Events": "Ignite Events",
    "Lumina Events": "Lumina Events",
    "Bold & Vibrant Party Planning": "大胆活力派对策划",
    "Private Party Venue": "私人派对场地",
    "Fully equipped event space": "设施齐全的活动空间——入场即开启您的庆典",
    
    # Fashion
    "NOIR Maison": "NOIR Maison",
    "Blush & Bloom": "Blush & Bloom",
    "MAISON ELARA": "MAISON ELARA",
    "GRAIN & GRIT": "GRAIN & GRIT",
    "Urban Streetwear": "都市潮流街头服饰",
    "Embrace the Darkness": "拥抱暗黑优雅",
    
    # Grooming/Barber
    "Bold Brown": "Bold Brown",
    "Classic Men's Grooming": "经典男士理容",
    "Hot Towel Shave": "热毛巾剃须",
    "Precision Cut": "精剪造型",
    "Beard Sculpting": "胡须造型",
    "The premier destination for the modern man": "现代男士的首选之地——大胆、深邃而精致的理容服务",
    
    # Portfolio/Resume
    "Maya Chen": "Maya Chen",
    "Nora Vane": "Nora Vane",
    "Alex Rivera": "Alex Rivera",
    "Freelance Writer": "自由撰稿人",
    "Brand Storyteller": "品牌故事讲述者",
    "Content Strategist": "内容策略师",
    "Operations & Strategy Leader": "运营与战略负责人",
    "6 years of turning chaotic processes": "6 年将混沌流程转化为高效系统的经验。常驻旧金山",
    
    # Agent/Broker
    "Urban Living": "Urban Living",
    "Premium Real Estate in Amsterdam": "阿姆斯特丹高端房产",
    "Elevating urban living for first-time buyers": "以无可匹敌的本地专业经验为阿姆斯特丹首购者、投资者及奢华追求者提升都市生活品质",
    
    # Various businesses
    "Electric Bloom": "Electric Bloom",
    "Cyberpunk Indie Pop": "赛博朋克独立流行",
    "Where Neon Meets Sound": "霓虹与声音在此交汇——沉浸在合成波赛博流行音乐的世界中",
    "The Slow Travel Manifesto": "慢旅行宣言",
    "WanderFolio": "WanderFolio",
    "Why rushing through ten countries": "为什么匆匆穿越十个国家正在扼杀你的灵感——拥抱正念探索的方式",
    "AffiliateBoost": "AffiliateBoost",
    "Build Profitable Affiliate Websites": "更快打造盈利型联盟营销网站",
    "WixBuilder": "WixBuilder",
    "Create a Website Without Limits": "无限制创建网站——拖拽式平台即刻打造您的梦想网站",
    "CODOT": "CODOT",
    "The Premier Community for Visionary Creators": "远见创作者首选社区——连接、启发与成长的结构化数字圣地",
    "LinkForge": "LinkForge",
    "Aegis Archives": "Aegis Archives",
    "Secure Document Storage": "安全文档存储与数字归档",
    "PeptiCore": "PeptiCore",
    "ADULT": "ADULT",
    "Mastering the Art of Adulthood": "精通成人生活艺术",
    "Proxima": "Proxima",
    "Professional Business Website": "专业企业网站模版",
    
    # Common section labels
    "Kind Words": "好评如潮",
    "What our customers say": "客户好评",
    "Read Our Full Story": "阅读完整故事",
    "Book Your Session": "预约您的服务",
    "Inquire Now": "立即咨询",
    "Send Inquiry": "发送咨询",
    "Get in Touch Today": "立即联系我们",
    "Schedule Consultation": "预约咨询",
    "Book Appointment": "预约",
    "Read Article": "阅读全文",
    "Request a Quote": "获取报价",
    "Enroll Now": "立即报名",
    "Start Planning": "开始策划",
    "Lightning Fast": "极速高效",
    "Global Reach": "全球覆盖",
    "Data-Driven": "数据驱动",
    "Curated Selection": "精选甄选",
    "Flawless Execution": "完美执行",
    "Secure & Reliable": "安全可靠",
    "Elevate Your Brand": "提升您的品牌",
    "Elevate Your Style": "提升您的风格",
    "Care Guide": "保养指南",
    "Size Guide": "尺码指南",
    "Help Center": "帮助中心",
    "Terms of Use": "使用条款",
    "Disclaimer": "免责声明",
    "Reviews": "客户评价",
    "Moments": "精彩瞬间",
    "Socials": "社交平台",
    "Infant Care": "婴儿保育",
    "Our Programs": "我们的课程",
    "Web Design": "网页设计",
    "Follow us on Instagram": "关注我们的 Instagram",
    "Open main menu": "打开主菜单",
    "View Full Portfolio": "查看完整作品集",
    "Explore Full Portfolio": "浏览完整作品集",
    "Join the Inner Circle": "加入核心圈",
    "Elevate Your Presence": "提升您的职业气场",
    "Areas of Expertise": "专业领域",
    "Proven Track Record": "成功案例",
    "Regulatory Compliance": "合规监管",
    "Color Analysis": "色彩分析",
    "Wardrobe Audit": "衣橱评估",
    "Personal Shopping": "私人购物顾问",
    "Wardrobe Curation": "衣橱规划",
    "Executive Styling": "高管造型",
    "Corporate Events": "企业活动",
    "Private Events": "私人活动",
    "Birthday Parties": "生日派对",
    "Family Gatherings": "家庭聚会",
    "Corporate Galas": "企业盛典",
    "Shopping Bag": "购物袋",
    "Track Order": "跟踪订单",
    
    # Product/E-commerce
    "Shop the Look": "选购穿搭",
    "Complete the Look": "完成搭配",
    "You May Also Like": "您可能也喜欢",
    "Recently Viewed": "最近浏览",
    "Related Products": "相关产品",
    
    # Time
    "9:00 AM - 8:00 PM": "上午9:00 - 晚上8:00",
    "10:00 AM - 6:00 PM": "上午10:00 - 下午6:00",
    "8:00 AM - 5:00 PM": "上午8:00 - 下午5:00",
    
    # Blog
    "Published": "发布日期",
    "Share This": "分享",
    "Previous Post": "上一篇",
    "Next Post": "下一篇",
    "Read Full Article": "阅读全文",
    "Category": "分类",
    "Tags": "标签",
    
    # Misc
    "Subscribe to Our Newsletter": "订阅我们的通讯",
    "No spam, unsubscribe anytime": "无垃圾邮件，可随时退订",
    "Your email": "您的邮箱",
    "Enter your email": "输入您的邮箱",
    "Subscribe Now": "立即订阅",
    "By subscribing, you agree to our": "订阅即表示您同意我们的",
    "Trusted by industry leaders": "行业领导者信赖",
    "Trusted by leading brands": "领先品牌信赖",
    "Trusted by thousands": "数千用户信赖",
    "Built for modern teams": "为现代团队打造",
    "Built for scale": "为规模化而生",
    "Homes Sold": "房屋成交",
    "Years Experience": "年经验",
    "Star Rating": "星评价",
    "Market Expertise": "市场专长",
    "Local Expertise": "本地专长",
    "Client Satisfaction": "客户满意度",
    "Buy a Home": "购房指南",
    "Sell a Home": "售房指南",
    "Property Valuation": "房产估值",
    "Neighborhood Guide": "社区指南",
    "Market Report": "市场报告",
    "Featured Listings": "精选房源",
    "Recent Sales": "近期成交",
    "Open Houses": "开放看房",
    "Save the Date": "请预留日期",
    "Wedding Details": "婚礼详情",
    "Our Story": "我们的故事",
    "Wedding Party": "婚礼嘉宾",
    "RSVP": "敬请回复",
    "Registry": "礼物清单",
    "Accommodations": "住宿安排",
    "Travel Information": "旅行信息",
    "Wedding Weekend": "婚礼周末",
    "Ceremony & Reception": "典礼与婚宴",
    "Sunday Services": "主日崇拜",
    "Service Times": "礼拜时间",
    "Ministries": "事工",
    "Give Online": "在线奉献",
    "Prayer Request": "代祷请求",
    "Small Groups": "小组聚会",
    "Youth Ministry": "青年事工",
    "Children's Ministry": "儿童事工",
    "Worship With Us": "与我们一同敬拜",
    "Plan Your Visit": "计划您的来访",
    
    # Numbers/Stats
    "10+ Years": "10+ 年经验",
    "15+ Years": "15+ 年经验",
    "20+ Years": "20+ 年经验",
    "127+ Homes": "127+ 套房屋",
    "4.9 Star": "4.9 星好评",
    "5 Star": "5 星好评",
    "Countries Served": "服务国家",
    "Happy Customers": "满意客户",
    "Projects Completed": "完成项目",
    "Awards Won": "获奖荣誉",
    "Team Members": "团队成员",
    "Years in Business": "经营年限",
    
    # Locations
    "Los Angeles, CA": "加州洛杉矶",
    "San Francisco, CA": "加州旧金山",
    "New York, NY 10001": "纽约市",
    "Stockholm, Sweden": "瑞典斯德哥尔摩",
    "Austin, TX": "德州奥斯汀",
    
    # Common names (keep)
    "Sarah Jenkins": "Sarah Jenkins",
    "Sarah L.": "Sarah L.",
    "David R.": "David R.",
    "Michael T.": "Michael T.",
    "James W.": "James W.",
    "Emily R.": "Emily R.",
    "John D.": "John D.",
    "Lisa M.": "Lisa M.",
    "Robert K.": "Robert K.",
    "Jennifer P.": "Jennifer P.",
    "Mark S.": "Mark S.",
    "Courtney Henry": "Courtney Henry",
    "Marcus T.": "Marcus T.",
    "Marcus Chen": "Marcus Chen",
    "Elena Rostova": "Elena Rostova",
    
    # Emails (keep)
    "hello@luminaphotography.com": "hello@luminaphotography.com",
    "john@example.com": "john@example.com",
    "hello@example.com": "hello@example.com",
}


def safe_replace(html, en_sub, zh_full):
    """Replace text node containing en_sub with zh_full. Only between > and <."""
    pattern = rf'>([^<]*{re.escape(en_sub)}[^<]*)<'
    m = re.search(pattern, html)
    if m:
        old = m.group(0)
        new = f'>{zh_full}<'
        return html.replace(old, new)
    return html


def main():
    total = 0
    # Sort keys by length so longer matches go first
    sorted_keys = sorted(TR.keys(), key=len, reverse=True)
    
    for i in range(1, 103):
        if i == 69: continue  # Already done
        
        path = os.path.join(WEGIC, str(i), 'index.html')
        if not os.path.exists(path): continue
        
        with open(path, encoding='utf-8') as f:
            html = f.read()
        
        count = 0
        for en_sub in sorted_keys:
            if en_sub not in html:
                continue
            zh = TR[en_sub]
            if en_sub == zh:
                continue
            new_html = safe_replace(html, en_sub, zh)
            if new_html != html:
                html = new_html
                count += 1
        
        if count > 0:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(html)
            total += count
            print(f'  [#{i:3d}] {count} text nodes translated')
    
    print(f'\nTotal: {total} text nodes translated across all templates')

if __name__ == '__main__':
    main()
