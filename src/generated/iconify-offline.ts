/* eslint-disable */
/**
 * 本文件由 scripts/build-iconify-offline.mjs 自动生成，请勿手工编辑。
 * 重新生成：npm run icons:build
 *
 * 作用：把项目实际用到的 95 个 Iconify 图标在构建期注入本地图标存储，
 * 使 <Icon> 解析完全离线——不再依赖 api.iconify.design，也不再有图标闪烁。
 * 若新增图标后忘记重新生成，npm run icons:check 会失败。
 */
import { addCollection } from '@iconify/vue'

type Collection = Parameters<typeof addCollection>[0]

/** 源码中扫描到的全部图标名，供单测校验本地存储能否解析（防止离线时静默空白）。 */
export const ICON_NAMES: string[] = [
  "lucide:arrow-right",
  "lucide:chevron-down",
  "lucide:chevron-right",
  "lucide:clock",
  "lucide:code",
  "lucide:copy",
  "lucide:heart",
  "lucide:key-round",
  "lucide:log-out",
  "lucide:moon",
  "lucide:search",
  "lucide:shield-check",
  "lucide:sun",
  "lucide:user",
  "lucide:x",
  "material-symbols:account-tree",
  "material-symbols:add",
  "material-symbols:add-circle",
  "material-symbols:arrow-back",
  "material-symbols:arrow-drop-down",
  "material-symbols:arrow-drop-up",
  "material-symbols:arrow-forward",
  "material-symbols:bolt",
  "material-symbols:bookmarks",
  "material-symbols:cancel",
  "material-symbols:check",
  "material-symbols:check-circle",
  "material-symbols:checklist",
  "material-symbols:chevron-right",
  "material-symbols:close",
  "material-symbols:cloud-upload",
  "material-symbols:code",
  "material-symbols:code-blocks",
  "material-symbols:code-off",
  "material-symbols:content-copy",
  "material-symbols:create-new-folder",
  "material-symbols:delete",
  "material-symbols:description",
  "material-symbols:dns",
  "material-symbols:download",
  "material-symbols:drive-file-move",
  "material-symbols:edit",
  "material-symbols:edit-note",
  "material-symbols:error",
  "material-symbols:error-outline",
  "material-symbols:favorite",
  "material-symbols:file-download",
  "material-symbols:file-upload",
  "material-symbols:filter-alt-off",
  "material-symbols:folder",
  "material-symbols:folder-copy",
  "material-symbols:folder-open",
  "material-symbols:format-list-numbered",
  "material-symbols:fullscreen",
  "material-symbols:history",
  "material-symbols:hourglass-top",
  "material-symbols:inbox",
  "material-symbols:info",
  "material-symbols:info-outline",
  "material-symbols:keyboard",
  "material-symbols:keyboard-command-key",
  "material-symbols:label",
  "material-symbols:layers",
  "material-symbols:library-add",
  "material-symbols:library-books",
  "material-symbols:lightbulb",
  "material-symbols:list-alt",
  "material-symbols:login",
  "material-symbols:monitor",
  "material-symbols:more-horiz",
  "material-symbols:note-add",
  "material-symbols:open-in-full",
  "material-symbols:open-in-new",
  "material-symbols:person",
  "material-symbols:play-arrow",
  "material-symbols:public",
  "material-symbols:refresh",
  "material-symbols:save",
  "material-symbols:schedule",
  "material-symbols:search",
  "material-symbols:search-off",
  "material-symbols:security",
  "material-symbols:sell",
  "material-symbols:settings-backup-restore",
  "material-symbols:smartphone",
  "material-symbols:star",
  "material-symbols:star-outline",
  "material-symbols:sync",
  "material-symbols:tablet",
  "material-symbols:travel-explore",
  "material-symbols:verified-user",
  "material-symbols:view-agenda",
  "material-symbols:view-column",
  "material-symbols:visibility",
  "material-symbols:wrap-text",
]

