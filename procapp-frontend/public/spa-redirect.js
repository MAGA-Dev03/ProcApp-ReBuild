// GitHub Pages SPA redirect: restores the path saved by public/404.html
;(function (l) {
  if (l.search[1] === 'p' && l.search[2] === '=') {
    var decoded = l.search
      .slice(1)
      .split('&')
      .map(function (s) {
        return s.replace(/~and~/g, '&')
      })
    window.history.replaceState(
      null,
      null,
      l.pathname.slice(0, -1) + decoded[0].slice(2) + (decoded[1] ? '?' + decoded[1].slice(2) : '') + l.hash,
    )
  }
})(window.location)
