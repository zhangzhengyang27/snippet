#!/usr/bin/env python3
"""
Translate extracted English body texts to Chinese and apply to all templates.
Uses a comprehensive translation dictionary + pattern-based fallback.
"""
import json, re, os

WEGIC = "/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ================================================================
# COMPREHENSIVE TRANSLATION DICTIONARY
# ================================================================
T = {}

# --- Common UI Labels ---
ui_labels = {
    "Home": "首页", "Home.": "首页", "HOME": "首页",
    "About": "关于", "ABOUT": "关于", "About Us": "关于我们",
    "Contact": "联系我们", "CONTACT": "联系我们", "Contact Us": "联系我们",
    "Shop": "商店", "SHOP": "商店", "Shop All": "全部商品",
    "Services": "服务", "SERVICES": "服务", "Our Services": "服务项目",
    "Portfolio": "作品集", "PORTFOLIO": "作品集",
    "Gallery": "画廊", "GALLERY": "画廊",
    "Blog": "博客", "BLOG": "博客",
    "Menu": "菜单", "MENU": "菜单",
    "More": "更多", "MORE": "更多",
    "Works": "作品", "WORKS": "作品",
    "Social": "社交", "SOCIAL": "社交",
    "Team": "团队", "TEAM": "团队",
    "Pricing": "定价", "PRICING": "定价",
    "FAQs": "常见问题", "FAQ": "常见问题",
    "Login": "登录", "LOGIN": "登录",
    "Sign Up": "注册", "Sign up": "注册",
    "Register": "注册",
    "Subscribe": "订阅",
    "Search": "搜索",
    "Get Started": "开始使用", "Get started": "开始使用",
    "Learn More": "了解更多", "Learn more": "了解更多",
    "Read More": "阅读更多", "Read more": "阅读更多",
    "View All": "查看全部", "View all": "查看全部",
    "Show More": "显示更多",
    "See More": "查看更多",
    "Book Now": "立即预约", "Book now": "立即预约",
    "Buy Now": "立即购买",
    "Order Now": "立即下单", "Order now": "立即下单",
    "Shop Now": "立即选购", "Shop now": "立即选购",
    "Try for Free": "免费试用",
    "Get a Quote": "获取报价",
    "Request Demo": "申请演示",
    "Schedule a Call": "预约通话",
    "Contact Us Today": "立即联系我们",
    "Call Us": "致电我们",
    "Email Us": "邮件联系",
    "Visit Us": "访问我们",
    "Follow Us": "关注我们",
    "Back to Top": "回到顶部",
    "Scroll Down": "向下滚动",
    "Close": "关闭",
    "Open Menu": "打开菜单",
    "Toggle Menu": "切换菜单",
    "Toggle language": "切换语言",
    "Toggle menu": "切换菜单",
    "Toggle dark mode": "切换深色模式",
    "All rights reserved": "版权所有",
    "Privacy Policy": "隐私政策",
    "Terms of Service": "服务条款",
    "Terms &amp; Conditions": "条款与条件",
    "Terms & Conditions": "条款与条件",
    "Terms and Conditions": "条款与条件",
    "Cookie Policy": "Cookie 政策",
    "Cookie Settings": "Cookie 设置",
    "Cookies": "Cookie",
    "Returns &amp; Exchanges": "退换货政策",
    "Returns & Exchanges": "退换货政策",
    "Shipping &amp; Returns": "配送与退换",
    "Shipping & Returns": "配送与退换",
    "Shipping Policy": "配送政策",
    "Refund Policy": "退款政策",
    "Careers": "加入我们",
    "Press": "媒体报道",
    "Partners": "合作伙伴",
    "Support": "技术支持",
    "Help": "帮助",
    "FAQ": "常见问题",
    "Company": "公司",
    "Resources": "资源",
    "Legal": "法律",
    "Newsletter": "订阅通讯",
    "Subscribe to Our Newsletter": "订阅我们的通讯",
    "Subscribe to the Maison": "订阅品牌通讯",
    "Stay Connected": "保持联系",
    "Stay in the loop": "保持关注",
    "Be the first to know": "第一时间了解",
}

