function upsertMeta(attr: 'property' | 'name', key: string, value: string) {
  if (!value) return
  let node = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!node) {
    node = document.createElement('meta')
    node.setAttribute(attr, key)
    document.head.appendChild(node)
  }
  node.content = value
}

export function applySeo({
  title,
  description,
  image,
  url,
  type = 'website',
}: {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: string
}) {
  if (title) document.title = title
  if (description) upsertMeta('name', 'description', description)
  if (title) {
    upsertMeta('property', 'og:title', title)
    upsertMeta('name', 'twitter:title', title)
  }
  if (description) {
    upsertMeta('property', 'og:description', description)
    upsertMeta('name', 'twitter:description', description)
  }
  if (image) {
    upsertMeta('property', 'og:image', image)
    upsertMeta('name', 'twitter:image', image)
  }
  upsertMeta('property', 'og:type', type)
  upsertMeta('name', 'twitter:card', 'summary_large_image')
  upsertMeta('property', 'og:locale', 'pt_BR')
  if (url) upsertMeta('property', 'og:url', url)
}
