#!/usr/bin/env python3
"""Add scroll-reveal animations to all Wegic templates."""

import os

WEGIC = "/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic"

CSS = """<style>
.wb-reveal{opacity:0;transform:translateY(30px);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)}
.wb-reveal.wb-visible{opacity:1;transform:translateY(0)}
</style>"""

JS = """<script>
(function(){
  function init(){
    var els=document.querySelectorAll('section, .grid>*,[class*=card]:not([class*=nav]),[class*=Card],article');
    els.forEach(function(el,i){
      if(el.closest('header,footer,nav,[role=banner]'))return;
      if(el.querySelector('header,footer,nav'))return;
      el.classList.add('wb-reveal');
    });
    var observer=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('wb-visible');
          observer.unobserve(e.target);
        }
      });
    },{threshold:.1,rootMargin:'0px 0px -20px 0px'});
    document.querySelectorAll('.wb-reveal').forEach(function(el,i){
      el.style.transitionDelay=(i%5)*.06+'s';
      observer.observe(el);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
</script>"""


def main():
    fixed = 0
    for i in range(1, 103):
        path = os.path.join(WEGIC, str(i), 'index.html')
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8') as f:
            html = f.read()

        if CSS in html or JS in html:
            continue

        # Inject CSS before </head>
        html = html.replace('</head>', CSS + '\n</head>', 1)
        # Inject JS before </body>
        html = html.replace('</body>', JS + '\n</body>', 1)

        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        fixed += 1
        print(f'  [#{i}] ✓')

    print(f'\n已为 {fixed} 个模版注入滚动动画')


if __name__ == '__main__':
    main()