# --- Navigation & Footer ---
nav_labels = {
    "Services.": "服务",
    "About.": "关于",
    "Contact.": "联系",
    "Contact us": "联系我们",
    "Contact us.": "联系我们",
    "Home.": "首页",
    "Shop.": "商店",
    "Blog.": "博客",
    "Journal": "日志",
    "Journal / Blog": "日志 / 博客",
    "Collections": "系列产品",
    "Concierge": "专属服务",
    "Maison": "品牌",
    "Our Story": "品牌故事",
    "Our Philosophy": "品牌理念",
    "The Maison": "品牌",
    "The Collection": "系列产品",
    "New Arrivals": "新品上市",
    "Best Sellers": "畅销产品",
    "Featured": "精选推荐",
    "Sale": "促销",
    "Quick view": "快速浏览",
    "Add to Cart": "加入购物车",
    "Add to cart": "加入购物车",
    "Out of Stock": "售罄",
    "In Stock": "有货",
    "Qty": "数量",
    "Size": "尺码",
    "Color": "颜色",
    "Select Size": "选择尺码",
    "Select Color": "选择颜色",
    "Select Option": "选择选项",
}

# --- Business / Section Headings ---
headings = {
    "Our Story": "品牌故事",
    "What We Do": "我们的服务",
    "How It Works": "运作方式",
    "Why Choose Us": "为什么选择我们",
    "Why Us": "为什么选择我们",
    "Our Approach": "我们的理念",
    "Our Process": "服务流程",
    "Our Mission": "我们的使命",
    "Our Vision": "我们的愿景",
    "Our Values": "我们的价值观",
    "Our Team": "我们的团队",
    "Meet the Team": "认识团队",
    "Meet Our Team": "认识我们的团队",
    "Our Work": "我们的作品",
    "Recent Work": "近期作品",
    "Recent Projects": "近期项目",
    "Featured Work": "精选作品",
    "Case Studies": "案例研究",
    "Success Stories": "成功案例",
    "Client Stories": "客户故事",
    "Testimonials": "客户评价",
    "What Our Clients Say": "客户评价",
    "What Clients Say": "客户评价",
    "Client Testimonials": "客户评价",
    "Happy Clients": "满意的客户",
    "Trusted By": "合作伙伴",
    "Our Clients": "我们的客户",
    "Our Partners": "合作伙伴",
    "Frequently Asked Questions": "常见问题",
    "Get in Touch": "联系我们",
    "Get In Touch": "联系我们",
    "Let's Talk": "与我们沟通",
    "Let's Work Together": "合作共赢",
    "Work With Us": "与我们合作",
    "Join Us": "加入我们",
    "Join Our Team": "加入我们的团队",
    "Open Positions": "招聘职位",
    "We're Hiring": "正在招聘",
    "Latest News": "最新动态",
    "Latest Articles": "最新文章",
    "Read Our Blog": "阅读博客",
    "Featured Posts": "精选文章",
    "Related Posts": "相关文章",
    "Explore More": "探索更多",
    "Discover More": "发现更多",
    "See Our Work": "查看作品",
    "Browse Collection": "浏览系列",
    "Explore the collection": "探索系列产品",
    "Shop the collection": "选购系列产品",
    "Shop the Collection": "选购系列产品",
    "Shop the Edit": "编辑精选",
    "Shop by Room": "按房间选购",
    "Shop by Category": "按类别选购",
    "Featured Collection": "精选系列",
    "Our Collections": "我们的系列",
    "The Edit": "编辑精选",
    "New Collection": "新系列",
    "Latest Collection": "最新系列",
    "Spring Collection": "春季系列",
    "Summer Collection": "夏季系列",
    "Fall Collection": "秋季系列",
    "Winter Collection": "冬季系列",
    "Limited Edition": "限量版",
    "Exclusive": "独家",
    "Inspired Living": "灵感生活",
    "Craftsmanship": "匠心工艺",
    "Handcrafted Quality": "手工品质",
    "Made to last": "匠心持久",
    "Made to last.": "匠心持久",
    "Crafted with care": "精心打造",
    "Crafted with care.": "精心打造",
    "Responsibly sourced for a better tomorrow": "负责任的采购，为更美好的明天",
    "Responsibly sourced for a better tomorrow.": "负责任的采购，为更美好的明天",
    "Handcrafted pieces inspired by Scandinavian simplicity and Japanese wabi-sabi.": "以斯堪的纳维亚简约与日式侘寂为灵感的手工作品",
    "Made by skilled artisans with care and precision.": "由技艺精湛的工匠以匠心精准打造",
    "Live beautifully, every day.": "每一天，优雅生活",
}

