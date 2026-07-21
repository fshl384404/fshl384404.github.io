/**
 * i18n Override Script
 * Override specific language strings in Butterfly theme without modifying node_modules.
 * Uses i18n.set() to merge overrides into the internal store.
 * Works for both local `hexo server` and GitHub Actions CI builds.
 *
 * Current overrides: none.
 * Add new overrides here as needed:
 *   i18n.set('zh-CN', Object.assign({}, zhCN, { 'key': 'value' }))
 */
hexo.extend.filter.register('before_generate', function () {
  // Placeholder — no active overrides at this time.
}, 10)