// lucide — 15 个图标
addCollection({
 "height": 24,
 "icons": {
  "arrow-right": {
   "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 12h14m-7-7l7 7l-7 7\"/>"
  },
  "chevron-down": {
   "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m6 9l6 6l6-6\"/>"
  },
  "chevron-right": {
   "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m9 18l6-6l-6-6\"/>"
  },
  "clock": {
   "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 6v6l4 2\"/></g>"
  },
  "code": {
   "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m16 18l6-6l-6-6M8 6l-6 6l6 6\"/>"
  },
  "copy": {
   "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\"/><path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\"/></g>"
  },
  "heart": {
   "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M2 9.5a5.5 5.5 0 0 1 9.591-3.676a.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5\"/>"
  },
  "key-round": {
   "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z\"/><circle cx=\"16.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/></g>"
  },
  "log-out": {
   "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m16 17l5-5l-5-5m5 5H9m0 9H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"/>"
  },
  "moon": {
   "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401\"/>"
  },
  "search": {
   "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"m21 21l-4.34-4.34\"/><circle cx=\"11\" cy=\"11\" r=\"8\"/></g>"
  },
  "shield-check": {
   "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/><path d=\"m9 12l2 2l4-4\"/></g>"
  },
  "sun": {
   "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41\"/></g>"
  },
  "user": {
   "body": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/></g>"
  },
  "x": {
   "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M18 6L6 18M6 6l12 12\"/>"
  }
 },
 "prefix": "lucide",
 "width": 24
} as Collection)