# --- Business Types ---
biz_types = {
    "Luxury Boutique": "奢华精品店",
    "Law Firm": "律师事务所",
    "Construction": "建筑施工",
    "Real Estate": "房地产",
    "Photography": "摄影",
    "Barbershop": "理发店",
    "Grooming": "男士理容",
    "Salon": "沙龙",
    "Spa": "水疗",
    "Daycare": "托育园",
    "Preschool": "学前班",
    "Restaurant": "餐厅",
    "Cafe": "咖啡馆",
    "Coffee": "咖啡",
    "Bakery": "面包店",
    "Florist": "花店",
    "Wedding": "婚礼",
    "Event Planning": "活动策划",
    "Party Planning": "派对策划",
    "Music": "音乐",
    "Fashion": "时装",
    "Jewelry": "珠宝",
    "Furniture": "家具",
    "Interior Design": "室内设计",
    "Architecture": "建筑",
    "Art Gallery": "艺术画廊",
    "Design Studio": "设计工作室",
    "Creative Agency": "创意机构",
    "Digital Agency": "数字机构",
    "Advertising": "广告",
    "Marketing": "营销",
    "Consulting": "咨询",
    "Coaching": "教练辅导",
    "Training": "培训",
    "Education": "教育",
    "Healthcare": "医疗健康",
    "Dental": "牙科",
    "Dentist": "牙医",
    "Cosmetic Dentist": "美容牙科",
    "Dentistry": "牙科",
    "Technology": "科技",
    "Software": "软件",
    "SaaS": "SaaS",
    "E-commerce": "电商",
    "Travel": "旅行",
    "Tourism": "旅游",
    "Food Delivery": "美食外送",
    "Burger": "汉堡",
    "Moving Service": "搬家服务",
    "Cleaning Service": "清洁服务",
    "Pet Grooming": "宠物美容",
    "Tattoo Studio": "纹身工作室",
    "Elderly Care": "养老服务",
    "Christmas": "圣诞",
    "Church": "教会",
    "Templates": "模版",
    "Creator Platform": "创作者平台",
    "Affiliate Marketing": "联盟营销",
    "Personal Brand": "个人品牌",
    "Freelance": "自由职业",
    "Writer": "写作",
    "Copywriting": "文案",
    "Content Strategy": "内容策略",
    "Operations": "运营",
    "Strategy": "战略",
    "Leadership": "领导力",
    "Executive": "高管",
    "Real Estate Agent": "房产经纪人",
    "Realtor": "房产经纪人",
}

