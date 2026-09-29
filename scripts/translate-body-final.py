#!/usr/bin/env python3
"""
Final batch translation of ALL remaining English text nodes in Wegic templates.
Text-node safe: only replaces between > and <
"""

import re, os

WEGIC = "/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic"

def safe_replace(html, en_sub, zh_full):
    pattern = rf'>([^<]*{re.escape(en_sub)}[^<]*)<'
    m = re.search(pattern, html)
    if m:
        old = m.group(0)
        return html.replace(old, f'>{zh_full}<')
    return html

# Massive translation map
T = {
    # Template 1
    "Book A 免费 Appointment": "预约免费咨询",
    "[TORONTO]": "[多伦多]",
    "[LONDON]": "[伦敦]",
    "Captower": "Captower",
    "Casehouse": "Casehouse",
    "Gioserne": "Gioserne",
    
    # Template 2
    "商店 BEANS": "选购咖啡豆",
    "CAFE 菜单": "咖啡菜单",
    "Limited Time Offer": "限时特惠",
    "OFF": "折扣",
    "欢迎 to MOCHAR": "欢迎来到 MOCHAR",
    "Your First": "您的第一杯",
    
    # Template 3
    "GRAIN &amp; GRIT v.1.0.1": "GRAIN &amp; GRIT 版本 1.0.1",
    "Grain &amp; Grit": "GRAIN &amp; GRIT",
    
    # Template 4
    "YUYA": "YUYA",
    "work.": "作品",
    "about.": "关于",
    "contact.": "联系",
    "hello@studio.com": "hello@studio.com",
    
    # Template 5
    "NUMEROUS®": "NUMEROUS®",
    "NUMEROUS": "NUMEROUS",
    "MOMENTUM": "MOMENTUM",
    "Brand Campaign": "品牌广告",
    "PURE FORM": "纯粹形态",
    "TYPE MATTERS": "字体之美",
    "A design studio shaping brands": "一家以动感、清晰与永恒匠心塑造品牌与数字体验的设计工作室",
    
    # Template 7
    "Bold Brown": "Bold Brown",
    "Est. 2026 • 高级版 男士理容": "创立于 2026 • 高端男士理容",
    "Classic 男士理容 for the": "为现代绅士打造的",
    "Modern Gentleman": "经典男士理容",
    "体验 the timeless art of traditional barbering combined with premium, bold brown aesthetic products designed for the contemporary man.": "体验传统理发技艺与为当代男士打造的 premium Bold Brown 美学产品的完美结合",
    "Book an Appointment": "预约服务",
    "Masterful cuts, traditional hot towel shaves, and meticulous beard grooming.": "精湛剪裁、传统热毛巾剃须与细致胡须护理。",
    
    # Template 8
    "欢迎 to Aura": "欢迎来到 Aura",
    "体验 the pinnacle of luxury beauty and wellness in our rose gold sanctuary. Where artistry meets relaxation.": "在玫瑰金殿堂体验奢华美容与健康的巅峰。艺术与放松在此交汇。",
    "The Aura 体验": "Aura 体验",
    "A Sanctuary of": "玫瑰金奢华的",
    "Rose Gold 奢华": "圣殿",
    "Founded on the principles of refined elegance": "秉承精致优雅与卓越服务的精神，Aura 不仅是一家沙龙，更是一处关于蜕变的殿堂。我们的资深造型师将前沿技术与永恒美学相融合，为每一位走进来的客人打造极具个性化的奢华体验。",
    
    # Template 9
    "OBSIDIAN": "OBSIDIAN",
    "Refine Your": "提升您的",
    "Presence": "气场",
    "高级版 grooming services and products for the modern gentleman": "为现代绅士打造的高端理容服务与产品",
    "Masterful techniques tailored to your unique style and features.": "为您独特的风格与特征量身打造的精湛技艺。",
    "Tailored haircut including consultation, wash, and styling.": "定制剪发，包含咨询服务、洗发与造型。",
    "Traditional straight razor shave with essential oils and hot towels.": "传统直剃刀剃须，搭配精油与热毛巾。",
    
    # Template 10
    "Command the Room Without Saying a Word": "无需言语，掌控全场",
    "Bespoke image consulting and executive styling for professionals who demand excellence in every detail.": "为追求每一细节卓越的专业人士提供定制形象咨询与高管造型服务。",
    "Your Image is Your Most Powerful Asset": "您的形象是您最强大的资产",
    "In the modern professional landscape, your visual presentation speaks before you do. We believe that true style is an alignment of your internal compe": "在现代职场中，您的视觉呈现先于言语传达。我们相信，真正的风格是您内在能力、抱负与价值观的协调统一。我们的顾问将心理学洞见与审美专业相结合，打造真实而有力的形象。",
    "Our approach goes beyond fashion. We craft a strategic visual identity that amplifies your authority, builds trust, and reflects your unique professio": "我们的理念超越时尚。我们打造战略性视觉识别，放大您的权威感、建立信任，并反映您独特的职业身份。每次咨询都是一次深入发现——了解您的目标、行业背景与个人叙事，然后将这些转化为一种不留任何余地的视觉语言。",
    "Tailored 服务": "定制服务",
}

