#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate a pure-Tailwind version of tooplate 2162 StackCraft (site 24).

Backs up the original index.html -> index.original.html, then writes a new
index.html that uses Tailwind Play CDN + inline tailwind.config, expresses all
layout/color/type/responsive via utility classes, and keeps only a minimal
fallback <style> for JS-toggle state classes + keyframe entrance animations.
"""

import os
import random
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "index.html")
BAK = os.path.join(HERE, "index.original.html")

# ---- backup original -------------------------------------------------------
if not os.path.exists(BAK):
    shutil.copy(SRC, BAK)
    print("backed up ->", BAK)
else:
    print("backup already exists, skip")

# ---- contribution heatmap grid (7 rows x 52 cols) --------------------------
random.seed(2162)
levels = ["", "l1", "l2", "l3", "l4"]
weights = [50, 25, 13, 8, 4]
bgmap = {
    "": "bg-[rgba(201,169,110,0.06)]",
    "l1": "bg-[rgba(201,169,110,0.14)]",
    "l2": "bg-[rgba(201,169,110,0.28)]",
    "l3": "bg-[rgba(201,169,110,0.48)]",
    "l4": "bg-[rgba(201,169,110,0.75)]",
}
cell_lines = []
for _ in range(7):
    for _c in range(52):
        x = random.choices(levels, weights=weights)[0]
        cell_lines.append(
            '          <div class="contrib-cell aspect-square rounded-[2px] %s"></div>'
            % bgmap[x]
        )
contrib_inner = "\n".join(cell_lines)

# ---- nav links helper ------------------------------------------------------
def nav_link(href, label, extra=""):
    return (
        '      <li><a href="%s" class="nav-link relative py-[0.3rem] text-[0.85rem] '
        'font-normal tracking-[0.12em] uppercase text-text-secondary transition-[color,letter-spacing] '
        'duration-300 hover:text-accent %s">%s</a></li>' % (href, extra, label)
    )

nav_items = [
    nav_link("#about", "关于"),
    nav_link("#skills", "Skills"),
    nav_link("#projects", "Work"),
    nav_link("#experience", "Experience"),
]

# skill bar helper
def skill_bar(name, pct):
    return (
        '          <div class="skill-bar mb-[1.4rem]">\n'
        '            <div class="skill-bar-header flex items-center justify-between mb-[0.6rem]">\n'
        '              <span class="skill-bar-name text-[0.95rem] font-normal text-text-secondary">%s</span>\n'
        '              <span class="skill-bar-pct text-[0.82rem] text-text-muted">%s</span>\n'
        '            </div>\n'
        '            <div class="skill-bar-track h-[3px] w-full overflow-hidden rounded-[2px] bg-[rgba(201,169,110,0.08)]">\n'
        '              <div class="skill-bar-fill h-full rounded-[2px] bg-gradient-to-r from-accent-dim to-accent" style="--w:%s"></div>\n'
        '            </div>\n'
        '          </div>' % (name, pct, pct)
    )

# tech icon helper
def tech_icon(svg, label):
    return (
        '          <div class="tech-icon flex items-center gap-2 rounded-md border '
        'border-[rgba(201,169,110,0.12)] bg-bg-card px-4 py-[0.55rem] text-[0.85rem] font-normal '
        'text-text-secondary transition-all duration-300 hover:-translate-y-0.5 '
        'hover:border-[rgba(201,169,110,0.25)] hover:text-accent">\n'
        '            <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4 shrink-0">%s</svg>\n'
        '            %s\n'
        '          </div>' % (svg, label)
    )

# project card helper
def project_card(idx_cls, thumb, tags, name, desc, link_label, link_svg, first=False, wide=False):
    extra = ""
    thumb_extra = "aspect-[16/10]"
    if first:
        extra = "lg:[grid-row:1/3]"
        thumb_extra = "lg:aspect-[4/3]"
    elif wide:
        extra = "lg:col-span-2 lg:flex-row"
        thumb_extra = "lg:aspect-auto lg:min-w-[280px] lg:max-w-[340px]"
    else:
        extra = "lg:flex-row"
        thumb_extra = "lg:aspect-auto lg:min-w-[180px] lg:max-w-[200px]"
    tag_html = "".join(
        '<span class="project-tag rounded-[3px] bg-[rgba(201,169,110,0.08)] px-[0.7rem] py-[0.3rem] '
        'text-[0.75rem] uppercase tracking-[0.08em] text-accent">%s</span>' % t
        for t in tags
    )
    return (
        '      <div class="project-card reveal flex flex-col bg-bg-card border '
        'border-[rgba(201,169,110,0.12)] rounded-[10px] overflow-hidden transition-all duration-[400ms] '
        'hover:-translate-y-1 hover:border-[rgba(201,169,110,0.25)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] %s">\n'
        '        <div class="project-thumb relative flex %s items-center justify-center overflow-hidden bg-bg-secondary">\n'
        '          <img src="%s" alt="%s" class="h-full w-full object-cover">\n'
        '        </div>\n'
        '        <div class="project-info flex flex-1 flex-col justify-center p-6">\n'
        '          <div class="project-tags mb-4 flex flex-wrap gap-2">%s</div>\n'
        '          <h3 class="project-name mb-[0.6rem] font-display text-[1.5rem] font-medium text-text-primary">%s</h3>\n'
        '          <p class="project-desc mb-[1.2rem] text-[0.95rem] font-light leading-[1.7] text-text-secondary">%s</p>\n'
        '          <a href="#" class="project-link inline-flex items-center gap-2 text-[0.85rem] font-medium uppercase tracking-[0.1em] text-accent transition-[gap] duration-300 hover:gap-[0.8rem]">%s <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-[14px] w-[14px]">%s</svg></a>\n'
        '        </div>\n'
        '      </div>' % (extra, thumb_extra, thumb, name, tag_html, name, desc, link_label, link_svg)
    )

link_arrow = '<path d="M7 17L17 7M17 7H7M17 7v10"/>'

# timeline item helper
def timeline_item(side, date, role, company, desc, dot_cls=""):
    # side: 'left' (odd) or 'right' (even)
    if side == "left":
        wrap = "lg:w-[46%] lg:ml-0 lg:text-right lg:pr-10"
        dot = "lg:right-[-6px] " + dot_cls
    else:
        wrap = "lg:w-[46%] lg:ml-[54%] lg:pl-10"
        dot = "lg:left-[-6px] " + dot_cls
    return (
        '      <div class="timeline-item reveal relative w-full pb-[3.5rem] pl-8 text-left %s">\n'
        '        <div class="timeline-dot absolute top-2 -left-[6px] h-[11px] w-[11px] rounded-full border-2 border-accent bg-bg-secondary %s"></div>\n'
        '        <div class="timeline-date mb-[0.5rem] text-[0.82rem] font-medium uppercase tracking-[0.15em] text-accent">%s</div>\n'
        '        <div class="timeline-role mb-[0.3rem] font-display text-[1.55rem] font-medium text-text-primary">%s</div>\n'
        '        <div class="timeline-company mb-[0.8rem] text-[1rem] text-text-secondary">%s</div>\n'
        '        <div class="timeline-desc text-[0.95rem] font-light leading-[1.8] text-text-muted">%s</div>\n'
        '      </div>' % (wrap, dot, date, role, company, desc)
    )

tech_node = '<path d="M12 21.985c-.275 0-.532-.074-.772-.202l-2.439-1.448c-.365-.203-.182-.277-.072-.314.487-.17.586-.21 1.101-.508.056-.03.129-.018.185.015l1.873 1.115c.074.036.166.036.236 0l7.3-4.226c.072-.041.118-.12.118-.21V7.768c0-.091-.046-.174-.118-.213l-7.3-4.222c-.07-.041-.166-.041-.236 0l-7.3 4.222c-.078.041-.122.124-.122.213v8.44c0 .086.046.166.122.21l2 1.157c1.082.548 1.747-.095 1.747-.735V8.502c0-.124.1-.22.222-.22h.936c.12 0 .222.098.222.22v8.338c0 1.449-.788 2.28-2.156 2.28-.42 0-.752 0-1.688-.46l-1.918-1.105A1.551 1.551 0 0 1 2 16.21V7.768c0-.57.301-1.098.79-1.382l7.3-4.226a1.584 1.584 0 0 1 1.544 0l7.3 4.226c.49.286.79.812.79 1.382v8.44c0 .572-.3 1.096-.79 1.38l-7.3 4.223a1.56 1.56 0 0 1-.634.174z"/>'
tech_wordpress = '<path d="M0 12v12h24V0H0zm19.34-3.2c.1 0 .36.04.5.28.12.2.1.48.04.7l-1.78 6.1c-.06.22-.22.4-.48.4H14.5c-.14 0-.28-.04-.36-.18l-2.1-3.5-2.38 3.5c-.1.14-.24.18-.38.18H6.38c-.24 0-.42-.18-.48-.4L4.12 9.78c-.04-.22-.06-.5.04-.7.14-.24.4-.28.5-.28h3.08c.28 0 .46.18.52.4l.84 3.58 2.06-3.5c.08-.16.24-.28.44-.28h.64c.2 0 .34.12.44.28l2.02 3.5.86-3.58c.06-.22.26-.4.52-.4z"/>'
tech_react = '<path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622C10.21 2.274 8.449 1.314 7.103 1.314c-.897 0-1.636.393-2.142 1.138-.996 1.463-.763 4.164.67 7.413C3.28 10.68 2 12.026 2 13.387 2 16.32 6.84 18.686 12 18.686s10-2.367 10-5.3c0-1.36-1.28-2.706-3.632-3.52 1.434-3.25 1.666-5.95.67-7.413-.506-.745-1.244-1.138-2.14-1.138zM7.103 2.714c.474 0 1.494.362 2.884 1.616-1.262 1.22-2.47 2.71-3.504 4.363A29.496 29.496 0 0 0 3.26 9.86c-1.152-2.65-1.326-4.736-.654-5.724.28-.412.676-.622 1.202-.622h.001l.294.2zm-.4 7.688c.467-.892.982-1.74 1.538-2.536a27.16 27.16 0 0 1 1.96-2.546 27.16 27.16 0 0 1 1.96 2.546c.556.796 1.072 1.644 1.538 2.536a26.27 26.27 0 0 1-1.538 2.536 27.16 27.16 0 0 1-1.96 2.546 27.16 27.16 0 0 1-1.96-2.546 26.27 26.27 0 0 1-1.538-2.536zm7.674 4.79c-.748.868-1.538 1.672-2.358 2.4.82-.728 1.61-1.532 2.358-2.4z"/>'
tech_ts = '<path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.677.12a6.988 6.988 0 0 1 1.407.405v3.068h-.006a3.348 3.348 0 0 0-.633-.81 2.82 2.82 0 0 0-1.071-.637 2.34 2.34 0 0 0-.825-.15c-.318 0-.6.075-.843.225-.24.15-.36.39-.36.72 0 .21.06.39.18.54.12.15.27.27.45.375.18.105.39.195.63.27.24.075.48.15.72.225.42.12.81.27 1.17.45.36.18.675.405.945.675.27.27.48.585.63.945.15.36.225.78.225 1.26 0 .645-.12 1.17-.36 1.575-.24.405-.57.72-.99.945-.42.225-.9.375-1.44.45a9.497 9.497 0 0 1-1.71.105 10.58 10.58 0 0 1-1.875-.18 6.018 6.018 0 0 1-1.5-.495v-3.27a3.91 3.91 0 0 0 .75.87c.285.255.6.465.945.63.345.165.69.285 1.035.36.345.075.66.105.945.105.39 0 .705-.06.945-.18.24-.12.36-.345.36-.675 0-.24-.075-.435-.225-.585a2.136 2.136 0 0 0-.6-.42 8.162 8.162 0 0 0-.84-.345l-.975-.345c-.795-.3-1.41-.72-1.845-1.26-.435-.54-.652-1.215-.652-2.025 0-.585.12-1.095.36-1.53.24-.435.555-.795.945-1.08.39-.285.84-.495 1.35-.63.51-.135 1.035-.202 1.575-.202zM8.602 4.5h3.45L17.4 19.5H13.8l-.933-2.834H8.437L7.5 19.5H3.9zm1.8 4.95L9.127 13.5h2.636L10.388 9.45z"/>'
tech_tailwind = '<path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z"/>'
tech_firebase = '<path d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.115-.28-.394-.53-.954-.735-1.44-.036.495-.055.685-.523 1.184-.723.566-4.438 3.682-4.74 10.02-.282 5.912 4.27 9.435 4.888 9.884l.07.05A73.49 73.49 0 0 1 10.3 18.2c-.25-2.14.37-4.128 2.287-5.7 0 0-.684 2.542.086 4.37.462 1.092 1.348 2.066 1.81 2.584.313.352.68.638 1.093.842a6.154 6.154 0 0 0 .662-2.47c.07-1.032-.09-2.073-.464-3.034-.358-.937-.927-1.78-1.58-2.237z"/>'
tech_docker = '<path d="M13.983 11.078h2.119a.186.186 0 0 0 .186-.185V9.006a.186.186 0 0 0-.186-.186h-2.119a.185.185 0 0 0-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 0 0 .186-.186V3.574a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 0 0 .186-.186V6.29a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 0 0 .184-.186V6.29a.185.185 0 0 0-.185-.185H8.1a.185.185 0 0 0-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 0 0 .185-.186V6.29a.186.186 0 0 0-.185-.185H5.136a.186.186 0 0 0-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 0 0 .186-.185V9.006a.186.186 0 0 0-.186-.186h-2.118a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 0 0 .184-.185V9.006a.185.185 0 0 0-.184-.186h-2.12a.185.185 0 0 0-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 0 0 .185-.185V9.006a.186.186 0 0 0-.185-.186H5.136a.186.186 0 0 0-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 0 0 .184-.185V9.006a.185.185 0 0 0-.184-.186h-2.12a.185.185 0 0 0-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 0 0-.75.748 11.687 11.687 0 0 0 .692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.228 12.228 0 0 0 3.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z"/>'
tech_github = '<path d="M12.5.75C6.146.75 1 5.896 1 12.25c0 5.089 3.292 9.387 7.863 10.91.575.101.79-.244.79-.546 0-.273-.014-1.178-.014-2.142-2.889.532-3.636-.704-3.866-1.35-.13-.331-.69-1.352-1.18-1.625-.402-.216-.977-.748-.014-.762.906-.014 1.553.834 1.769 1.179 1.035 1.74 2.688 1.25 3.349.948.1-.747.402-1.25.733-1.538-2.559-.287-5.232-1.279-5.232-5.678 0-1.25.445-2.285 1.178-3.09-.115-.288-.517-1.467.115-3.048 0 0 .963-.302 3.163 1.179.92-.259 1.897-.388 2.875-.388.977 0 1.955.13 2.875.388 2.2-1.495 3.162-1.179 3.162-1.179.633 1.581.23 2.76.115 3.048.733.805 1.179 1.825 1.179 3.09 0 4.413-2.688 5.39-5.247 5.678.417.36.776 1.05.776 2.128 0 1.538-.014 2.774-.014 3.162 0 .302.216.662.79.547C20.709 21.637 24 17.324 24 12.25 24 5.896 18.854.75 12.5.75z"/>'
tech_postgres = '<path d="M22.2 14.322L21.1 20a2.371 2.371 0 0 1-2.3 2H5.2a2.371 2.371 0 0 1-2.3-2l-1.1-5.678A2.287 2.287 0 0 1 4 11.822H20a2.287 2.287 0 0 1 2.2 2.5zM12 17a2 2 0 1 0-2-2 2 2 0 0 0 2 2zM7.7 6h8.6L17 2H7z"/>'
tech_graphql = '<path d="M24 18.588a1.529 1.529 0 0 1-1.895-.72l-3.45-4.771-.5-.667-4.003 5.444a1.466 1.466 0 0 1-1.802.708l5.158-6.92-4.798-6.251a1.595 1.595 0 0 1 1.9.666l3.576 4.83 3.596-4.81a1.435 1.435 0 0 1 1.788-.668L15.659 12l5.341 6.588zM.002 18.142l1.313-1.615L0 18.098l.002.044zm5.784-10.7 2.182 2.95L2.07 17.86c-.48.64-1.24.938-1.964.71l5.68-7.627V7.442z"/>'

tech_icons_html = "\n".join([
    tech_icon(tech_node, "Node.js"),
    tech_icon(tech_wordpress, "WordPress"),
    tech_icon(tech_react, "React"),
    tech_icon(tech_ts, "TypeScript"),
    tech_icon(tech_tailwind, "Tailwind"),
    tech_icon(tech_firebase, "Firebase"),
    tech_icon(tech_docker, "Docker"),
    tech_icon(tech_github, "GitHub"),
    tech_icon(tech_postgres, "PostgreSQL"),
    tech_icon(tech_graphql, "GraphQL"),
])

skills_frontend = "\n".join([
    skill_bar("React / 下一个.js", "95%"),
    skill_bar("TypeScript", "92%"),
    skill_bar("CSS / Tailwind", "90%"),
    skill_bar("Vue / Nuxt", "78%"),
])
skills_backend = "\n".join([
    skill_bar("Node.js / Express", "93%"),
    skill_bar("PostgreSQL / Redis", "88%"),
    skill_bar("Docker / Kubernetes", "82%"),
    skill_bar("AWS / GCP", "85%"),
])

projects_html = "\n".join([
    project_card("", "/static-sites/24/images/project-1.jpg", ["下一个.js", "Prisma", "Stripe"], "Velocitor",
                 "A real-time analytics dashboard for SaaS teams. 特性 live metrics, custom event tracking, and Slack-integrated alerts for critical thresholds.",
                 "View Project", link_arrow, first=True),
    project_card("", "/static-sites/24/images/project-2.jpg", ["React", "WebSocket", "Go"], "Gridlock",
                 "Collaborative task board with real-time sync, drag-and-drop workflows, and role-based permissions. Built for distributed engineering teams.",
                 "View Project", link_arrow),
    project_card("", "/static-sites/24/images/project-3.jpg", ["TypeScript", "CLI", "Open Source"], "Scaffold CLI",
                 "An opinionated project scaffolding tool that generates production-ready boilerplates with CI/CD, linting, testing, and deployment configs baked in.",
                 "View on GitHub", link_arrow),
    project_card("", "/static-sites/24/images/project-4.jpg", ["Rust", "WASM", "Edge"], "Meridian",
                 "A lightweight edge computing framework for deploying serverless functions closer to users. Sub-millisecond cold starts with built-in observability.",
                 "View Project", link_arrow, wide=True),
])

timeline_html = "\n".join([
    timeline_item("left", "2022 — Present", "Senior Full-Stack Engineer", "Stratos Systems",
                  "Leading frontend architecture for a cloud infrastructure platform serving 15,000+ developers. Designed the component system, migrated legacy jQuery modules to React, and cut page load times by 40%."),
    timeline_item("right", "2020 — 2022", "Software Engineer", "Luminary Labs",
                  "Built and maintained microservices powering real-time data pipelines for fintech clients. Owned the notification system handling 2M+ daily events with 99.97% uptime."),
    timeline_item("left", "2018 — 2020", "Frontend 开发者", "Pixel & Code Agency",
                  "Delivered responsive, accessible web applications for clients ranging from early-stage startups to Fortune 500 companies. Specialized in animation-heavy marketing sites and progressive web apps."),
    timeline_item("right", "2016 — 2018", "Junior 开发者", "NovaByte Inc.",
                  "Started my career building internal tools and prototyping client features. Learned the fundamentals of shipping production code, writing tests, and collaborating through code review."),
])

HTML = '''<!DOCTYPE html>
<html lang="en" class="scroll-smooth scroll-pt-20">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="StackCraft — Clean code, sharp solutions. 开发者 portfolio showcasing technical projects, code skills, and open-source contributions." />
<meta name="author" content="StackCraft" />
<meta name="theme-color" content="#1a1814" />
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%231a1814'/><text x='16' y='22' text-anchor='middle' fill='%23c9a96e' font-family='serif' font-size='18' font-weight='bold'>S</text></svg>" />
<title>StackCraft — Clean Code, Sharp Solutions</title>
  <!--
  Tooplate 2162 StackCraft
  https://www.tooplate.com/view/2162-stackcraft
  Free HTML CSS 模板
  -->

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet" />

  <!-- Tailwind Play CDN：零构建即可在静态 HTML 使用 Tailwind 工具类 -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            'bg-primary':   '#0f0e0b',
            'bg-secondary': '#161510',
            'bg-card':      '#1c1a15',
            'bg-elevated':  '#1a1814',
            'text-primary':   '#f0ece4',
            'text-secondary': '#a8a295',
            'text-muted':     '#706b61',
            'accent':       '#c9a96e',
            'accent-light': '#dfc596',
            'accent-dim':   '#8a7548',
          },
          fontFamily: {
            display: ['Cormorant Garamond', 'Georgia', 'serif'],
            body:    ['Outfit', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
            mono:    ['SF Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
          },
        },
      },
    };
  </script>

  <!-- 仅兜底：JS 切换的状态类（.scrolled / .open / .active / .visible）、属性动画无法表达的是关键帧入场动画、::selection、base img -->
  <style>
    img { display: block; max-width: 100%; }
    ::selection { background: #c9a96e; color: #0f0e0b; }

    /* Nav scrolled (JS) */
    .nav.scrolled { background: rgba(15,14,11,0.95); box-shadow: 0 1px 0 rgba(201,169,110,0.12); }

    /* Mobile drawer open (JS) */
    .nav-links.open { right: 0; }

    /* Hamburger open (JS) */
    .nav-toggle.open span:nth-child(1) { transform: rotate(45deg) translate(4.5px, 4.5px); }
    .nav-toggle.open span:nth-child(2) { opacity: 0; }
    .nav-toggle.open span:nth-child(3) { transform: rotate(-45deg) translate(4.5px, -4.5px); }

    /* Nav link bracket pseudo + active (JS) */
    .nav-links a::before,
    .nav-links a::after {
      position: absolute;
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 1.1em;
      color: #c9a96e;
      opacity: 0;
      transition: opacity 0.3s, transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94);
    }
    .nav-links a::before { content: '['; left: -0.6em; transform: translateX(4px); }
    .nav-links a::after  { content: ']'; right: -0.6em; transform: translateX(-4px); }
    .nav-links a:hover,
    .nav-links a.active { color: #c9a96e; letter-spacing: 0.16em; }
    .nav-links a:hover::before,
    .nav-links a:hover::after,
    .nav-links a.active::before,
    .nav-links a.active::after { opacity: 1; transform: translateX(0); }
    .nav-cta::before,
    .nav-cta::after { display: none !important; }

    /* Scroll reveal (JS) */
    .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.8s cubic-bezier(0.25,0.46,0.45,0.94), transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94); }
    .reveal.visible { opacity: 1; transform: translateY(0); }

    /* Keyframe entrance animations */
    @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeScale { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
    @keyframes barFill { from { width: 0; } to { width: var(--w); } }

    .hero-label { animation: fadeSlideUp 0.8s cubic-bezier(0.25,0.46,0.45,0.94) 0.2s forwards; }
    .hero-title { animation: fadeSlideUp 0.8s cubic-bezier(0.25,0.46,0.45,0.94) 0.4s forwards; }
    .hero-tagline { animation: fadeSlideUp 0.8s cubic-bezier(0.25,0.46,0.45,0.94) 0.6s forwards; }
    .hero-actions { animation: fadeSlideUp 0.8s cubic-bezier(0.25,0.46,0.45,0.94) 0.8s forwards; }
    .hero-code-block { animation: fadeScale 1s cubic-bezier(0.25,0.46,0.45,0.94) 0.5s forwards; }
    .hero-float { animation: float 6s ease-in-out infinite; }
    .skill-bar-fill { width: var(--w); animation: barFill 1.2s cubic-bezier(0.25,0.46,0.45,0.94) forwards; }
  </style>
</head>

<body class="bg-bg-primary font-body font-light text-text-primary leading-[1.7] tracking-[0.01em] antialiased overflow-x-hidden">

<!-- ============ NAVIGATION ============ -->
<nav id="nav" class="nav fixed left-0 top-0 z-[1000] w-full bg-[rgba(15,14,11,0.85)] px-[clamp(1.5rem,4vw,3rem)] backdrop-blur-[20px] transition-[background,box-shadow,padding] duration-500">
  <div class="mx-auto flex h-20 max-w-[1280px] items-center justify-between">
    <a href="#hero" class="nav-logo font-display text-[1.6rem] font-semibold tracking-[0.02em] text-text-primary"><span class="text-accent">Stack</span>Craft</a>

    <ul id="navLinks" class="nav-links fixed right-[-100%] top-0 z-[1001] flex h-[100dvh] w-[280px] flex-col items-center justify-center gap-8 border-l border-[rgba(201,169,110,0.12)] bg-bg-elevated px-8 py-[80px] transition-[right] duration-[400ms] max-[768px]:flex md:relative md:right-auto md:top-auto md:z-auto md:h-auto md:w-auto md:flex-row md:items-center md:justify-normal md:gap-10 md:border-0 md:bg-transparent md:px-0 md:py-0 list-none">
''' + "\n".join(nav_items) + '''      <li><a href="#contact" class="nav-cta border border-accent-dim px-7 py-3 text-[0.82rem] uppercase tracking-[0.12em] text-accent transition-all duration-300 hover:bg-accent hover:text-bg-primary">Get in Touch</a></li>
    </ul>

    <button id="navToggle" class="nav-toggle hidden max-[768px]:flex flex-col gap-[5px] cursor-pointer border-0 bg-transparent p-[6px]" aria-label="Toggle navigation">
      <span class="block h-[1.5px] w-6 bg-text-primary transition-all duration-300"></span>
      <span class="block h-[1.5px] w-6 bg-text-primary transition-all duration-300"></span>
      <span class="block h-[1.5px] w-6 bg-text-primary transition-all duration-300"></span>
    </button>
  </div>
</nav>

<!-- ============ HERO ============ -->
<section id="hero" class="hero relative mx-auto grid max-w-[1280px] grid-cols-1 lg:grid-cols-2 lg:min-h-screen">
  <div class="hero-content order-1 flex flex-col justify-center px-[1.5rem] pt-[7rem] pb-[3rem] md:px-[2rem] md:pt-[8rem] md:pb-[4rem] lg:px-[clamp(2rem,6vw,5rem)] lg:py-[clamp(6rem,10vh,8rem)]">
    <div class="hero-label opacity-0 mb-6 flex items-center gap-4 text-[0.82rem] font-medium uppercase tracking-[0.25em] text-accent">
      <span class="inline-block h-px w-8 bg-accent"></span>Full-Stack 开发者
    </div>
    <h1 class="hero-title opacity-0 mb-6 font-display text-[clamp(2.4rem,5.5vw,5rem)] font-medium leading-[1.08] tracking-[-0.01em] text-text-primary">Clean code,<br><em class="italic text-accent">sharp solutions</em></h1>
    <p class="hero-tagline opacity-0 mb-10 max-w-[440px] text-[1.2rem] font-light leading-[1.8] text-text-secondary">I design and engineer web systems that are built to last — thoughtful architecture, maintainable code, and interfaces that feel right.</p>
    <div class="hero-actions opacity-0 flex items-center gap-6 max-[480px]:flex-col max-[480px]:items-start">
      <a href="#projects" class="group inline-flex items-center gap-3 bg-accent px-[2.2rem] py-4 text-[0.88rem] font-medium uppercase tracking-[0.12em] text-bg-primary transition-all duration-[400ms] hover:-translate-y-0.5 hover:bg-accent-light hover:shadow-[0_8px_30px_rgba(201,169,110,0.2)]">
        View My Work
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-[3px]"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
      <a href="#contact" class="inline-flex items-center gap-2 text-[0.88rem] font-normal uppercase tracking-[0.1em] text-text-secondary transition-colors duration-300 hover:text-accent">Let's connect</a>
    </div>
  </div>

  <div class="hero-visual order-2 relative flex min-h-[50vh] items-center justify-center overflow-hidden bg-bg-secondary px-[2rem] py-[3rem] lg:min-h-0 lg:p-0">
    <div class="hero-float absolute h-[120px] w-[120px] rounded-full border border-[rgba(201,169,110,0.12)] top-[15%] right-[10%]" style="animation-delay:0s"></div>
    <div class="hero-float absolute h-[60px] w-[60px] rounded-full border border-[rgba(201,169,110,0.12)] bottom-[25%] left-[8%]" style="animation-delay:-2s"></div>
    <div class="hero-float absolute h-[180px] w-[180px] rounded-full border border-[rgba(201,169,110,0.12)] bottom-[10%] right-[20%] opacity-40" style="animation-delay:-4s"></div>

    <div class="hero-code-block relative w-[80%] max-w-[420px] overflow-hidden rounded-xl border border-[rgba(201,169,110,0.12)] bg-bg-card shadow-[0_25px_60px_rgba(0,0,0,0.4)]">
      <div class="code-header flex items-center gap-1.5 border-b border-[rgba(201,169,110,0.12)] bg-white/[0.03] px-[18px] py-[14px]">
        <div class="code-dot h-2.5 w-2.5 rounded-full bg-[#e06c60] opacity-70"></div>
        <div class="code-dot h-2.5 w-2.5 rounded-full bg-[#e5bf4e] opacity-70"></div>
        <div class="code-dot h-2.5 w-2.5 rounded-full bg-[#61c354] opacity-70"></div>
        <span class="code-title ml-auto text-[0.7rem] tracking-[0.05em] text-text-muted">stackcraft.ts</span>
      </div>
      <div class="code-body p-6 font-mono text-[0.82rem] leading-[1.9] text-text-secondary">
        <span class="text-text-muted italic">// What I build every day</span><br>
        <span class="text-[#c792ea]">interface</span> <span class="text-[#ffcb6b]">开发者</span> {<br>
        &nbsp;&nbsp;<span class="text-accent">craft</span>: <span class="text-[#c3e88d]">"precision"</span>;<br>
        &nbsp;&nbsp;<span class="text-accent">approach</span>: <span class="text-[#c3e88d]">"systematic"</span>;<br>
        &nbsp;&nbsp;<span class="text-accent">passion</span>: <span class="text-[#c3e88d]">"building"</span>;<br>
        }<br><br>
        <span class="text-[#c792ea]">const</span> <span class="text-[#82aaff]">ship</span> <span class="text-[#89ddff]">=</span> <span class="text-[#c792ea]">async</span> () <span class="text-[#89ddff]">=></span> {<br>
        &nbsp;&nbsp;<span class="text-[#c792ea]">const</span> idea <span class="text-[#89ddff]">=</span> <span class="text-[#c792ea]">await</span> <span class="text-[#82aaff]">design</span>();<br>
        &nbsp;&nbsp;<span class="text-[#c792ea]">const</span> code <span class="text-[#89ddff]">=</span> <span class="text-[#c792ea]">await</span> <span class="text-[#82aaff]">build</span>(idea);<br>
        &nbsp;&nbsp;<span class="text-[#c792ea]">return</span> <span class="text-[#82aaff]">deploy</span>(code);<br>
        };
      </div>
    </div>
  </div>
</section>

<!-- ============ ABOUT ============ -->
<div class="mx-auto h-px w-full max-w-[1100px] bg-[rgba(201,169,110,0.12)]"></div>
<section id="about" class="section px-[clamp(1.5rem,4vw,3rem)] py-[clamp(5rem,10vh,8rem)]">
  <div class="section-inner mx-auto max-w-[1100px]">
    <div class="section-label reveal flex items-center gap-4 text-[0.8rem] font-medium uppercase tracking-[0.3em] text-accent mb-4"><span class="inline-block h-px w-6 bg-accent-dim"></span>关于</div>
    <div class="about-grid grid grid-cols-1 gap-8 md:grid-cols-[200px_1fr] md:gap-[2.5rem] lg:grid-cols-[280px_1fr] lg:gap-16">
      <div class="about-photo reveal aspect-[4/5] overflow-hidden rounded-lg border border-[rgba(201,169,110,0.12)] bg-bg-card">
        <img src="/static-sites/24/images/about.jpg" alt="开发者 portrait" class="h-full w-full object-cover">
      </div>
      <div class="about-text reveal">
        <h3 class="mb-6 font-display text-[1.8rem] font-medium text-text-primary">Engineer by trade, architect by instinct</h3>
        <p class="mb-4 text-[1.02rem] font-light leading-[1.9] text-text-secondary">I'm a full-stack developer with a deep appreciation for clean architecture and thoughtful design. Over the years, I've built everything from real-time data pipelines to polished SaaS interfaces, always favoring clarity over cleverness.</p>
        <p class="mb-4 text-[1.02rem] font-light leading-[1.9] text-text-secondary">When I'm not shipping features, you'll find me contributing to open-source projects, exploring new frameworks, or writing about the craft of software engineering.</p>
        <div class="about-stats mt-10 grid grid-cols-3 gap-5 border-t border-[rgba(201,169,110,0.12)] pt-10">
          <div>
            <div class="stat-number font-display text-[2.5rem] font-semibold leading-none text-accent max-[480px]:text-[1.6rem]">8+</div>
            <div class="stat-label mt-[0.4rem] text-[0.85rem] tracking-[0.05em] text-text-muted">Years Building</div>
          </div>
          <div>
            <div class="stat-number font-display text-[2.5rem] font-semibold leading-none text-accent max-[480px]:text-[1.6rem]">40+</div>
            <div class="stat-label mt-[0.4rem] text-[0.85rem] tracking-[0.05em] text-text-muted">Projects Shipped</div>
          </div>
          <div>
            <div class="stat-number font-display text-[2.5rem] font-semibold leading-none text-accent max-[480px]:text-[1.6rem]">12k</div>
            <div class="stat-label mt-[0.4rem] text-[0.85rem] tracking-[0.05em] text-text-muted">GitHub Stars</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============ SKILLS ============ -->
<section id="skills" class="skills-section bg-bg-secondary px-[clamp(1.5rem,4vw,3rem)] py-[clamp(5rem,10vh,8rem)]">
  <div class="section-inner mx-auto max-w-[1100px]">
    <div class="section-label reveal flex items-center gap-4 text-[0.8rem] font-medium uppercase tracking-[0.3em] text-accent mb-4"><span class="inline-block h-px w-6 bg-accent-dim"></span>Skills &amp; Tools</div>
    <div class="section-title reveal font-display text-[clamp(2.2rem,4vw,3.4rem)] font-medium leading-[1.15] text-text-primary mb-4">What I work with</div>
    <div class="section-subtitle reveal max-w-[540px] text-[1.1rem] font-light leading-[1.8] text-text-secondary mb-14">A curated toolkit refined through years of production experience and continuous learning.</div>

    <div class="skills-grid grid grid-cols-1 gap-[3rem] lg:grid-cols-2 lg:gap-16">
      <div class="skill-category reveal">
        <h4 class="mb-[1.8rem] border-b border-[rgba(201,169,110,0.12)] pb-[0.8rem] font-display text-[1.35rem] font-medium text-text-primary">Frontend Engineering</h4>
''' + skills_frontend + '''
      </div>
      <div class="skill-category reveal">
        <h4 class="mb-[1.8rem] border-b border-[rgba(201,169,110,0.12)] pb-[0.8rem] font-display text-[1.35rem] font-medium text-text-primary">Backend &amp; Infrastructure</h4>
''' + skills_backend + '''
      </div>
    </div>

    <div class="tech-stack reveal mt-12">
      <h4 class="mb-[1.5rem] border-b border-[rgba(201,169,110,0.12)] pb-[0.8rem] font-display text-[1.35rem] font-medium text-text-primary">Tech Stack</h4>
      <div class="tech-icons flex flex-wrap gap-3">
''' + tech_icons_html + '''
      </div>
    </div>

    <div class="github-section reveal mt-14">
      <h4 class="mb-[0.4rem] font-display text-[1.35rem] font-medium text-text-primary">Contribution Activity</h4>
      <p class="github-subtitle mb-[1.2rem] text-[0.9rem] text-text-muted">1,247 contributions in the last year</p>
      <div class="contrib-grid grid grid-cols-[repeat(52,1fr)] gap-[3px] max-[768px]:grid-cols-[repeat(26,1fr)]">
''' + contrib_inner + '''
      </div>
      <div class="contrib-legend mt-[0.6rem] flex items-center justify-end gap-1 text-[0.75rem] text-text-muted">
        <span class="mx-1">Less</span>
        <div class="contrib-legend-cell h-[10px] w-[10px] rounded-[2px] bg-[rgba(201,169,110,0.06)]"></div>
        <div class="contrib-legend-cell h-[10px] w-[10px] rounded-[2px] bg-[rgba(201,169,110,0.14)]"></div>
        <div class="contrib-legend-cell h-[10px] w-[10px] rounded-[2px] bg-[rgba(201,169,110,0.28)]"></div>
        <div class="contrib-legend-cell h-[10px] w-[10px] rounded-[2px] bg-[rgba(201,169,110,0.48)]"></div>
        <div class="contrib-legend-cell h-[10px] w-[10px] rounded-[2px] bg-[rgba(201,169,110,0.75)]"></div>
        <span class="mx-1">More</span>
      </div>
    </div>
  </div>
</section>

<!-- ============ PROJECTS ============ -->
<section id="projects" class="section px-[clamp(1.5rem,4vw,3rem)] py-[clamp(5rem,10vh,8rem)]">
  <div class="section-inner mx-auto max-w-[1100px]">
    <div class="section-label reveal flex items-center gap-4 text-[0.8rem] font-medium uppercase tracking-[0.3em] text-accent mb-4"><span class="inline-block h-px w-6 bg-accent-dim"></span>Selected Work</div>
    <div class="section-title reveal font-display text-[clamp(2.2rem,4vw,3.4rem)] font-medium leading-[1.15] text-text-primary mb-4">Projects that <em class="italic text-accent">shipped</em></div>
    <div class="section-subtitle reveal max-w-[540px] text-[1.1rem] font-light leading-[1.8] text-text-secondary mb-14">A selection of recent builds — from developer tools to production platforms.</div>

    <div class="projects-grid grid grid-cols-1 gap-[1.8rem] lg:grid-cols-2">
''' + projects_html + '''
    </div>
  </div>
</section>

<!-- ============ EXPERIENCE ============ -->
<section id="experience" class="experience-section bg-bg-secondary px-[clamp(1.5rem,4vw,3rem)] py-[clamp(5rem,10vh,8rem)]">
  <div class="section-inner mx-auto max-w-[1100px]">
    <div class="section-label reveal flex items-center justify-center gap-4 text-[0.8rem] font-medium uppercase tracking-[0.3em] text-accent mb-4"><span class="inline-block h-px w-6 bg-accent-dim"></span>Experience</div>
    <div class="section-title reveal text-center font-display text-[clamp(2.2rem,4vw,3.4rem)] font-medium leading-[1.15] text-text-primary mb-4">Where I've been</div>
    <div class="section-subtitle reveal mx-auto max-w-[540px] text-center text-[1.1rem] font-light leading-[1.8] text-text-secondary mb-14">A trajectory shaped by challenging problems, great teams, and continuous growth.</div>

    <div class="timeline relative mx-auto max-w-[720px]">
      <div class="absolute bottom-2 left-1/2 top-2 w-px -translate-x-1/2 bg-gradient-to-b from-accent-dim via-[rgba(201,169,110,0.12)] to-transparent max-[768px]:left-0 max-[768px]:translate-x-0"></div>
''' + timeline_html + '''
    </div>
  </div>
</section>

<!-- ============ CONTACT ============ -->
<div class="mx-auto h-px w-full max-w-[1100px] bg-[rgba(201,169,110,0.12)]"></div>
<section id="contact" class="section px-[clamp(1.5rem,4vw,3rem)] py-[clamp(5rem,10vh,8rem)]">
  <div class="section-inner mx-auto max-w-[1100px]">
    <div class="section-label reveal flex items-center gap-4 text-[0.8rem] font-medium uppercase tracking-[0.3em] text-accent mb-4"><span class="inline-block h-px w-6 bg-accent-dim"></span>联系</div>
    <div class="section-title reveal font-display text-[clamp(2.2rem,4vw,3.4rem)] font-medium leading-[1.15] text-text-primary mb-4">Let's build something</div>
    <div class="section-subtitle reveal max-w-[540px] text-[1.1rem] font-light leading-[1.8] text-text-secondary mb-14">Whether it's a project collaboration, consulting opportunity, or just a conversation about code — I'd like to hear from you.</div>

    <div class="contact-grid grid grid-cols-1 gap-[3rem] lg:grid-cols-2 lg:gap-16">
      <div class="contact-text reveal">
        <h3 class="mb-4 font-display text-[2rem] font-medium text-text-primary">Get in touch</h3>
        <p class="mb-8 text-[1.02rem] font-light leading-[1.8] text-text-secondary">I'm currently open to freelance projects and full-time roles where I can work on meaningful products with thoughtful teams. I respond to every message within 24 hours.</p>

        <a href="/cdn-cgi/l/email-protection#3e565b5252517e4d4a5f5d555d4c5f584a105a5b48" class="contact-email mb-8 inline-flex items-center gap-3 font-display text-[1.35rem] text-accent transition-colors duration-300 hover:text-accent-light">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 8L2 4"/></svg>
          <span class="__cf_email__" data-cfemail="5c34393030331c2f283d3f373f2e3d3a287238392a">[email&#160;protected]</span>
        </a>

        <div class="social-links flex gap-4">
          <a href="#" class="social-link flex h-11 w-11 items-center justify-center rounded-lg border border-[rgba(201,169,110,0.12)] text-text-muted transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(201,169,110,0.25)] hover:bg-[rgba(201,169,110,0.05)] hover:text-accent" aria-label="GitHub">
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-[18px] w-[18px]"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
          </a>
          <a href="#" class="social-link flex h-11 w-11 items-center justify-center rounded-lg border border-[rgba(201,169,110,0.12)] text-text-muted transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(201,169,110,0.25)] hover:bg-[rgba(201,169,110,0.05)] hover:text-accent" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-[18px] w-[18px]"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </a>
          <a href="#" class="social-link flex h-11 w-11 items-center justify-center rounded-lg border border-[rgba(201,169,110,0.12)] text-text-muted transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(201,169,110,0.25)] hover:bg-[rgba(201,169,110,0.05)] hover:text-accent" aria-label="X / Twitter">
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-[18px] w-[18px]"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="#" class="social-link flex h-11 w-11 items-center justify-center rounded-lg border border-[rgba(201,169,110,0.12)] text-text-muted transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(201,169,110,0.25)] hover:bg-[rgba(201,169,110,0.05)] hover:text-accent" aria-label="Dev.to">
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-[18px] w-[18px]"><path d="M7.42 10.05c-.18-.16-.46-.23-.84-.23H6v4.36h.58c.37 0 .67-.08.84-.23.2-.18.3-.46.3-.94v-2c0-.49-.1-.79-.3-.96zm13.37-7.55H3.2C1.94 2.5 1 3.44 1 4.7v14.6c0 1.26.94 2.2 2.2 2.2h17.6c1.26 0 2.2-.94 2.2-2.2V4.7c0-1.26-.94-2.2-2.2-2.2zM9.08 14.8c0 .68-.12 1.24-.37 1.6-.3.44-.75.66-1.35.66H5V7.2h2.35c.6 0 1.05.22 1.35.66.25.37.37.9.37 1.6v5.34zm5.03-5.6H11.9v2.13h1.43v1.4H11.9v2.13h2.21v1.4H11.3c-.55 0-1-.45-1-1V7.8c0-.55.45-1 1-1h2.81v1.4zm4.97 6.25c-.25.58-.7.95-1.36.95-.54 0-.97-.2-1.3-.6l-.02-.02V16h-1.5V7.2h1.5v3.46l.02-.02c.32-.4.75-.6 1.3-.6.66 0 1.1.35 1.36.95.12.28.18.67.18 1.17v2.58c0 .5-.06.88-.18 1.17z"/></svg>
          </a>
        </div>
      </div>

      <div class="contact-form reveal flex flex-col gap-5">
        <div class="form-group flex flex-col gap-[0.4rem]">
          <label for="name" class="text-[0.82rem] font-medium uppercase tracking-[0.12em] text-text-muted">Name</label>
          <input type="text" id="name" placeholder="Your name" class="w-full rounded-md border border-[rgba(201,169,110,0.12)] bg-bg-card px-4 py-[0.9rem] font-body text-[0.95rem] font-light text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-dim">
        </div>
        <div class="form-group flex flex-col gap-[0.4rem]">
          <label for="email" class="text-[0.82rem] font-medium uppercase tracking-[0.12em] text-text-muted">Email</label>
          <input type="email" id="email" placeholder="you@example.com" class="w-full rounded-md border border-[rgba(201,169,110,0.12)] bg-bg-card px-4 py-[0.9rem] font-body text-[0.95rem] font-light text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-dim">
        </div>
        <div class="form-group flex flex-col gap-[0.4rem]">
          <label for="message" class="text-[0.82rem] font-medium uppercase tracking-[0.12em] text-text-muted">留言</label>
          <textarea id="message" placeholder="Tell me about your project..." class="min-h-[120px] w-full resize-y rounded-md border border-[rgba(201,169,110,0.12)] bg-bg-card px-4 py-[0.9rem] font-body text-[0.95rem] font-light text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-dim"></textarea>
        </div>
        <button type="button" class="btn-submit self-start rounded bg-accent px-8 py-[0.9rem] text-[0.88rem] font-medium uppercase tracking-[0.12em] text-bg-primary transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-light">发送消息</button>
      </div>
    </div>
  </div>
</section>

<!-- ============ FOOTER ============ -->
<footer class="footer border-t border-[rgba(201,169,110,0.12)] px-[clamp(1.5rem,4vw,3rem)] py-10 text-center">
  <p class="text-[0.88rem] tracking-[0.05em] text-text-muted">Designed &amp; built by <a href="#hero" class="text-accent transition-colors hover:text-accent-light">StackCraft</a> &mdash; Crafted with precision, shipped with care. Design: <a href="https://www.tooplate.com" rel="nofollow" target="_blank" class="text-accent transition-colors hover:text-accent-light">Tooplate</a></p>
</footer>

  <script src="tooplate-stackcraft-script.js"></script>

</body>
</html>
'''

with open(SRC, "w", encoding="utf-8") as f:
    f.write(HTML)

print("wrote", SRC, "bytes=", len(HTML))