# --- Social / Contact / Misc ---
social_misc = {
    "Instagram": "Instagram",  # keep
    "Twitter": "Twitter",  # keep
    "Facebook": "Facebook",  # keep
    "LinkedIn": "LinkedIn",  # keep
    "Behance": "Behance",  # keep
    "Dribbble": "Dribbble",  # keep
    "GitHub": "GitHub",  # keep
    "YouTube": "YouTube",  # keep
    "TikTok": "TikTok",  # keep
    "Quick Links": "快速链接",
    "Selected Works": "精选作品",
    "Hero Background": "主视觉背景",
    "Street": "街拍",
    "Connect": "关注我们",
    "Explore All": "浏览全部",
    "View Portfolio": "查看作品集",
    "Explore Services": "探索服务",
    "Meet The Artist": "认识艺术家",
    "Lumina Logo": "Lumina 标志",
    "Capturing the Poetry of Light": "捕捉光影的诗意",
    "Golden Hour Vows": "金色时刻誓言",
    "Neon Nights": "霓虹之夜",
    "Vogue Silhouette": "时尚剪影",
    "Editorial Portrait": "商业人像",
    "Editorial": "商业摄影",
    "Street Photography": "街头摄影",
    "Wedding Photography": "婚礼摄影",
    "Wedding": "婚礼",
    "Sarah Jenkins": "Sarah Jenkins",
    "James W.": "James W.",
    "New York, NY 10001": "纽约市 10001",
    "Stockholm, Sweden": "瑞典斯德哥尔摩",
    "hello@luminaphotography.com": "hello@luminaphotography.com",
    "Enter your email": "输入您的邮箱",
    "Enter your email address": "输入您的邮箱地址",
    "Your email address": "您的邮箱地址",
    "Email address": "邮箱地址",
    "Subscribe to receive updates, access to exclusive deals, and more.": "订阅以接收最新资讯、独家优惠和更多内容。",
    "Sign In": "登录",
    "Navigation": "导航",
    "Read Our Story": "了解我们的故事",
    "Our Expertise": "专业领域",
    "Most Popular": "最受欢迎",
    "View Details": "查看详情",
    "Accessories": "配饰",
    "Cart": "购物车",
    "Programs": "课程",
    "Projects": "项目",
    "Shop Collection": "选购系列",
    "Work": "作品",
    "Documentation": "文档",
    "Features": "功能",
    "Product": "产品",
    "Brand Identity": "品牌识别",
    "Book a Consultation": "预约咨询",
    "Logo": "标志",
    "Signature": "签名",
    "Explore Programs": "探索课程",
    "All Services": "全部服务",
    "Terms": "条款",
    "GET IN TOUCH": "联系我们",
    "View Our Work": "查看作品",
    "All Products": "全部产品",
    "Quick Add": "快速添加",
    "Details": "详情",
    "Contact Sales": "联系销售",
    "Join": "加入",
    "OUR STORY": "品牌故事",
    "UI/UX Design": "UI/UX 设计",
    "Web Development": "网页开发",
    "Beard Sculpting": "胡须造型",
    "Most popular": "最受欢迎",
    "Selected works": "精选作品",
    "View all": "查看全部",
    "View details": "查看详情",
    "Explore all": "浏览全部",
    "All products": "全部产品",
    "Shop collection": "选购系列",
    "Read our story": "了解我们的故事",
    "Our expertise": "专业领域",
    "Book a consultation": "预约咨询",
    "Book now": "立即预约",
    "Learn more": "了解更多",
    "Read more": "阅读更多",
    "Get started": "开始使用",
    "See all": "查看全部",
    "Show all": "显示全部",
    "Contact sales": "联系销售",
    "View details": "查看详情",
    "All services": "全部服务",
    "Our team": "我们的团队",
    "Get in touch": "联系我们",
    "Send message": "发送消息",
    "Email us": "邮件联系",
    "Call us": "致电我们",
    "Visit us": "访问我们",
    "Explore programs": "探索课程",
    "View portfolio": "查看作品集",
    "See our work": "查看我们的作品",
    "Explore services": "探索服务",
    "View our work": "查看我们的作品",
    "Shop now": "立即选购",
    "Most Popular": "最受欢迎",
    "Selected Works": "精选作品",
    "Explore Programs": "探索课程",
}

