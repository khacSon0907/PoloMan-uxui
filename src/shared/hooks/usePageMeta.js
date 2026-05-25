import { useEffect } from 'react'

function upsertMeta(selector, createMeta, content) {
  let element = document.head.querySelector(selector)

  if (!element) {
    element = createMeta()
    document.head.appendChild(element)
  }

  element.setAttribute('content', content)
}

function upsertCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]')

  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }

  element.setAttribute('href', href)
}

export function usePageMeta({ title, description, canonicalPath }) {
  useEffect(() => {
    if (title) document.title = title

    if (description) {
      upsertMeta(
        'meta[name="description"]',
        () => {
          const meta = document.createElement('meta')
          meta.setAttribute('name', 'description')
          return meta
        },
        description,
      )
      upsertMeta(
        'meta[property="og:description"]',
        () => {
          const meta = document.createElement('meta')
          meta.setAttribute('property', 'og:description')
          return meta
        },
        description,
      )
    }

    if (title) {
      upsertMeta(
        'meta[property="og:title"]',
        () => {
          const meta = document.createElement('meta')
          meta.setAttribute('property', 'og:title')
          return meta
        },
        title,
      )
    }

    if (canonicalPath) {
      upsertCanonical(`${window.location.origin}${canonicalPath}`)
    }
  }, [canonicalPath, description, title])
}
