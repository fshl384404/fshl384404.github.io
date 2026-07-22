---
title: 分类与标签
date: 2026-07-19 22:00:00
description: 按分类和标签浏览文章
top_img:
---

<style>
  .cat-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin-bottom: 32px;
  }
  .cat-card {
    position: relative;
    border-radius: 12px;
    height: 200px;
    background-size: cover;
    background-position: center;
    cursor: pointer;
    overflow: hidden;
    text-decoration: none;
    transition: transform .3s cubic-bezier(.4,0,.2,1), box-shadow .3s cubic-bezier(.4,0,.2,1);
    box-shadow: 0 2px 8px rgba(0,0,0,.08);
  }
  .cat-card:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 8px 24px rgba(0,0,0,.15);
  }
  .cat-card:active {
    transform: scale(.97);
    transition: transform .1s;
  }
  .cat-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,.65) 0%, rgba(0,0,0,.1) 50%, transparent 100%);
    z-index: 1;
    transition: background .3s;
  }
  .cat-card:hover::before {
    background: linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.2) 50%, transparent 100%);
  }
  /* empty category: dim the overlay */
  .cat-card.empty::before {
    background: linear-gradient(to top, rgba(0,0,0,.5) 0%, rgba(0,0,0,.15) 50%, transparent 100%);
  }
  .cat-card.empty:hover::before {
    background: linear-gradient(to top, rgba(0,0,0,.6) 0%, rgba(0,0,0,.25) 50%, transparent 100%);
  }
  /* click ripple */
  .cat-card .ripple {
    position: absolute;
    inset: 0;
    z-index: 3;
    background: rgba(255,255,255,.25);
    animation: rippleIn .35s ease-out forwards;
    pointer-events: none;
  }
  @keyframes rippleIn {
    0%   { opacity: 0; }
    40%  { opacity: 1; }
    100% { opacity: 0; }
  }
  .cat-card .card-body {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    z-index: 2;
    padding: 20px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
  }
  .cat-card .card-name {
    color: #fff;
    font-size: 1.35em;
    font-weight: 700;
    letter-spacing: 1px;
    text-shadow: 0 1px 4px rgba(0,0,0,.3);
  }
  .cat-card .card-count {
    color: rgba(255,255,255,.85);
    font-size: .85em;
    background: rgba(255,255,255,.15);
    backdrop-filter: blur(4px);
    border-radius: 20px;
    padding: 3px 12px;
    white-space: nowrap;
  }
  .cat-card.empty .card-count {
    background: rgba(255,255,255,.08);
    color: rgba(255,255,255,.45);
  }
  .cat-card.empty .card-name {
    opacity: .65;
  }

  /* Tags section */
  .tax-section { margin-bottom: 24px; }
  .tax-section h3 { margin-bottom: 12px; }
  .tax-list a {
    display: inline-block; margin: 4px 8px; padding: 4px 14px;
    border-radius: 14px; font-size: .9em; text-decoration: none;
    transition: all .2s;
  }
  .tax-list a.tag { background: rgba(152,195,121,.14); color: #6a9b4a; }
  .tax-list a:hover { transform: translateY(-1px); opacity: .8; }
  .tax-list sup { font-size: .75em; opacity: .7; }

  @media (max-width: 768px) {
    .cat-grid { grid-template-columns: 1fr; }
    .cat-card { height: 160px; }
  }
</style>

<div id="cat-grid" class="cat-grid">加载中...</div>

<div class="tax-section">
  <h3>🏷️ 标签</h3>
  <div class="tax-list" id="tag-list">加载中...</div>
</div>

<script>
(function(){
  /* Fixed category taxonomy: name, image index, optional description */
  var CATALOG = [
    { name: '穷理', img: 1 },
    { name: '履践', img: 2 },
    { name: '漫笔', img: 3 },
    { name: '拾遗', img: 4 }
  ];

  fetch('/search.xml').then(function(r){return r.text()}).then(function(xml){
    /* parse counts from search.xml */
    var cats={}, tags={};
    (xml.match(/<category>(.*?)<\/category>/g)||[]).forEach(function(c){
      var n=c.replace(/<\/?category>/g,'').trim(); if(n)cats[n]=(cats[n]||0)+1;
    });
    (xml.match(/<tag>(.*?)<\/tag>/g)||[]).forEach(function(t){
      var n=t.replace(/<\/?tag>/g,'').trim(); if(n)tags[n]=(tags[n]||0)+1;
    });

    /* ---- category cards ---- */
    var g = document.getElementById('cat-grid');
    var h = '';
    CATALOG.forEach(function(cat){
      var count = cats[cat.name] || 0;
      var emptyClass = count === 0 ? ' empty' : '';
      var href = count > 0 ? ' href="/categories/' + encodeURIComponent(cat.name) + '/"' : '';
      h += '<a class="cat-card' + emptyClass + '"' + href + ' style="background-image:url(\'/img/categories' + cat.img + '.webp\')">';
      h += '<span class="card-body"><span class="card-name">' + cat.name + '</span><span class="card-count">' + (count > 0 ? count + ' 篇' : '暂无文章') + '</span></span>';
      h += '</a>';
    });
    g.innerHTML = h;

    /* click animation */
    var cards = g.querySelectorAll('.cat-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function(e){
        var card = this;
        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        card.appendChild(ripple);
        if (card.classList.contains('empty')) {
          /* empty category: shake to indicate no content yet */
          e.preventDefault();
          card.style.transform = 'translateX(-3px)';
          setTimeout(function(){ card.style.transform = ''; }, 80);
          setTimeout(function(){ card.style.transform = 'translateX(3px)'; }, 160);
          setTimeout(function(){ card.style.transform = ''; }, 240);
          return;
        }
        /* has content: ripple then navigate */
        e.preventDefault();
        var href = card.getAttribute('href');
        setTimeout(function(){
          window.location.href = href;
        }, 250);
      });
    }

    /* ---- tag pills ---- */
    var th = '';
    Object.keys(tags).sort().forEach(function(t){
      th += '<a class="tag" href="/categories/' + encodeURIComponent(t) + '/">' + t + ' <sup>' + tags[t] + '</sup></a>';
    });
    document.getElementById('tag-list').innerHTML = th || '暂无标签';
  });
})();
</script>