# Room / Product Labels
room_labels = {
    "Living Room": "客厅",
    "Dining Room": "餐厅",
    "Bedroom": "卧室",
    "Bathroom": "浴室",
    "Kitchen": "厨房",
    "Home Office": "家庭办公室",
    "Outdoor": "户外",
    "Chairs": "椅子",
    "Lounge Chairs": "休闲椅",
    "Sideboards": "边柜",
    "Rugs": "地毯",
    "Tables": "桌子",
    "Sofas": "沙发",
    "Lighting": "灯具",
    "Decor": "装饰",
    "Lifestyle": "生活方式",
    "Sustainable Materials": "可持续材料",
    "Timeless Design": "永恒设计",
    "Craftsmanship": "匠心工艺",
    "Inspired Living": "灵感生活",
}

# ---- Merge all translations ----
T.update(ui_labels)
T.update(nav_labels)
T.update(headings)
T.update(biz_types)
T.update(social_misc)
T.update(room_labels)
T.update(common)
T.update(descriptive)
    "Welcome to": "欢迎来到",
    "Hello": "你好",
    "Hi": "你好",
    "Thank You": "感谢",
    "Thank you": "感谢",
    "Thanks": "感谢",
    "Yes": "是",
    "No": "否",
    "Next": "下一步",
    "Previous": "上一步",
    "Back": "返回",
    "Submit": "提交",
    "Send": "发送",
    "Save": "保存",
    "Cancel": "取消",
    "Delete": "删除",
    "Edit": "编辑",
    "Update": "更新",
    "Create": "创建",
    "Add": "添加",
    "Remove": "移除",
    "Upload": "上传",
    "Download": "下载",
    "Share": "分享",
    "Copy": "复制",
    "Print": "打印",
    "Export": "导出",
    "Import": "导入",
    "Settings": "设置",
    "Profile": "个人资料",
    "Account": "账户",
    "Dashboard": "仪表盘",
    "Notifications": "通知",
    "Messages": "消息",
    "Inbox": "收件箱",
    "Calendar": "日历",
    "Today": "今天",
    "Tomorrow": "明天",
    "Yesterday": "昨天",
    "Now": "现在",
    "Later": "稍后",
    "Always": "始终",
    "Never": "从不",
    "Free": "免费",
    "Premium": "高级版",
    "Basic": "基础版",
    "Pro": "专业版",
    "Enterprise": "企业版",
    "Standard": "标准版",
    "Custom": "定制",
    "Professional": "专业",
    "Personal": "个人",
    "Business": "企业",
    "Startup": "创业公司",
    "Small Business": "中小企业",
    "Corporate": "企业",
    "Price": "价格",
    "Starting at": "起价",
    "per month": "每月",
    "per year": "每年",
    "Monthly": "每月",
    "Yearly": "每年",
    "Annually": "每年",
    "One-time": "一次性",
    "lifetime": "终身",
    "Lifetime": "终身",
    "Subscribe": "订阅",
    "Unsubscribe": "取消订阅",
    "Name": "姓名",
    "Full Name": "全名",
    "First Name": "名",
    "Last Name": "姓",
    "Email": "邮箱",
    "Email Address": "邮箱地址",
    "Phone": "电话",
    "Phone Number": "电话号码",
    "Address": "地址",
    "City": "城市",
    "State": "省份",
    "Country": "国家",
    "Zip Code": "邮编",
    "Message": "留言",
    "Subject": "主题",
    "Comment": "评论",
    "Your Name": "您的姓名",
    "Your Email": "您的邮箱",
    "Your Message": "您的留言",
    "Send Message": "发送消息",
    "Send a Message": "发送消息",
    "Drop us a line": "给我们留言",
    "Get in touch": "联系我们",
    "Contact Information": "联系信息",
    "Business Hours": "营业时间",
    "Opening Hours": "营业时间",
    "Monday": "周一",
    "Tuesday": "周二",
    "Wednesday": "周三",
    "Thursday": "周四",
    "Friday": "周五",
    "Saturday": "周六",
    "Sunday": "周日",
    "Mon": "周一",
    "Tue": "周二",
    "Wed": "周三",
    "Thu": "周四",
    "Fri": "周五",
    "Sat": "周六",
    "Sun": "周日",
    "Mon - Fri": "周一至周五",
    "Mon - Sat": "周一至周六",
    "24/7": "全天候",
    "Location": "位置",
    "Our Location": "我们的位置",
    "Find Us": "找到我们",
    "Directions": "路线指引",
    "Map": "地图",
    "View on Map": "在地图上查看",
    "Online": "在线",
    "Offline": "离线",
    "Available": "可用",
    "Unavailable": "不可用",
    "Coming Soon": "即将推出",
    "Coming soon": "即将推出",
    "Launching Soon": "即将发布",
    "New": "新品",
    "Popular": "热门",
    "Trending": "趋势",
    "Recommended": "推荐",
    "Featured": "精选",
    "Latest": "最新",
    "All": "全部",
    "Filter": "筛选",
    "Sort": "排序",
    "Sort by": "排序方式",
    "Grid": "网格",
    "List": "列表",
    "Load More": "加载更多",
    "See All": "查看全部",
    "Show All": "显示全部",
    "Clear All": "清除全部",
    "Reset": "重置",
    "Apply": "应用",
    "Confirm": "确认",
    "Continue": "继续",
    "Skip": "跳过",
    "Finish": "完成",
    "Start": "开始",
    "Stop": "停止",
    "Pause": "暂停",
    "Play": "播放",
    "Watch": "观看",
    "Listen": "收听",
    "Read": "阅读",
    "Write": "写作",
    "Build": "构建",
    "Create": "创建",
    "Design": "设计",
    "Develop": "开发",
    "Launch": "发布",
    "Deploy": "部署",
    "Scale": "扩展",
    "Grow": "增长",
    "Learn": "学习",
    "Explore": "探索",
    "Discover": "发现",
    "Experience": "体验",
    "Enjoy": "享受",
    "Relax": "放松",
    "Unwind": "放松身心",
    "Restore": "修复",
    "Renew": "焕新",
    "Reconnect": "重连",
    "Restore. Renew. Reconnect.": "修复。焕新。重连。",
    "Precision is our practice": "精准是我们的准则",
    "Precision is our practice.": "精准是我们的准则",
}