# More translations cont'd
T.update({
    # Template 11 common
    "Elevate Your Professional": "提升您的职业",
    "Command Respect Before": "在开口之前赢得尊重",
    
    # Template 12
    "Sterling &amp; Partners": "Sterling &amp; 合作伙伴",
    
    # Template 13
    "Sterling &amp; Co": "Sterling &amp; Co.",
    "Exceptional Legal Counsel": "卓越法律顾问",
    "Uncompromising Integrity": "坚定不移的正直",
    
    # General fixes
    "Book an appointment": "预约服务",
    "Schedule a Tour": "预约参观",
    "Get in Touch": "联系我们",
    "Contact Us": "联系我们",
    "About Us": "关于我们",
    "Our 服务": "我们的服务",
    "Our 作品": "我们的作品",
    "Our 团队": "我们的团队",
    "最新 项目": "最新项目",
    "精选 作品": "精选作品",
    "全部 服务": "全部服务",
    "全部 产品": "全部产品",
    "联系 信息": "联系信息",
    "商店 Hours": "营业时间",
    "商业 Hours": "营业时间",
    "客户 服务": "客户服务",
    "免费 配送": "免费配送",
    "安全 支付": "安全支付",
    "便捷 退换": "便捷退换",
    "全球 配送": "全球配送",
    "订阅 通讯": "订阅通讯",
    "常见 问题": "常见问题",
    "使用 条款": "使用条款",
    "隐私 政策": "隐私政策",
    "退换 政策": "退换政策",
    "关于 品牌": "关于品牌",
    "新品 上市": "新品上市",
    "畅销 产品": "畅销产品",
    "限时 特惠": "限时特惠",
    "立即 购买": "立即购买",
    "立即 下单": "立即下单",
    "立即 选购": "立即选购",
    "立即 预约": "立即预约",
    "立即 订阅": "立即订阅",
    "立即 联系": "立即联系",
    "立即 咨询": "立即咨询",
    "免费 咨询": "免费咨询",
    "免费 试用": "免费试用",
    "免费 估价": "免费估价",
    "免费 报价": "免费报价",
    "查看 详情": "查看详情",
    "查看 全部": "查看全部",
    "查看 项目": "查看项目",
    "查看 作品集": "查看作品集",
    "加入 购物车": "加入购物车",
    "加入 心愿单": "加入心愿单",
    "浏览 系列": "浏览系列",
    "浏览 全部": "浏览全部",
    "探索 更多": "探索更多",
    "发现 更多": "发现更多",
    "阅读 更多": "阅读更多",
    "了解 更多": "了解更多",
    "发送 消息": "发送消息",
    "订阅 我们的通讯": "订阅我们的通讯",
    "获取 报价": "获取报价",
    "预约 咨询": "预约咨询",
    "联系我们 今日": "立即联系我们",
    "计划 您的来访": "计划您的来访",
    "与我们 合作": "与我们合作",
    "加入 我们的团队": "加入我们的团队",
    "客户 评价": "客户评价",
    "合作伙伴 评价": "合作伙伴评价",
    "成功 案例": "成功案例",
    "品牌 识别": "品牌识别",
    "网页 设计": "网页设计",
    "网页 开发": "网页开发",
    "平面 设计": "平面设计",
    "数字 营销": "数字营销",
    "社交 媒体": "社交媒体",
    "内容 策略": "内容策略",
    "艺术 指导": "艺术指导",
    "动态 设计": "动态设计",
    "搜索 全部": "搜索全部",
})

def main():
    # Sort by length for correct replacement order
    sorted_keys = sorted(T.keys(), key=len, reverse=True)
    
    total = 0
    processed = 0
    for i in range(1, 103):
        if i == 69: continue
        path = os.path.join(WEGIC, str(i), 'index.html')
        if not os.path.exists(path): continue
        
        with open(path, encoding='utf-8') as f:
            html = f.read()
        
        count = 0
        for en_sub in sorted_keys:
            if en_sub not in html: continue
            zh = T[en_sub]
            if en_sub == zh: continue
            new_html = safe_replace(html, en_sub, zh)
            if new_html != html:
                html = new_html
                count += 1
        
        if count > 0:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(html)
            total += count
            processed += 1
            print(f'  [#{i:3d}] {count} translations')
    
    print(f'\nProcessed {processed} templates, {total} total translations')

if __name__ == '__main__':
    main()
