#!/usr/bin/env python3
"""Translate wegic-templates.json metadata to Chinese."""

import json
import os

BASE = "/Users/xiaoye/Desktop/html5-examples/public/static-sites"

TITLE_TRANSLATIONS = {
    "Concrete Grey High-End Architecture & Construction Website": "混凝土灰高端建筑与施工网站",
    "Roasted Mocha Organic Coffee Boutique Website": "烘焙摩卡有机咖啡精品网站",
    "Monochromatic Minimalist Apparel & Studio Website": "黑白极简服饰与工作室网站",
    "Pristine White Creative Designer Portfolio Website": "纯净白色创意设计师作品集网站",
    "Charcoal Black Bold Design Studio Portfolio Website": "炭黑色大胆设计工作室作品集网站",
    "Realistic Vivid Photographer Templates Website": "写实鲜艳摄影师模版网站",
    "Bold Brown Classic Grooming Website": "大胆棕色经典理容网站",
    "Elegant Rose Gold Luxury Salon Website": "优雅玫瑰金奢华沙龙网站",
    "Dark Sleek Modern Grooming Website": "暗黑精致现代理容网站",
    "Bold Dark Professional Image Consulting Website": "大胆暗色专业形象咨询网站",
    "Clean Navy Elegant Image Consulting Website": "简约海军蓝优雅形象咨询网站",
    "Elegant Dark Classic Law Firm Website": "优雅暗色经典律师事务所网站",
    "Minimal White Corporate Law Firm Website": "极简白色公司法律事务所网站",
    "Soft Pink Elegant Boutique Website": "柔粉优雅精品店网站",
    "Bold Black Luxury Boutique Website": "大胆黑色奢华精品店网站",
    "Bold Dark Sleek Men's Grooming Clinic Website": "大胆暗黑精致男士理容诊所网站",
    "Vibrant Purple Creative Music Website": "活力紫色创意音乐网站",
    "Teal Craft Decor Website": "青绿色工艺装饰网站",
    "Coral Fiesta Venue Website": "珊瑚色嘉年华场地网站",
    "Yellow Cartoon Daycare Website": "黄色卡通托育园网站",
    "Sage Petal Florist Website": "鼠尾草花瓣花店网站",
    "Charcoal Orange Modern Creative Agency Website": "炭橘色现代创意机构网站",
    "Warm Linen Minimalist Apparel & Brand Website": "温暖亚麻极简服饰与品牌网站",
    "Crimson & Mustard Retro Burger Diner Website": "深红与芥末黄复古汉堡餐厅网站",
}

DESC_TRANSLATIONS = {
    "Ensure your website adapts seamlessly to all screen sizes, delivering a consistent experience across desktop, tablet, and mobile devices.":
        "确保您的网站无缝适配所有屏幕尺寸，在桌面、平板及移动设备上提供一致的用户体验。",
    "Capture leads and send targeted campaigns to nurture customer relationships and boost retention.":
        "获取潜在客户并发送精准营销活动，以培养客户关系并提升留存率。",
    "Create tailored forms for inquiries, registrations, and feedback while collecting the data you need to connect with customers.":
        "创建量身定制的表单用于咨询、注册及反馈，同时收集与客户连接所需的数据。",
    "Wegic's template offers a rich, vibrant color palette and a visually striking style, ideal for creative portfolios, personal branding, and bold visual storytelling.":
        "Wegic 模版提供丰富鲜艳的配色与视觉震撼的风格，非常适合创意作品集、个人品牌塑造及大胆的视觉叙事。",
}

PAGE_STRUCTURE_NAME_TRANSLATIONS = {
    "Concrete Grey High-End Architecture Website": "混凝土灰高端建筑网站",
    "Roasted Mocha Organic Coffee Boutique Website": "烘焙摩卡有机咖啡精品网站",
    "Monochromatic Minimalist Apparel & Studio Website": "黑白极简服饰与工作室网站",
    "Pristine White Creative Designer Portfolio Website": "纯净白色创意设计师作品集网站",
    "Charcoal Black Bold Design Studio Portfolio Website": "炭黑色大胆设计工作室作品集网站",
    "Realistic Vivid Photographer Templates Website": "写实鲜艳摄影师模版网站",
    "Bold Brown Classic Grooming Website": "大胆棕色经典理容网站",
    "Elegant Rose Gold Luxury Salon Website": "优雅玫瑰金奢华沙龙网站",
    "Dark Sleek Modern Grooming Website": "暗黑精致现代理容网站",
    "Bold Dark Professional Image Consulting Website": "大胆暗色专业形象咨询网站",
    "Clean Navy Elegant Image Consulting Website": "简约海军蓝优雅形象咨询网站",
    "Elegant Dark Classic Law Firm Website": "优雅暗色经典律师事务所网站",
    "Minimal White Corporate Law Firm Website": "极简白色公司法律事务所网站",
    "Soft Pink Elegant Boutique Website": "柔粉优雅精品店网站",
    "Bold Black Luxury Boutique Website": "大胆黑色奢华精品店网站",
    "Bold Dark Sleek Men's Grooming Clinic Website": "大胆暗黑精致男士理容诊所网站",
    "Vibrant Purple Creative Music Website": "活力紫色创意音乐网站",
    "Teal Craft Decor Website": "青绿色工艺装饰网站",
    "Coral Fiesta Venue Website": "珊瑚色嘉年华场地网站",
    "Yellow Cartoon Daycare Website": "黄色卡通托育园网站",
    "Sage Petal Florist Website": "鼠尾草花瓣花店网站",
    "Charcoal Orange Modern Creative Agency Website": "炭橘色现代创意机构网站",
    "Warm Linen Minimalist Apparel & Brand Website": "温暖亚麻极简服饰与品牌网站",
    "Crimson & Mustard Retro Burger Diner Website": "深红与芥末黄复古汉堡餐厅网站",
}


def main():
    path = os.path.join(BASE, "wegic-templates.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    changes = 0
    for t in data["templates"]:
        old_title = t.get("title", "")
        if old_title in TITLE_TRANSLATIONS:
            t["title"] = TITLE_TRANSLATIONS[old_title]
            changes += 1

        detail = t.get("detail", {})
        old_desc = detail.get("description", "")
        if old_desc in DESC_TRANSLATIONS:
            detail["description"] = DESC_TRANSLATIONS[old_desc]
            changes += 1

        for ps in detail.get("pageStructure", []):
            old_name = ps.get("name", "")
            if old_name in PAGE_STRUCTURE_NAME_TRANSLATIONS:
                ps["name"] = PAGE_STRUCTURE_NAME_TRANSLATIONS[old_name]
                changes += 1

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Translated {changes} fields in wegic-templates.json")


if __name__ == "__main__":
    main()
