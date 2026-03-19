import { useState, useEffect, useRef, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Topbar from '../components/Topbar'
import styles from './Search.module.css'

interface Question {
  id: number
  title: string
  content: string
  tags: any
  author_id: number
  author_name: string
  views: number
  answers_count: number
  votes: number
  is_solved: boolean
  created_at: string
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} 小时前`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} 天前`
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
}

function parseTags(tags: any): string[] {
  if (Array.isArray(tags)) return tags
  try { return JSON.parse(tags) } catch { return [] }
}

function highlight(text: string, keyword: string): string {
  if (!keyword.trim()) return text
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>')
}

function excerpt(content: string, keyword: string, maxLen = 160): string {
  const lower = content.toLowerCase()
  const idx = lower.indexOf(keyword.toLowerCase())
  if (idx === -1) return content.slice(0, maxLen) + (content.length > maxLen ? '…' : '')
  const start = Math.max(0, idx - 40)
  const end = Math.min(content.length, idx + keyword.length + 100)
  return (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '')
}

export default function Search() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQ = searchParams.get('q') || ''

  const [inputVal, setInputVal] = useState(urlQ)
  const [results, setResults] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!urlQ) { setResults([]); setSearched(false); return }
    setInputVal(urlQ)
    setLoading(true)
    setSearched(true)
    fetch(`/api/search?q=${encodeURIComponent(urlQ)}`)
      .then(r => r.json())
      .then(data => setResults(Array.isArray(data) ? data : []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [urlQ])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const q = inputVal.trim()
    if (!q) return
    setSearchParams({ q })
  }

  return (
    <div className={styles.page}>
      <Topbar />

      {/* ── Search hero ── */}
      <div className={styles.searchHero}>
        <div className={styles.searchHeroInner}>
          <p className={styles.heroLabel}>SEARCH</p>
          <form onSubmit={handleSubmit} className={styles.searchForm}>
            <div className={styles.inputWrap}>
              <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                className={styles.searchInput}
                placeholder="搜索问题…"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              {inputVal && (
                <button
                  type="button"
                  className={styles.clearInput}
                  onClick={() => { setInputVal(''); setSearchParams({}); inputRef.current?.focus() }}
                >×</button>
              )}
            </div>
            <button type="submit" className={styles.searchBtn}>搜索</button>
          </form>

          {urlQ && !loading && (
            <p className={styles.resultMeta}>
              {results.length > 0
                ? <><strong>{results.length}</strong> 条与「<em>{urlQ}</em>」相关的结果</>
                : <>未找到与「<em>{urlQ}</em>」相关的结果</>
              }
            </p>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      <main className={styles.main}>
        {loading ? (
          <div className={styles.skeletonWrap}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className={styles.skeleton} style={{ animationDelay: `${i * 0.07}s` }} />
            ))}
          </div>
        ) : !searched ? (
          <div className={styles.idle}>
            <div className={styles.idleIcon}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="13" cy="13" r="8" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M20 20l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className={styles.idleTitle}>输入关键词开始搜索</p>
            <p className={styles.idleHint}>支持按问题标题和内容搜索</p>
          </div>
        ) : results.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>没有找到相关问题</p>
            <p className={styles.emptyHint}>换个关键词试试，或者</p>
            {user
              ? <Link to="/ask" className={styles.emptyBtn}>发布这个问题</Link>
              : <Link to="/register" className={styles.emptyBtn}>注册后发布</Link>
            }
          </div>
        ) : (
          <ul className={styles.list}>
            {results.map((q, idx) => {
              const tags = parseTags(q.tags)
              const snip = excerpt(q.content, urlQ)
              return (
                <li key={q.id} className={styles.item} style={{ animationDelay: `${idx * 0.04}s` }}>
                  <div className={styles.itemMain}>
                    <div className={styles.itemTop}>
                      {q.is_solved && <span className={styles.solvedBadge}>已解决</span>}
                      <Link
                        to={`/questions/${q.id}`}
                        className={styles.itemTitle}
                        dangerouslySetInnerHTML={{ __html: highlight(q.title, urlQ) }}
                      />
                    </div>
                    <p
                      className={styles.itemSnippet}
                      dangerouslySetInnerHTML={{ __html: highlight(snip, urlQ) }}
                    />
                    <div className={styles.itemMeta}>
                      <Link to={`/users/${q.author_id}`} className={styles.metaAuthor}>{q.author_name}</Link>
                      <span className={styles.metaDot}>·</span>
                      <span className={styles.metaTime}>{formatRelative(q.created_at)}</span>
                      {tags.length > 0 && (
                        <>
                          <span className={styles.metaDot}>·</span>
                          {tags.slice(0, 3).map(tag => (
                            <Link key={tag} to={`/topics?tag=${encodeURIComponent(tag)}`} className={styles.tag}>{tag}</Link>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                  <div className={styles.itemStats}>
                    <div className={styles.statBox}>
                      <span className={styles.statNum}>{q.votes}</span>
                      <span className={styles.statLabel}>赞</span>
                    </div>
                    <div className={`${styles.statBox} ${q.answers_count > 0 ? styles.hasAns : ''} ${q.is_solved ? styles.solved : ''}`}>
                      <span className={styles.statNum}>{q.answers_count}</span>
                      <span className={styles.statLabel}>答</span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      <footer className={styles.footer}>
        <span>问答社区 © {new Date().getFullYear()}</span>
      </footer>
    </div>
  )
}
