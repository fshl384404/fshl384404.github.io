/**
 * Auto Cover Script
 * If a post has no explicit 'cover' in front-matter,
 * extract the first image from the post content as the cover.
 * Runs before render (content is still Markdown).
 * If no image found, no cover is set → card shows no cover image.
 */
hexo.extend.filter.register('before_post_render', function (data) {
  if (data.cover) return data

  var m = data.content.match(/!\[[^\]]*\]\(([^)\s]+)\)/)
  if (m && m[1]) {
    data.cover = m[1]
  }

  return data
})
