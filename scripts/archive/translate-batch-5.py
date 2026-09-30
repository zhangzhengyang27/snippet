#!/usr/bin/env python3
"""Batch 5: templates 46-60"""
import re, os
WEGIC = "/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic"
def s(html, en, zh):
    p = rf'>([^<]*{re.escape(en)}[^<]*)<'
    m = re.search(p, html)
    return html.replace(m.group(0), f'>{zh}<') if m else html

ALL={
46:{
'Lens & Light | Professional Photography Portfolio':'Lens & Light | 专业摄影作品集',
'LENS &amp; LIGHT':'LENS &amp; LIGHT',
'Capturing moments that last a lifetime.':'捕捉一生难忘的瞬间。',
'Fine Art':'艺术摄影','Editorial':'商业摄影','Street':'街拍',
'Lens & Light is a premium photography studio specializing in editorial, fashion, portrait, and wedding photography.':'Lens & Light 是一家高端摄影工作室，专注于商业摄影、时尚摄影、人像摄影及婚礼摄影。',
},
47:{
'James Hartwell | Austin Real Estate Advisor &amp; Expert Agent':'James Hartwell | 奥斯汀房产顾问与资深经纪人',
'JAMES HARTWELL':'JAMES HARTWELL','Austin\'s Trusted Real Estate Advisor':'奥斯汀信赖的房产顾问',
'Your Dream Home Awaits':'您的梦想之家虚位以待',
'Buying or selling in Austin? Partner with one of the city\'s most trusted real estate professionals.':'在奥斯汀买房或卖房？与本市最值得信赖的房产专业人士合作。',
'With over 12 years of experience in the Austin real estate market, I\'ve helped hundreds of families find their perfect home.':'凭借在奥斯汀房地产市场超过12年的经验，我已帮助数百个家庭找到了他们完美的家。',
'Search Homes':'搜索房源','Sell Your Home':'出售您的房屋','Market Analysis':'市场分析',
'Years of Experience':'年经验','Homes Sold':'房屋成交','Client Satisfaction':'客户满意度',
'Active Listings':'在售房源','What My Clients Say':'客户评价',
'Austin\'s top-producing agent dedicated to finding your dream home or maximizing your property\'s value.':'奥斯汀顶级经纪人，致力于为您找到梦想之家或最大化您的房产价值。',
},
48:{
'Alex Rivera | Content Strategist &amp; Copywriter Portfolio':'Alex Rivera | 内容策略师与文案作品集',
'ALEX RIVERA':'ALEX RIVERA','Content Strategist &amp; Copywriter':'内容策略师与文案写手',
'Words That Work':'有效的文字',
'Crafting strategic narratives and high-converting copy for brands that demand excellence.':'为追求卓越的品牌打造战略性叙事与高转化文案。',
'View My Work':'查看我的作品','Let\'s Collaborate':'合作共赢',
'Content Strategy':'内容策略','Brand Copywriting':'品牌文案','Social Media Management':'社交媒体管理',
'SEO Writing':'SEO写作','Email Campaigns':'邮件营销','Conversion Copy':'转化文案',
},
49:{
'Maya Chen | Operations &amp; Strategy Leader | San Francisco':'Maya Chen | 运营与战略负责人 | 旧金山',
'MAYA CHEN':'MAYA CHEN','Operations &amp; Strategy':'运营与战略',
'Building operational excellence through strategic thinking and data-driven decision making.':'通过战略思维与数据驱动决策构建卓越运营。',
'About Me':'关于我','Experience':'工作经历','Key Metrics':'关键指标',
'Years of Experience':'年经验','Teams Led':'带领团队','Process Improvement':'流程改进',
'Revenue Impact':'收入影响','Professional Journey':'职业历程',
'With a passion for building high-performing systems, I specialize in transforming chaotic processes into scalable operations.':'怀着对构建高绩效系统的热情，我专注于将混沌流程转化为可扩展的运营。',
},
50:{
'Nora Vane \u2014 Freelance Writer, Essayist &amp; Brand Storyteller':'Nora Vane \u2014 自由撰稿人、随笔作家与品牌故事讲述者',
'NORA VANE':'NORA VANE',
'Words that resonate. Stories that connect.':'共鸣的文字。连接的故事。',
'Based in New York City':'常驻纽约市','Read My Work':'阅读我的作品','Hire Me':'聘请我',
'Brand Storytelling':'品牌故事讲述','Personal Essays':'个人随笔','Cultural Criticism':'文化评论',
'Ghostwriting':'代笔写作','Creative Consulting':'创意咨询',
},
51:{
'Radiant Smile Studio | Boutique Cosmetic Dentistry':'Radiant Smile Studio | 精品美容牙科',
'RADIANT SMILE STUDIO':'RADIANT SMILE STUDIO',
'Your Smile, Elevated.':'您的微笑，更上层楼。',
'Dr. Emily Carter, DDS':'Emily Carter 医生 (DDS)',
'Specializing in porcelain veneers, teeth whitening, Invisalign, and full smile makeovers in a warm, anxiety-free, spa-like environment.':'在温暖、无焦虑、水疗式环境中，专注于瓷贴面、牙齿美白、隐适美及全方位微笑改造。',
'Porcelain Veneers':'瓷贴面','Teeth Whitening':'牙齿美白','Invisalign':'隐适美',
'Dental Bonding':'牙齿粘接','Smile Makeover':'微笑改造',
'Your comfort is as important as your final smile.':'您的舒适与最终的笑容同样重要。',
'Transform your smile with Dr. Emily Carter at Radiant Smile Studio.':'在 Radiant Smile Studio 与 Emily Carter 医生一同焕新您的微笑。',
},
52:{
'Warm Coral | Luxury Travel &amp; Tourism':'Warm Coral | 奢华旅行与旅游',
'WARM CORAL':'WARM CORAL',
'Your Journey Begins Here':'您的旅程从这里开始',
'Discover extraordinary destinations':'发现非凡目的地',
'Curated Travel Experiences':'精选旅行体验','Luxury Accommodations':'奢华住宿',
'Private Tours':'私人导览','Concierge Service':'管家服务',
},
53:{
'Serenity Spa &amp; Wellness':'Serenity 水疗与康体',
'SERENITY SPA &amp; WELLNESS':'SERENITY 水疗与康体',
'Your Sanctuary of Serenity':'您的宁静圣地',
'Book Your Treatment':'预约护理',
'Swedish Massage':'瑞典式按摩','Signature Facial':'招牌面部护理',
'Botanical Body Wrap':'植物身体裹敷','Hot Stone Therapy':'热石疗法','Aromatherapy':'芳香疗法',
},
54:{
'TradeCore | Global B2B E-commerce Platform':'TradeCore | 全球 B2B 电商平台',
'TRADECORE':'TRADECORE',
'Your Global Trade Partner':'您的全球贸易伙伴',
'Source products globally with verified suppliers, secure payments, and wholesale pricing.':'全球采购产品，认证供应商、安全支付与批发价格。',
'Browse Products':'浏览产品','Join as Supplier':'成为供应商',
'Verified Suppliers':'认证供应商','Secure Transactions':'安全交易','Quality Assurance':'品质保证',
},
55:{
'SparkleClean | Professional Cleaning Services':'SparkleClean | 专业清洁服务',
'SPARKLECLEAN':'SPARKLECLEAN',
'We make your space sparkle.':'让您的空间焕然一新。',
'Residential Cleaning':'住宅清洁','Commercial Cleaning':'商业清洁',
'Deep Cleaning':'深度清洁','Move In/Out':'搬家清洁',
},
56:{
'LUMIERE | High-End Minimalist Fashion':'LUMIERE | 高端极简时装',
'LUMIERE':'LUMIERE',
'Effortless Elegance':'不费力的优雅',
'Summer Collection':'夏季系列','Spring Edit':'春季精选','New Arrivals':'新品上市',
},
57:{
'PeptiCore | Advanced Peptide Technology':'PeptiCore | 先进肽技术',
'PEPTICORE':'PEPTICORE',
'Science of Youth':'青春的科学',
'GHK-Cu Complex':'GHK-Cu 复合物','BPC-157 Matrix':'BPC-157 基质',
'Research-backed skincare':'科研支持的护肤',
},
58:{
'Bootstrap - The Ultimate Foundation':'Bootstrap - 终极基础',
'BOOTSTRAP':'BOOTSTRAP',
'Build Faster. Launch Sooner.':'更快构建。更早发布。',
'Modern Stack':'现代技术栈','TypeScript Ready':'TypeScript 就绪',
'Production Ready':'生产就绪',
},
59:{
'Lumina | Minimalist Lifestyle':'Lumina | 极简生活',
'Less, but Better.':'更少，但更好。',
'Shop Minimal':'极简购物','Home & Living':'家居生活','Accessories':'配饰',
},
60:{
'Aura Studio | Contemporary Art':'Aura Studio | 当代艺术',
'AURA STUDIO':'AURA STUDIO',
'Art That Speaks':'会说话的艺术',
'Current Exhibition':'当前展览','Past Works':'往期作品',
'Contact for Inquiries':'咨询联系',
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