# --- Descriptive Phrases ---
descriptive = {
    "About the Brand": "关于品牌",
    "Brand Story": "品牌故事",
    "The Brand": "品牌介绍",
    "The Story": "品牌故事",
    "Our Heritage": "品牌传承",
    "Since 2018": "始于 2018",
    "Since 2019": "始于 2019",
    "Since 2020": "始于 2020",
    "Since 2021": "始于 2021",
    "Est. 2018": "创立于 2018",
    "Est. 2019": "创立于 2019",
    "Est. 2020": "创立于 2020",
    "Founded in 2018": "创立于 2018",
    "Years of Experience": "年行业经验",
    "years experience": "年经验",
    "Years Experience": "年经验",
    "Award Winning": "获奖",
    "Award-winning": "获奖",
    "5 Star Rating": "5 星好评",
    "4.9 Stars": "4.9 星",
    "Top Rated": "顶级评价",
    "Quality Guaranteed": "品质保证",
    "Satisfaction Guaranteed": "满意保证",
    "100% Satisfaction": "100% 满意",
    "Money Back Guarantee": "退款保证",
    "No Risk": "零风险",
    "Free Trial": "免费试用",
    "Free Consultation": "免费咨询",
    "Free Estimate": "免费估价",
    "Free Quote": "免费报价",
    "Free Shipping": "包邮",
    "Free Delivery": "免费配送",
    "Free Returns": "免费退换",
    "Fast Delivery": "快速配送",
    "Fast Shipping": "快速配送",
    "Same Day Delivery": "当日配送",
    "Next Day Delivery": "次日配送",
    "Worldwide Shipping": "全球配送",
    "International Shipping": "国际配送",
    "Secure Payment": "安全支付",
    "Secure Checkout": "安全结账",
    "Easy Returns": "便捷退换",
    "Customer Service": "客户服务",
    "24/7 Support": "全天候支持",
    "Lifetime Support": "终身支持",
    "Premium Support": "高级支持",
    "Dedicated Support": "专属支持",
    "Instant Access": "即时访问",
    "Instant Download": "即时下载",
    "No Credit Card Required": "无需信用卡",
    "Cancel Anytime": "随时取消",
    "No commitment": "无合约",
    "No hidden fees": "无隐藏费用",
    "Transparent Pricing": "透明定价",
    "Simple Pricing": "简单定价",
    "Flexible Plans": "灵活方案",
    "Custom Plans": "定制方案",
    "Built for Scale": "为规模化而生",
    "Built for Teams": "为团队而生",
    "Built for Creators": "为创作者而生",
    "Built for Business": "为企业而生",
    "Built for Enterprise": "为企业级而生",
    "Made for You": "为您量身打造",
    "Designed for You": "为您设计",
    "Tailored for You": "为您定制",
}

