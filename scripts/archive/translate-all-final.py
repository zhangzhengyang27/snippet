#!/usr/bin/env python3
"""One-pass translation for ALL remaining English in ALL templates."""
import re, os

WEGIC = "/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic"

# Load extracted texts
import subprocess, json
subprocess.run(["/opt/homebrew/bin/python3", os.path.join(os.path.dirname(__file__), "extract-body-en.py")], cwd=WEGIC, capture_output=True)
with open(os.path.join(os.path.dirname(__file__), "body_en_to_translate.json")) as f:
    data = json.load(f)

all_texts = data['unique_texts']
print(f"Loaded {len(all_texts)} unique texts")

# Build comprehensive per-text translation
TR = {}
for t in all_texts:
    t_clean = t.strip()
    if not re.search(r'[a-zA-Z]{2,}', t_clean): continue
    tl = t_clean.lower()
    
    zh = None
    
    # Keep as-is
    if tl in ('wegic','instagram','twitter','facebook','linkedin','behance','dribbble',
              'github','pinterest','youtube','tiktok','twitch','spotify','discord','slack',
              'typescript','javascript','python','react','vue','node.js','next.js','npm',
              'html','css','sass','less','json','xml','api','sdk','cli','gui',
              'ui/ux','figma','sketch','webpack','vite','docker','kubernetes','aws','gcp',
              'gdpr','soc 2','iso','ssl','seo','cms','cdn','saas','b2b','b2c',
              'ios','android','macos','windows','linux',
              'hello@luminaphotography.com','hello@example.com','john@example.com'):
        continue
    
    # Don't translate pure numbers/years
    if re.match(r'^[\d\s.,%+\-]+$', t_clean): continue
    
    # Brand names to keep
    if tl in ('structora','mochar','mocar','noir','aura','obsidian','lumina','nexuscorp',
              'nexusbiz','buildcore','tradecore','linkforge','pepticore','coachify',
              'oblivion','codot','verdent','onyx','proxima','ignite events','chronicle',
              'burivers','sparkleclean','affiliateboost','wixbuilder','lumiere','adult',
              'maiSon elara','elara studio','sage & petal','fleur & co',
              'hygge & haus','warm orange','sunny steps','citysprouts','little sprout',
              'serenity spa','radiAnt smile','warm coral','electric bloom',
              'grace church','aegis archives','lex advisors','urban living',
              'cup cult','ai payroll','wanderfolio','the slow travel manifesto',
              'ct executive training','interactflow','bootstrap','bold brown',
              'grain & grit','blush & bloom','coral fiesta','teal craft',
              'sterling & partners','lens & light','lumina 3d','lumina gallery',
              'lumina photography','lumina events','maya chen','nora vane',
              'alex rivera','james hartwell','emma & james','eleanor & james',
              'sarah jenkins','sarah chen','james w.','marcus t.','marcus chen',
              'elena rostova','david r.','michael t.','jennifer p.','mark s.',
              'john d.','lisa m.','robert k.','emily r.','courtney henry',
              'alex','kimmy','sarah l.','dr. emily carter',
              'elysian wool rug','hygge lounge chair','sabi dining chair',
              'the kina collection','the kina sideboard','walnut sideboard',
              'minimalist sofa','oak coffee table','minimalist ceramic vase',
              'captower','casehouse','gioserne','yuya','numerous','numers',
              'globaltech','dior','kenzo','nike','gucci','prada'):
        continue
    
    # Email patterns
    if re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', t_clean): continue
    
    # Common word-level translations
    word_map = {
        "home": "首页", "about": "关于", "contact": "联系我们", "shop": "商店",
        "services": "服务", "portfolio": "作品集", "gallery": "画廊", "blog": "博客",
        "menu": "菜单", "works": "作品", "team": "团队", "pricing": "定价",
        "privacy": "隐私", "policy": "政策", "terms": "条款", "conditions": "条件",
        "service": "服务", "newsletter": "通讯", "subscribe": "订阅",
        "careers": "加入我们", "support": "支持", "help": "帮助", "faq": "常见问题",
        "company": "公司", "resources": "资源", "legal": "法律", "press": "媒体",
        "partners": "合作伙伴", "clients": "客户", "projects": "项目",
        "our": "我们的", "your": "您的", "my": "我的", "new": "新品",
        "popular": "热门", "trending": "趋势", "latest": "最新", "featured": "精选",
        "recommended": "推荐", "free": "免费", "premium": "高级", "basic": "基础",
        "pro": "专业版", "enterprise": "企业版", "standard": "标准版", "custom": "定制",
        "professional": "专业", "personal": "个人", "business": "企业",
        "startup": "创业", "corporate": "企业", "luxury": "奢华",
        "all": "全部", "more": "更多", "view": "查看", "see": "查看",
        "learn": "了解", "explore": "探索", "discover": "发现",
        "get": "获取", "start": "开始", "try": "试用", "buy": "购买",
        "shop": "选购", "order": "下单", "book": "预约", "send": "发送",
        "share": "分享", "save": "保存", "edit": "编辑", "delete": "删除",
        "create": "创建", "add": "添加", "remove": "移除", "update": "更新",
        "search": "搜索", "filter": "筛选", "sort": "排序", "reset": "重置",
        "apply": "应用", "submit": "提交", "cancel": "取消", "confirm": "确认",
        "continue": "继续", "back": "返回", "next": "下一步", "previous": "上一步",
        "close": "关闭", "open": "打开", "menu": "菜单",
        "read": "阅读", "write": "写作", "build": "构建", "design": "设计",
        "develop": "开发", "launch": "发布", "scale": "扩展", "grow": "增长",
        "experience": "体验", "enjoy": "享受", "relax": "放松",
        "name": "姓名", "email": "邮箱", "phone": "电话", "address": "地址",
        "city": "城市", "message": "留言", "subject": "主题",
        "now": "立即", "today": "今日", "day": "天", "week": "周", "month": "月", "year": "年",
        "monday": "周一", "tuesday": "周二", "wednesday": "周三",
        "thursday": "周四", "friday": "周五", "saturday": "周六", "sunday": "周日",
        "location": "位置", "directions": "路线", "map": "地图",
        "price": "价格", "sale": "促销", "discount": "折扣", "coupon": "优惠券",
        "cart": "购物车", "checkout": "结账", "wishlist": "心愿单",
        "size": "尺码", "color": "颜色", "qty": "数量",
        "delivery": "配送", "shipping": "配送", "returns": "退换",
        "payment": "支付", "secure": "安全", "guarantee": "保证",
        "quality": "品质", "craftsmanship": "匠心", "design": "设计",
        "story": "故事", "philosophy": "理念", "mission": "使命", "vision": "愿景",
        "values": "价值观", "approach": "理念", "process": "流程",
        "work": "作品", "project": "项目", "case": "案例", "study": "研究",
        "client": "客户", "customer": "客户", "testimonial": "评价", "review": "评价",
        "program": "课程", "course": "课程", "training": "培训", "coaching": "辅导",
        "leadership": "领导力", "management": "管理", "strategy": "战略",
        "consulting": "咨询", "marketing": "营销", "branding": "品牌",
        "technology": "科技", "software": "软件", "hardware": "硬件",
        "platform": "平台", "solution": "解决方案", "product": "产品", "feature": "功能",
        "integration": "集成", "analytics": "分析", "data": "数据",
        "cloud": "云", "ai": "AI", "machine": "机器", "learning": "学习",
        "security": "安全", "compliance": "合规", "privacy": "隐私",
        "legal": "法律", "law": "法律", "firm": "事务所", "attorney": "律师",
        "construction": "建筑", "building": "建造", "renovation": "翻新",
        "real estate": "房地产", "property": "房产", "home": "房屋",
        "photography": "摄影", "photo": "照片", "portrait": "人像", "wedding": "婚礼",
        "event": "活动", "party": "派对", "celebration": "庆典",
        "fashion": "时装", "style": "风格", "collection": "系列",
        "furniture": "家具", "interior": "室内", "decor": "装饰",
        "food": "美食", "coffee": "咖啡", "drink": "饮品", "burger": "汉堡",
        "health": "健康", "wellness": "康体", "spa": "水疗", "beauty": "美容",
        "dental": "牙科", "dentist": "牙医", "smile": "微笑",
        "fitness": "健身", "yoga": "瑜伽", "meditation": "冥想",
        "travel": "旅行", "tourism": "旅游", "destination": "目的地",
        "music": "音乐", "art": "艺术", "culture": "文化",
        "education": "教育", "school": "学校", "academy": "学院",
        "daycare": "托育", "preschool": "学前", "children": "儿童",
        "church": "教会", "faith": "信仰", "worship": "敬拜",
        "community": "社区", "outreach": "关怀",
        "cleaning": "清洁", "moving": "搬家", "pet": "宠物",
        "tattoo": "纹身", "christmas": "圣诞",
        "blog": "博客", "journal": "日志", "article": "文章", "post": "文章",
        "news": "新闻", "update": "更新", "announcement": "公告",
        "subscribe": "订阅", "unsubscribe": "退订",
        "contact us": "联系我们", "about us": "关于我们", "our story": "品牌故事",
        "our team": "我们的团队", "our work": "我们的作品", "our services": "服务项目",
        "get started": "开始使用", "learn more": "了解更多", "read more": "阅读更多",
        "view all": "查看全部", "see all": "查看全部", "show all": "显示全部",
        "book now": "立即预约", "shop now": "立即选购", "buy now": "立即购买",
        "sign up": "注册", "sign in": "登录", "log in": "登录", "log out": "退出",
        "get in touch": "联系我们", "send message": "发送消息",
        "privacy policy": "隐私政策", "terms of service": "服务条款",
        "terms of use": "使用条款", "cookie policy": "Cookie 政策",
        "all rights reserved": "版权所有",
        "coming soon": "即将推出", "stay tuned": "敬请期待",
        "follow us": "关注我们", "connect with us": "与我们联系",
        "business hours": "营业时间", "opening hours": "营业时间",
        "customer service": "客户服务", "customer support": "客户支持",
        "free shipping": "包邮", "free delivery": "免费配送",
        "money back": "退款", "satisfaction guaranteed": "满意保证",
        "add to cart": "加入购物车", "quick view": "快速浏览",
        "new arrivals": "新品上市", "best sellers": "畅销产品",
        "shop all": "全部商品", "browse all": "浏览全部",
        "filter by": "按筛选", "sort by": "按排序",
        "no results": "无结果", "load more": "加载更多",
        "back to top": "回到顶部", "scroll down": "向下滚动",
        "toggle menu": "切换菜单", "toggle dark mode": "切换深色模式",
        "open menu": "打开菜单", "close menu": "关闭菜单",
        "previous": "上一步", "next": "下一步",
        "download": "下载", "upload": "上传", "export": "导出", "import": "导入",
        "print": "打印", "copy": "复制", "paste": "粘贴",
        "settings": "设置", "profile": "个人资料", "account": "账户",
        "dashboard": "仪表盘", "notifications": "通知", "messages": "消息",
        "calendar": "日历", "inbox": "收件箱",
        "published": "发布", "author": "作者", "date": "日期", "category": "分类",
        "tags": "标签", "comments": "评论", "share this": "分享",
        "previous post": "上一篇", "next post": "下一篇", "related posts": "相关文章",
        "read full article": "阅读全文", "estimated reading time": "预计阅读时间",
        "min read": "分钟阅读", "table of contents": "目录",
        "sold out": "售罄", "out of stock": "售罄", "in stock": "有货",
        "limited edition": "限量版", "exclusive": "独家",
        "on sale": "促销中", "clearance": "清仓",
        "free trial": "免费试用", "no credit card required": "无需信用卡",
        "cancel anytime": "随时取消", "no commitment": "无合约",
        "monthly": "每月", "yearly": "每年", "annually": "每年",
        "lifetime": "终身", "one-time": "一次性",
        "starting at": "起价", "per month": "每月", "per year": "每年",
        "plan": "方案", "pricing plan": "价格方案",
        "most popular": "最受欢迎", "best value": "最佳价值",
        "basic plan": "基础方案", "pro plan": "专业方案", "enterprise plan": "企业方案",
        "what's included": "包含内容", "compare plans": "对比方案",
        "contact sales": "联系销售", "request demo": "申请演示",
        "talk to sales": "联系销售", "get a quote": "获取报价",
        "book a demo": "预约演示", "schedule a call": "预约通话",
        "frequently asked questions": "常见问题",
        "still have questions": "还有问题？",
        "need help": "需要帮助？",
        "trusted by": "合作伙伴",
        "built for": "为...打造",
        "made with": "以...制作",
        "powered by": "技术支持",
        "designed by": "设计",
        "developed by": "开发",
        "crafted with": "精心打造",
        "made to last": "匠心持久",
        "handcrafted": "手工打造",
        "sustainable": "可持续",
        "timeless": "永恒",
        "elegant": "优雅",
        "modern": "现代",
        "classic": "经典",
        "minimalist": "极简",
        "bold": "大胆",
        "clean": "简洁",
        "warm": "温馨",
        "cozy": "舒适",
        "bright": "明亮",
        "dark": "暗色",
        "light": "浅色",
        "white": "白色",
        "black": "黑色",
        "gold": "金色",
        "silver": "银色",
        "rose gold": "玫瑰金",
        "vibrant": "活力",
        "vivid": "鲜艳",
        "soft": "柔和",
        "sleek": "精致",
        "premium": "高端",
        "organic": "有机",
        "natural": "天然",
        "artisanal": "手工",
        "bespoke": "定制",
        "curated": "精选",
        "handpicked": "精心挑选",
        "signature": "招牌",
        "exclusive": "独家",
        "limited": "限量",
        "bestseller": "畅销",
        "bestselling": "畅销",
        "top rated": "顶级评价",
        "award winning": "获奖",
        "award-winning": "获奖",
        "world class": "世界级",
        "world-class": "世界级",
        "state of the art": "最先进",
        "cutting edge": "前沿",
        "cutting-edge": "前沿",
        "innovative": "创新",
        "revolutionary": "革命性",
        "next generation": "新一代",
        "next-gen": "新一代",
        "24/7": "全天候",
        "fast": "快速",
        "instant": "即时",
        "easy": "简单",
        "simple": "简单",
        "powerful": "强大",
        "flexible": "灵活",
        "scalable": "可扩展",
        "reliable": "可靠",
        "secure": "安全",
        "trusted": "可信赖",
        "proven": "经过验证",
        "professional": "专业",
        "expert": "专家",
        "experienced": "经验丰富",
        "certified": "认证",
        "licensed": "持证",
        "insured": "已投保",
        "bonded": "已担保",
        "guaranteed": "有保证",
        "warranty": "质保",
        "satisfaction": "满意度",
        "quality": "品质",
        "excellence": "卓越",
        "precision": "精准",
        "perfection": "完美",
        "detail": "细节",
        "attention to detail": "注重细节",
        "craft": "工艺",
        "artisanship": "匠艺",
        "mastery": "精通",
        "expertise": "专长",
        "innovation": "创新",
        "creativity": "创意",
        "passion": "热情",
        "dedication": "专注",
        "commitment": "承诺",
        "integrity": "正直",
        "trust": "信任",
        "respect": "尊重",
        "care": "关怀",
        "love": "热爱",
        "joy": "喜悦",
        "beauty": "美",
        "harmony": "和谐",
        "balance": "平衡",
        "peace": "宁静",
        "serenity": "宁静",
        "tranquility": "安宁",
        "comfort": "舒适",
        "wellness": "健康",
        "wellbeing": "幸福",
        "happiness": "幸福",
        "freedom": "自由",
        "inspiration": "灵感",
        "aspiration": "追求",
        "dream": "梦想",
        "vision": "愿景",
        "future": "未来",
        "growth": "成长",
        "success": "成功",
        "transformation": "蜕变",
        "empowerment": "赋能",
        "confidence": "自信",
        "elegance": "优雅",
        "sophistication": "精致",
        "refinement": "优雅",
        "distinction": "卓越",
        "prestige": "声望",
        "heritage": "传承",
        "tradition": "传统",
        "legacy": "遗产",
        "authenticity": "真实",
        "originality": "独创",
        "uniqueness": "独特",
        "individuality": "个性",
        "character": "品格",
        "personality": "个性",
        "essence": "本质",
        "soul": "灵魂",
        "spirit": "精神",
        "heart": "心",
        "life": "生活",
        "living": "生活",
        "lifestyle": "生活方式",
        "home": "家",
        "family": "家庭",
        "friend": "朋友",
        "community": "社区",
        "neighborhood": "邻里",
        "city": "城市",
        "nature": "自然",
        "world": "世界",
        "global": "全球",
        "local": "本地",
        "international": "国际",
        "domestic": "国内",
        "overseas": "海外",
        "worldwide": "全球",
        "nationwide": "全国",
        "regional": "区域",
        "national": "全国",
        
        # Specific long text patterns
        "at your": "在您的",
        "in your": "在您的",
        "for your": "为您的",
        "with your": "与您的",
        "to your": "给您的",
        "of your": "您的",
        "is your": "是您的",
        "are your": "是您的",
        "was your": "曾是您的",
        "be your": "成为您的",
    }
    
    # Try token-based translation
    words = re.findall(r"[a-zA-Z]+", tl)
    translated_words = []
    changed = False
    for w in words:
        if w in word_map:
            translated_words.append(word_map[w])
            changed = True
        else:
            translated_words.append(w)
    
    if changed:
        # Reconstruct with original spacing
        parts = re.split(r'([a-zA-Z]+)', t_clean)
        wi = 0
        result = []
        for p in parts:
            if re.match(r'[a-zA-Z]+', p):
                result.append(translated_words[wi] if wi < len(translated_words) else p)
                wi += 1
            else:
                result.append(p)
        zh = ''.join(result)
        if zh != t_clean and len(zh) > 1:
            TR[t_clean] = zh

print(f"Generated {len(TR)} translations")

# Apply
def safe_replace(html, en_sub, zh_full):
    pattern = rf'>([^<]*{re.escape(en_sub)}[^<]*)<'
    m = re.search(pattern, html)
    if m:
        return html.replace(m.group(0), f'>{zh_full}<')
    return html

sorted_keys = sorted(TR.keys(), key=len, reverse=True)
total = 0
processed = 0
for i in range(1, 103):
    path = os.path.join(WEGIC, str(i), 'index.html')
    if not os.path.exists(path): continue
    with open(path, encoding='utf-8') as f: html = f.read()
    count = 0
    for en_sub in sorted_keys:
        if en_sub not in html: continue
        zh = TR[en_sub]
        if en_sub == zh: continue
        new_html = safe_replace(html, en_sub, zh)
        if new_html != html:
            html = new_html
            count += 1
    if count > 0:
        with open(path, 'w', encoding='utf-8') as f: f.write(html)
        total += count
        processed += 1
        print(f'  [#{i:3d}] {count}')

print(f'\n{processed} templates, {total} translations')