// material-symbols — 79 个图标
addCollection({
 "aliases": {
  "file-download": {
   "parent": "download"
  },
  "file-upload": {
   "parent": "upload"
  },
  "smartphone": {
   "parent": "mobile"
  }
 },
 "height": 24,
 "icons": {
  "account-tree": {
   "body": "<path fill=\"currentColor\" d=\"M15 21v-3h-4V8H9v3H2V3h7v3h6V3h7v8h-7V8h-2v8h2v-3h7v8z\"/>"
  },
  "add": {
   "body": "<path fill=\"currentColor\" d=\"M11 13H5v-2h6V5h2v6h6v2h-6v6h-2z\"/>"
  },
  "add-circle": {
   "body": "<path fill=\"currentColor\" d=\"M11 17h2v-4h4v-2h-4V7h-2v4H7v2h4zm1 5q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22\"/>"
  },
  "arrow-back": {
   "body": "<path fill=\"currentColor\" d=\"m7.825 13l5.6 5.6L12 20l-8-8l8-8l1.425 1.4l-5.6 5.6H20v2z\"/>"
  },
  "arrow-drop-down": {
   "body": "<path fill=\"currentColor\" d=\"m12 15l-5-5h10z\"/>"
  },
  "arrow-drop-up": {
   "body": "<path fill=\"currentColor\" d=\"m7 14l5-5l5 5z\"/>"
  },
  "arrow-forward": {
   "body": "<path fill=\"currentColor\" d=\"M16.175 13H4v-2h12.175l-5.6-5.6L12 4l8 8l-8 8l-1.425-1.4z\"/>"
  },
  "bolt": {
   "body": "<path fill=\"currentColor\" d=\"m8 22l1-7H4l9-13h2l-1 8h6L10 22z\"/>"
  },
  "bookmarks": {
   "body": "<path fill=\"currentColor\" d=\"M4 22V8q0-.825.588-1.412T6 6h8q.825 0 1.413.588T16 8v14l-6-3zm14-4V4H7V2h11q.825 0 1.413.588T20 4v14z\"/>"
  },
  "cancel": {
   "body": "<path fill=\"currentColor\" d=\"m8.4 17l3.6-3.6l3.6 3.6l1.4-1.4l-3.6-3.6L17 8.4L15.6 7L12 10.6L8.4 7L7 8.4l3.6 3.6L7 15.6zm3.6 5q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22\"/>"
  },
  "check": {
   "body": "<path fill=\"currentColor\" d=\"m9.55 18l-5.7-5.7l1.425-1.425L9.55 15.15l9.175-9.175L20.15 7.4z\"/>"
  },
  "check-circle": {
   "body": "<path fill=\"currentColor\" d=\"m10.6 16.6l7.05-7.05l-1.4-1.4l-5.65 5.65l-2.85-2.85l-1.4 1.4zM12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22\"/>"
  },
  "checklist": {
   "body": "<path fill=\"currentColor\" d=\"M5.55 19L2 15.45l1.4-1.4l2.125 2.125l4.25-4.25l1.4 1.425zm0-8L2 7.45l1.4-1.4l2.125 2.125l4.25-4.25l1.4 1.425zM13 17v-2h9v2zm0-8V7h9v2z\"/>"
  },
  "chevron-right": {
   "body": "<path fill=\"currentColor\" d=\"M12.6 12L8 7.4L9.4 6l6 6l-6 6L8 16.6z\"/>"
  },
  "close": {
   "body": "<path fill=\"currentColor\" d=\"M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z\"/>"
  },
  "cloud-upload": {
   "body": "<path fill=\"currentColor\" d=\"M11 20H6.5q-2.275 0-3.887-1.575T1 14.575q0-1.95 1.175-3.475T5.25 9.15q.625-2.3 2.5-3.725T12 4q2.925 0 4.963 2.038T19 11q1.725.2 2.863 1.488T23 15.5q0 1.875-1.312 3.188T18.5 20H13v-7.15l1.6 1.55L16 13l-4-4l-4 4l1.4 1.4l1.6-1.55z\"/>"
  },
  "code": {
   "body": "<path fill=\"currentColor\" d=\"m8 18l-6-6l6-6l1.425 1.425l-4.6 4.6L9.4 16.6zm8 0l-1.425-1.425l4.6-4.6L14.6 7.4L16 6l6 6z\"/>"
  },
  "code-blocks": {
   "body": "<path fill=\"currentColor\" d=\"m9.6 15.6l1.4-1.425L8.825 12L11 9.825L9.6 8.4L6 12zm4.8 0L18 12l-3.6-3.6L13 9.825L15.175 12L13 14.175zM5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21z\"/>"
  },
  "code-off": {
   "body": "<path fill=\"currentColor\" d=\"M19.775 22.625L7 9.85l-2.175 2.175L9.4 16.6L8 18l-6-6l3.575-3.575l-4.2-4.2L2.8 2.8l18.4 18.4zm-1.35-7.05L17 14.15l2.175-2.175L14.6 7.4L16 6l6 6z\"/>"
  },
  "content-copy": {
   "body": "<path fill=\"currentColor\" d=\"M9 18q-.825 0-1.412-.587T7 16V4q0-.825.588-1.412T9 2h9q.825 0 1.413.588T20 4v12q0 .825-.587 1.413T18 18zm-4 4q-.825 0-1.412-.587T3 20V6h2v14h11v2z\"/>"
  },
  "create-new-folder": {
   "body": "<path fill=\"currentColor\" d=\"M14 16h2v-2h2v-2h-2v-2h-2v2h-2v2h2zM4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h6l2 2h8q.825 0 1.413.588T22 8v10q0 .825-.587 1.413T20 20z\"/>"
  },
  "delete": {
   "body": "<path fill=\"currentColor\" d=\"M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zm2-4h2V8H9zm4 0h2V8h-2z\"/>"
  },
  "description": {
   "body": "<path fill=\"currentColor\" d=\"M8 18h8v-2H8zm0-4h8v-2H8zm-2 8q-.825 0-1.412-.587T4 20V4q0-.825.588-1.412T6 2h8l6 6v12q0 .825-.587 1.413T18 22zm7-13h5l-5-5z\"/>"
  },
  "dns": {
   "body": "<path fill=\"currentColor\" d=\"M7.5 6q-.625 0-1.062.438T6 7.5t.438 1.063T7.5 9t1.063-.437T9 7.5t-.437-1.062T7.5 6m0 10q-.625 0-1.062.438T6 17.5t.438 1.063T7.5 19t1.063-.437T9 17.5t-.437-1.062T7.5 16M4 3h16q.425 0 .713.288T21 4v7q0 .425-.288.713T20 12H4q-.425 0-.712-.288T3 11V4q0-.425.288-.712T4 3m0 10h16q.425 0 .713.288T21 14v7q0 .425-.288.713T20 22H4q-.425 0-.712-.288T3 21v-7q0-.425.288-.712T4 13\"/>"
  },
  "download": {
   "body": "<path fill=\"currentColor\" d=\"m12 16l-5-5l1.4-1.45l2.6 2.6V4h2v8.15l2.6-2.6L17 11zm-6 4q-.825 0-1.412-.587T4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413T18 20z\"/>"
  },
  "drive-file-move": {
   "body": "<path fill=\"currentColor\" d=\"M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h6l2 2h8q.825 0 1.413.588T22 8v10q0 .825-.587 1.413T20 20zm8.2-6l-1.625 1.625l1.4 1.4L16 13l-4.025-4.025l-1.4 1.4L12.2 12H8v2z\"/>"
  },
  "edit": {
   "body": "<path fill=\"currentColor\" d=\"M3 21v-4.25L16.2 3.575q.3-.275.663-.425t.762-.15t.775.15t.65.45L20.425 5q.3.275.438.65T21 6.4q0 .4-.137.763t-.438.662L7.25 21zM17.6 7.8L19 6.4L17.6 5l-1.4 1.4z\"/>"
  },
  "edit-note": {
   "body": "<path fill=\"currentColor\" d=\"M4 14v-2h7v2zm0-4V8h11v2zm0-4V4h11v2zm9 14v-3.075l5.525-5.5q.225-.225.5-.325t.55-.1q.3 0 .575.113t.5.337l.925.925q.2.225.313.5t.112.55t-.1.563t-.325.512l-5.5 5.5zm6.575-5.6l.925-.975l-.925-.925l-.95.95z\"/>"
  },
  "error": {
   "body": "<path fill=\"currentColor\" d=\"M12.713 16.713Q13 16.425 13 16t-.288-.712T12 15t-.712.288T11 16t.288.713T12 17t.713-.288M11 13h2V7h-2zm1 9q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22\"/>"
  },
  "error-outline": {
   "body": "<path fill=\"currentColor\" d=\"M12.713 16.713Q13 16.425 13 16t-.288-.712T12 15t-.712.288T11 16t.288.713T12 17t.713-.288M11 13h2V7h-2zm1 9q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8\"/>"
  },
  "favorite": {
   "body": "<path fill=\"currentColor\" d=\"m12 21l-1.45-1.3q-2.525-2.275-4.175-3.925T3.75 12.812T2.388 10.4T2 8.15Q2 5.8 3.575 4.225T7.5 2.65q1.3 0 2.475.55T12 4.75q.85-1 2.025-1.55t2.475-.55q2.35 0 3.925 1.575T22 8.15q0 1.15-.387 2.25t-1.363 2.412t-2.625 2.963T13.45 19.7z\"/>"
  },
  "filter-alt-off": {
   "body": "<path fill=\"currentColor\" d=\"M14.8 11.975L6.825 4H19q.625 0 .9.55t-.1 1.05zM19.775 22.6L14 16.825V19q0 .425-.288.713T13 20h-2q-.425 0-.712-.288T10 19v-6.175l-8.6-8.6L2.8 2.8l18.4 18.4z\"/>"
  },
  "folder": {
   "body": "<path fill=\"currentColor\" d=\"M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h6l2 2h8q.825 0 1.413.588T22 8v10q0 .825-.587 1.413T20 20z\"/>"
  },
  "folder-copy": {
   "body": "<path fill=\"currentColor\" d=\"M3 21q-.825 0-1.412-.587T1 19V6h2v13h17v2zm4-4q-.825 0-1.412-.587T5 15V4q0-.825.588-1.412T7 2h5l2 2h7q.825 0 1.413.588T23 6v9q0 .825-.587 1.413T21 17z\"/>"
  },
  "folder-open": {
   "body": "<path fill=\"currentColor\" d=\"M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h6l2 2h8q.825 0 1.413.588T22 8H4v10l2.4-8h17.1l-2.575 8.575q-.2.65-.737 1.038T19 20z\"/>"
  },
  "format-list-numbered": {
   "body": "<path fill=\"currentColor\" d=\"M3 22v-1.5h2.5v-.75H4v-1.5h1.5v-.75H3V16h3q.425 0 .713.288T7 17v1q0 .425-.288.713T6 19q.425 0 .713.288T7 20v1q0 .425-.288.713T6 22zm0-7v-2.75q0-.425.288-.712T4 11.25h1.5v-.75H3V9h3q.425 0 .713.288T7 10v1.75q0 .425-.288.713T6 12.75H4.5v.75H7V15zm1.5-7V3.5H3V2h3v6zM9 19v-2h12v2zm0-6v-2h12v2zm0-6V5h12v2z\"/>"
  },
  "fullscreen": {
   "body": "<path fill=\"currentColor\" d=\"M3 21v-5h2v3h3v2zm13 0v-2h3v-3h2v5zM3 8V3h5v2H5v3zm16 0V5h-3V3h5v5z\"/>"
  },
  "history": {
   "body": "<path fill=\"currentColor\" d=\"M12 21q-3.45 0-6.012-2.287T3.05 13H5.1q.35 2.6 2.313 4.3T12 19q2.925 0 4.963-2.037T19 12t-2.037-4.962T12 5q-1.725 0-3.225.8T6.25 8H9v2H3V4h2v2.35q1.275-1.6 3.113-2.475T12 3q1.875 0 3.513.713t2.85 1.924t1.925 2.85T21 12t-.712 3.513t-1.925 2.85t-2.85 1.925T12 21m2.8-4.8L11 12.4V7h2v4.6l3.2 3.2z\"/>"
  },
  "hourglass-top": {
   "body": "<path fill=\"currentColor\" d=\"M8 20h8v-3q0-1.65-1.175-2.825T12 13t-2.825 1.175T8 17zm-4 2v-2h2v-3q0-1.525.713-2.863T8.7 12q-1.275-.8-1.987-2.137T6 7V4H4V2h16v2h-2v3q0 1.525-.712 2.863T15.3 12q1.275.8 1.988 2.138T18 17v3h2v2z\"/>"
  },
  "inbox": {
   "body": "<path fill=\"currentColor\" d=\"M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm8.725-5.55Q14.5 14.9 14.8 14H19V5H5v9h4.2q.3.9 1.075 1.45T12 16t1.725-.55\"/>"
  },
  "info": {
   "body": "<path fill=\"currentColor\" d=\"M11 17h2v-6h-2zm1.713-8.287Q13 8.425 13 8t-.288-.712T12 7t-.712.288T11 8t.288.713T12 9t.713-.288M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22\"/>"
  },
  "info-outline": {
   "body": "<path fill=\"currentColor\" d=\"M11 17h2v-6h-2zm1.713-8.287Q13 8.425 13 8t-.288-.712T12 7t-.712.288T11 8t.288.713T12 9t.713-.288M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8\"/>"
  },
  "keyboard": {
   "body": "<path fill=\"currentColor\" d=\"M4 19q-.825 0-1.412-.587T2 17V7q0-.825.588-1.412T4 5h16q.825 0 1.413.588T22 7v10q0 .825-.587 1.413T20 19zm4-3h8v-2H8zm-3-3h2v-2H5zm3 0h2v-2H8zm3 0h2v-2h-2zm3 0h2v-2h-2zm3 0h2v-2h-2zM5 10h2V8H5zm3 0h2V8H8zm3 0h2V8h-2zm3 0h2V8h-2zm3 0h2V8h-2z\"/>"
  },
  "keyboard-command-key": {
   "body": "<path fill=\"currentColor\" d=\"M6.5 21q-1.45 0-2.475-1.025T3 17.5t1.025-2.475T6.5 14H8v-4H6.5q-1.45 0-2.475-1.025T3 6.5t1.025-2.475T6.5 3t2.475 1.025T10 6.5V8h4V6.5q0-1.45 1.025-2.475T17.5 3t2.475 1.025T21 6.5t-1.025 2.475T17.5 10H16v4h1.5q1.45 0 2.475 1.025T21 17.5t-1.025 2.475T17.5 21t-2.475-1.025T14 17.5V16h-4v1.5q0 1.45-1.025 2.475T6.5 21m0-2q.625 0 1.063-.437T8 17.5V16H6.5q-.625 0-1.062.438T5 17.5t.438 1.063T6.5 19m11 0q.625 0 1.063-.437T19 17.5t-.437-1.062T17.5 16H16v1.5q0 .625.438 1.063T17.5 19M10 14h4v-4h-4zM6.5 8H8V6.5q0-.625-.437-1.062T6.5 5t-1.062.438T5 6.5t.438 1.063T6.5 8M16 8h1.5q.625 0 1.063-.437T19 6.5t-.437-1.062T17.5 5t-1.062.438T16 6.5z\"/>"
  },
  "label": {
   "body": "<path fill=\"currentColor\" d=\"M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h11q.475 0 .9.213t.7.587L22 12l-5.4 7.2q-.275.375-.7.588T15 20z\"/>"
  },
  "layers": {
   "body": "<path fill=\"currentColor\" d=\"m12 21.05l-9-7l1.65-1.25L12 18.5l7.35-5.7L21 14.05zM12 16L3 9l9-7l9 7z\"/>"
  },
  "library-add": {
   "body": "<path fill=\"currentColor\" d=\"M13 14h2v-3h3V9h-3V6h-2v3h-3v2h3zm-5 4q-.825 0-1.412-.587T6 16V4q0-.825.588-1.412T8 2h12q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18zm-4 4q-.825 0-1.412-.587T2 20V6h2v14h14v2z\"/>"
  },
  "library-books": {
   "body": "<path fill=\"currentColor\" d=\"M10 14h4v-2h-4zm0-3h8V9h-8zm0-3h8V6h-8zM8 18q-.825 0-1.412-.587T6 16V4q0-.825.588-1.412T8 2h12q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18zm-4 4q-.825 0-1.412-.587T2 20V6h2v14h14v2z\"/>"
  },
  "lightbulb": {
   "body": "<path fill=\"currentColor\" d=\"M10.588 21.413Q10 20.825 10 20h4q0 .825-.587 1.413T12 22t-1.412-.587M8 19v-2h8v2zm.25-3q-1.725-1.025-2.738-2.75T4.5 9.5q0-3.125 2.188-5.312T12 2t5.313 2.188T19.5 9.5q0 2.025-1.012 3.75T15.75 16z\"/>"
  },
  "list-alt": {
   "body": "<path fill=\"currentColor\" d=\"M8.713 16.713Q9 16.425 9 16t-.288-.712T8 15t-.712.288T7 16t.288.713T8 17t.713-.288m0-4Q9 12.425 9 12t-.288-.712T8 11t-.712.288T7 12t.288.713T8 13t.713-.288m0-4Q9 8.426 9 8t-.288-.712T8 7t-.712.288T7 8t.288.713T8 9t.713-.288M11 17h6v-2h-6zm0-4h6v-2h-6zm0-4h6V7h-6zM5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21z\"/>"
  },
  "login": {
   "body": "<path fill=\"currentColor\" d=\"M12 21v-2h7V5h-7V3h7q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm-2-4l-1.375-1.45l2.55-2.55H3v-2h8.175l-2.55-2.55L10 7l5 5z\"/>"
  },
  "mobile": {
   "body": "<path fill=\"currentColor\" d=\"M7 23q-.825 0-1.412-.587T5 21V3q0-.825.588-1.412T7 1h10q.825 0 1.413.588T19 3v3.1q.45.175.725.55T20 7.5v2q0 .475-.275.85T19 10.9V21q0 .825-.587 1.413T17 23zm5.713-17.287Q13 5.424 13 5t-.288-.712T12 4t-.712.288T11 5t.288.713T12 6t.713-.288\"/>"
  },
  "monitor": {
   "body": "<path fill=\"currentColor\" d=\"M6 21v-2l1-1H4q-.825 0-1.412-.587T2 16V5q0-.825.588-1.412T4 3h16q.825 0 1.413.588T22 5v11q0 .825-.587 1.413T20 18h-3l1 1v2z\"/>"
  },
  "more-horiz": {
   "body": "<path fill=\"currentColor\" d=\"M6 14q-.825 0-1.412-.587T4 12t.588-1.412T6 10t1.413.588T8 12t-.587 1.413T6 14m6 0q-.825 0-1.412-.587T10 12t.588-1.412T12 10t1.413.588T14 12t-.587 1.413T12 14m6 0q-.825 0-1.412-.587T16 12t.588-1.412T18 10t1.413.588T20 12t-.587 1.413T18 14\"/>"
  },
  "note-add": {
   "body": "<path fill=\"currentColor\" d=\"M11 18h2v-3h3v-2h-3v-3h-2v3H8v2h3zm-5 4q-.825 0-1.412-.587T4 20V4q0-.825.588-1.412T6 2h8l6 6v12q0 .825-.587 1.413T18 22zm7-13h5l-5-5z\"/>"
  },
  "open-in-full": {
   "body": "<path fill=\"currentColor\" d=\"M3 21v-8h2v4.6L17.6 5H13V3h8v8h-2V6.4L6.4 19H11v2z\"/>"
  },
  "open-in-new": {
   "body": "<path fill=\"currentColor\" d=\"M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h7v2H5v14h14v-7h2v7q0 .825-.587 1.413T19 21zm4.7-5.3l-1.4-1.4L17.6 5H14V3h7v7h-2V6.4z\"/>"
  },
  "person": {
   "body": "<path fill=\"currentColor\" d=\"M9.175 10.825Q8 9.65 8 8t1.175-2.825T12 4t2.825 1.175T16 8t-1.175 2.825T12 12t-2.825-1.175M4 20v-2.8q0-.85.438-1.562T5.6 14.55q1.55-.775 3.15-1.162T12 13t3.25.388t3.15 1.162q.725.375 1.163 1.088T20 17.2V20z\"/>"
  },
  "play-arrow": {
   "body": "<path fill=\"currentColor\" d=\"M8 19V5l11 7z\"/>"
  },
  "public": {
   "body": "<path fill=\"currentColor\" d=\"M8.1 21.213q-1.825-.788-3.175-2.138T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22t-3.9-.788M11 19.95V18q-.825 0-1.412-.587T9 16v-1l-4.8-4.8q-.075.45-.137.9T4 12q0 3.025 1.988 5.3T11 19.95m6.9-2.55q1.025-1.125 1.563-2.512T20 12q0-2.45-1.362-4.475T15 4.6V5q0 .825-.587 1.413T13 7h-2v2q0 .425-.288.713T10 10H8v2h6q.425 0 .713.288T15 13v3h1q.65 0 1.175.388T17.9 17.4\"/>"
  },
  "refresh": {
   "body": "<path fill=\"currentColor\" d=\"M12 20q-3.35 0-5.675-2.325T4 12t2.325-5.675T12 4q1.725 0 3.3.712T18 6.75V4h2v7h-7V9h4.2q-.8-1.4-2.187-2.2T12 6Q9.5 6 7.75 7.75T6 12t1.75 4.25T12 18q1.925 0 3.475-1.1T17.65 14h2.1q-.7 2.65-2.85 4.325T12 20\"/>"
  },
  "save": {
   "body": "<path fill=\"currentColor\" d=\"M21 7v12q0 .825-.587 1.413T19 21H5q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h12zm-6.875 10.125Q15 16.25 15 15t-.875-2.125T12 12t-2.125.875T9 15t.875 2.125T12 18t2.125-.875M6 10h9V6H6z\"/>"
  },
  "schedule": {
   "body": "<path fill=\"currentColor\" d=\"m15.3 16.7l1.4-1.4l-3.7-3.7V7h-2v5.4zM12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22\"/>"
  },
  "search": {
   "body": "<path fill=\"currentColor\" d=\"m19.6 21l-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14\"/>"
  },
  "search-off": {
   "body": "<path fill=\"currentColor\" d=\"M3.463 20.538Q2 19.075 2 17t1.463-3.537T7 12t3.538 1.463T12 17t-1.463 3.538T7 22t-3.537-1.463M20.6 21l-6.4-6.4q-.3-.325-.637-.662T12.9 13.3q.95-.6 1.525-1.6T15 9.5q0-1.875-1.312-3.187T10.5 5T7.313 6.313T6 9.5q0 .15.013.288t.037.287q-.45.05-.987.2t-.963.35q-.05-.275-.075-.55T4 9.5q0-2.725 1.888-4.612T10.5 3t4.613 1.888T17 9.5q0 1.075-.337 2.038t-.938 1.762L22 19.6zM5.225 19.475L7 17.7l1.75 1.775l.725-.7L7.7 17l1.775-1.775l-.7-.7L7 16.3l-1.775-1.775l-.7.7L6.3 17l-1.775 1.775z\"/>"
  },
  "security": {
   "body": "<path fill=\"currentColor\" d=\"M12 22q-3.475-.875-5.738-3.988T4 11.1V5l8-3l8 3v6.1q0 3.8-2.262 6.913T12 22m0-2.1q2.425-.75 4.05-2.963T17.95 12H12V4.125l-6 2.25v5.175q0 .175.05.45H12z\"/>"
  },
  "sell": {
   "body": "<path fill=\"currentColor\" d=\"m21.4 14.25l-7.15 7.15q-.3.3-.675.45t-.75.15t-.75-.15t-.675-.45l-8.825-8.825q-.275-.275-.425-.637T2 11.175V4q0-.825.588-1.412T4 2h7.175q.4 0 .775.163t.65.437l8.8 8.825q.3.3.438.675t.137.75t-.137.738t-.438.662M6.5 8q.625 0 1.063-.437T8 6.5t-.437-1.062T6.5 5t-1.062.438T5 6.5t.438 1.063T6.5 8\"/>"
  },
  "settings-backup-restore": {
   "body": "<path fill=\"currentColor\" d=\"M12 14q-.825 0-1.412-.587T10 12t.588-1.412T12 10t1.413.588T14 12t-.587 1.413T12 14m0 7q-3.475 0-6.025-2.287T3.05 13H5.1q.35 2.6 2.313 4.3T12 19q2.925 0 4.963-2.037T19 12t-2.037-4.962T12 5q-1.725 0-3.225.8T6.25 8H9v2H3V4h2v2.35q1.275-1.6 3.113-2.475T12 3q1.875 0 3.513.713t2.85 1.924t1.925 2.85T21 12t-.712 3.513t-1.925 2.85t-2.85 1.925T12 21\"/>"
  },
  "star": {
   "body": "<path fill=\"currentColor\" d=\"m5.825 21l1.625-7.025L2 9.25l7.2-.625L12 2l2.8 6.625l7.2.625l-5.45 4.725L18.175 21L12 17.275z\"/>"
  },
  "star-outline": {
   "body": "<path fill=\"currentColor\" d=\"m8.85 16.825l3.15-1.9l3.15 1.925l-.825-3.6l2.775-2.4l-3.65-.325l-1.45-3.4l-1.45 3.375l-3.65.325l2.775 2.425zM5.825 21l1.625-7.025L2 9.25l7.2-.625L12 2l2.8 6.625l7.2.625l-5.45 4.725L18.175 21L12 17.275zM12 12.25\"/>"
  },
  "sync": {
   "body": "<path fill=\"currentColor\" d=\"M4 20v-2h2.75l-.4-.35q-1.225-1.225-1.787-2.662T4 12.05q0-2.775 1.663-4.937T10 4.25v2.1Q8.2 7 7.1 8.563T6 12.05q0 1.125.425 2.188T7.75 16.2l.25.25V14h2v6zm10-.25v-2.1q1.8-.65 2.9-2.212T18 11.95q0-1.125-.425-2.187T16.25 7.8L16 7.55V10h-2V4h6v2h-2.75l.4.35q1.225 1.225 1.788 2.663T20 11.95q0 2.775-1.662 4.938T14 19.75\"/>"
  },
  "tablet": {
   "body": "<path fill=\"currentColor\" d=\"M3 20q-.825 0-1.412-.587T1 18V6q0-.825.588-1.412T3 4h18q.825 0 1.413.588T23 6v12q0 .825-.587 1.413T21 20zm3-2h12V6H6z\"/>"
  },
  "travel-explore": {
   "body": "<path fill=\"currentColor\" d=\"M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2q3.65 0 6.388 2.288t3.412 5.737h-2.05q-.475-1.825-1.713-3.262T15 4.6V5q0 .825-.587 1.413T13 7h-2v2q0 .425-.288.713T10 10H8v2h2v3H9l-4.8-4.8q-.075.45-.137.9T4 12q0 3.275 2.3 5.625T12 20zm9.1-.5l-3.2-3.2q-.525.3-1.125.5T15.5 19q-1.875 0-3.187-1.312T11 14.5t1.313-3.187T15.5 10t3.188 1.313T20 14.5q0 .675-.2 1.275t-.5 1.125l3.2 3.2zm-3.825-5.225Q18 15.55 18 14.5t-.725-1.775T15.5 12t-1.775.725T13 14.5t.725 1.775T15.5 17t1.775-.725\"/>"
  },
  "upload": {
   "body": "<path fill=\"currentColor\" d=\"M11 16V7.85l-2.6 2.6L7 9l5-5l5 5l-1.4 1.45l-2.6-2.6V16zm-5 4q-.825 0-1.412-.587T4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413T18 20z\"/>"
  },
  "verified-user": {
   "body": "<path fill=\"currentColor\" d=\"M10.95 15.55L16.6 9.9l-1.425-1.425L10.95 12.7l-2.1-2.1l-1.425 1.425zM12 22q-3.475-.875-5.737-3.988T4 11.1V5l8-3l8 3v6.1q0 3.8-2.262 6.913T12 22\"/>"
  },
  "view-agenda": {
   "body": "<path fill=\"currentColor\" d=\"M5 11q-.825 0-1.412-.587T3 9V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v4q0 .825-.587 1.413T19 11zm0 10q-.825 0-1.412-.587T3 19v-4q0-.825.588-1.412T5 13h14q.825 0 1.413.588T21 15v4q0 .825-.587 1.413T19 21z\"/>"
  },
  "view-column": {
   "body": "<path fill=\"currentColor\" d=\"M5 19q-.825 0-1.412-.587T3 17V7q0-.825.588-1.412T5 5h1.325q.825 0 1.413.588T8.325 7v10q0 .825-.587 1.413T6.325 19zm6.325 0q-.825 0-1.412-.587T9.325 17V7q0-.825.588-1.412T11.325 5h1.325q.825 0 1.413.588T14.65 7v10q0 .825-.587 1.413T12.65 19zm6.325 0q-.825 0-1.412-.587T15.65 17V7q0-.825.588-1.412T17.65 5h1.325q.825 0 1.413.588T20.975 7v10q0 .825-.587 1.413T18.975 19z\"/>"
  },
  "visibility": {
   "body": "<path fill=\"currentColor\" d=\"M15.188 14.688Q16.5 13.375 16.5 11.5t-1.312-3.187T12 7T8.813 8.313T7.5 11.5t1.313 3.188T12 16t3.188-1.312m-5.1-1.276Q9.3 12.625 9.3 11.5t.788-1.912T12 8.8t1.913.788t.787 1.912t-.787 1.913T12 14.2t-1.912-.787m-4.738 3.55Q2.35 14.925 1 11.5q1.35-3.425 4.35-5.462T12 4t6.65 2.038T23 11.5q-1.35 3.425-4.35 5.463T12 19t-6.65-2.037\"/>"
  },
  "wrap-text": {
   "body": "<path fill=\"currentColor\" d=\"M14.7 20.7L11 17l3.7-3.7l1.4 1.45L14.85 16h2.4q.725 0 1.238-.513T19 14.25t-.513-1.237t-1.237-.513H4v-2h13.25q1.575 0 2.663 1.088T21 14.25t-1.088 2.663T17.25 18h-2.4l1.25 1.25zM4 18v-2h5v2zM4 7V5h16v2z\"/>"
  }
 },
 "prefix": "material-symbols",
 "width": 24
} as Collection)