# --- Merge all translations ---
T.update(ui_labels)
T.update(nav_labels)
T.update(headings)
T.update(biz_types)
T.update(common)
T.update(descriptive)

# ================================================================
# Translation function for untranslated texts
# ================================================================
def smart_translate(text):
    """Translate text using dictionary + fallback patterns."""
    text = text.strip()
    if text in T:
        return T[text]
    
    # Try case-insensitive
    for k, v in list(T.items()):
        if k.lower() == text.lower():
            return v
    
    return None  # Will be skipped (kept as-is)

# ================================================================
# Apply translations
# ================================================================
def apply_translations(html):
    """Replace English text with Chinese in HTML, preserving structure."""
    count = 0
    used = set()
    
    # Sort by length descending to avoid partial matches
    sorted_keys = sorted(T.keys(), key=len, reverse=True)
    
    for en_text in sorted_keys:
        zh_text = T[en_text]
        if en_text == zh_text or en_text in used:
            continue
        if en_text not in html:
            continue
        
        # For texts >= 8 chars, safe to do simple string replace
        # For shorter texts, only replace in text nodes (>...<) to avoid class/attr false matches
        if len(en_text) >= 8:
            # Simple replacement - safe for longer texts
            html = html.replace(en_text, zh_text)
            count += 1
        else:
            # Regex-based: only replace between > and <
            pattern = rf'>\s*{re.escape(en_text)}\s*<'
            if re.search(pattern, html):
                html = re.sub(pattern, f'>{zh_text}<', html)
                count += 1
        
        used.add(en_text)
    
    # Also do attribute translations for aria-label etc
    for en_text, zh_text in list(T.items()):
        if en_text == zh_text:
            continue
        for attr in ['aria-label']:
            pat = rf'{attr}="{re.escape(en_text)}"'
            if re.search(pat, html):
                html = re.sub(pat, f'{attr}="{zh_text}"', html)
    
    return html, count

def main():
    # Load extracted texts
    with open(os.path.join(SCRIPT_DIR, 'body_en_to_translate.json'), encoding='utf-8') as f:
        data = json.load(f)
    
    total_unique = len(data['unique_texts'])
    translated_in_dict = sum(1 for t in data['unique_texts'] if t in T)
    print(f'Total unique: {total_unique}, In dictionary: {translated_in_dict}')
    
    # Apply to all templates
    total_replaced = 0
    for i in range(1, 103):
        path = os.path.join(WEGIC, str(i), 'index.html')
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8') as f:
            html = f.read()
        
        new_html, count = apply_translations(html)
        if count > 0:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_html)
            total_replaced += count
            print(f'  [#{i}] {count} replacements')
    
    print(f'\nTotal replacements: {total_replaced}')

if __name__ == '__main__':
    main()
