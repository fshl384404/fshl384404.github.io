---
title: 分类与标签
date: 2026-07-19 22:00:00
description: 按分类和标签浏览文章
top_img:
---

<style>
  .tax-list a { display:inline-block; margin:4px 8px; padding:4px 14px; border-radius:14px; font-size:.9em; text-decoration:none; transition:all .2s; }
  .tax-list a.cat { background:rgba(91,155,213,.1); color:#5b9bd5; }
  .tax-list a.tag { background:rgba(152,195,121,.14); color:#6a9b4a; }
  .tax-list a:hover { transform:translateY(-1px); opacity:.8; }
  .tax-list sup { font-size:.75em; opacity:.7; }
  .tax-section { margin-bottom:24px; }
  .tax-section h3 { margin-bottom:10px; }
</style>

<div class="tax-section">
  <h3>📂 分类</h3>
  <div class="tax-list" id="cat-list">加载中...</div>
</div>

<div class="tax-section">
  <h3>🏷️ 标签</h3>
  <div class="tax-list" id="tag-list">加载中...</div>
</div>

<script>
fetch('/search.xml').then(function(r){return r.text()}).then(function(xml){
  var cats={}, tags={};
  (xml.match(/<category>(.*?)<\/category>/g)||[]).forEach(function(c){
    var n=c.replace(/<\/?category>/g,'').trim(); if(n)cats[n]=(cats[n]||0)+1;
  });
  (xml.match(/<tag>(.*?)<\/tag>/g)||[]).forEach(function(t){
    var n=t.replace(/<\/?tag>/g,'').trim(); if(n)tags[n]=(tags[n]||0)+1;
  });
  var ch=''; Object.keys(cats).sort().forEach(function(c){
    ch+='<a class="cat" href="/categories/'+encodeURIComponent(c)+'/">'+c+' <sup>'+cats[c]+'</sup></a>';
  });
  document.getElementById('cat-list').innerHTML=ch||'暂无分类';
  var th=''; Object.keys(tags).sort().forEach(function(t){
    th+='<a class="tag" href="/categories/'+encodeURIComponent(t)+'/">'+t+' <sup>'+tags[t]+'</sup></a>';
  });
  document.getElementById('tag-list').innerHTML=th||'暂无标签';
});
</script>
