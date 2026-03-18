import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Topbar from '../components/Topbar'
import styles from './Topics.module.css'

interface TagInfo {
  tag: string
  count: number
}

interface Question {
  id: number
  title: string
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

export default function Topics() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTag = searchParams.get('tag') || ''

  const [tags, setTags] = useState<TagInfo[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loadingTags, setLoadingTags] = useState(true)
  const [loadingQ, setLoadingQ] = useState(true)

  useEffect(() => {
    fetch('/api/tags')
      .then(r => r.json())
      .then(data => setTags(Array.isArray(data) ? data : []))
      .catch(() => setTags([]))
      .finally(() => setLoadingTags(false))
  }, [])

  useEffect(() => {
    setLoadingQ(true)
    const url = activeTag
      ? `/api/questions?sort=newest&tag=${encodeURIComponent(activeTag)}`
      : '/api/questions?sort=newest'
    fetch(url)
      .then(r => r.json())
      .then(data => setQuestions(Array.isArray(data) ? data : []))
      .catch(() => setQuestions([]))
      .finally(() => setLoadingQ(false))
  }, [activeTag])

  function selectTag(tag: string) {
    if (tag === activeTag) {
      setSearchParams({})
    } else {
      setSearchParams({ tag })
    }
  }

  return (
    <div className={styles.page}>
      <Topbar />

      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <p className={styles.pageLabel}>话题 · 标签</p>
          <h1 className={styles.pageTitle}>
            按话题探索<br />
            <em>所有问题</em>
          </h1>
          <p className={styles.pageDesc}>
            共 <strong>{tags.length}</strong> 个话题 · <strong>{questions.length}</strong> 个问题
            {activeTag && <span className={styles.filterNote}> · 正在筛选「{activeTag}」</span>}
          </p>
        </div>
      </div>

      <div className={styles.body}>
        {/* ── Tag cloud ── */}
        <section className={styles.tagSection}>
          <div className={styles.tagSectionHeader}>
            <span className={styles.sectionLabel}>全部话题</span>
            {activeTag && (
              <button className={styles.clearBtn} onClick={() => setSearchParams({})}>
                清除筛选 ×
              </button>
            )}
          </div>

          {loadingTags ? (
            <div className={styles.tagSkeletonWrap}>
              {[...Array(12)].map((_, i) => (
                <div key={i} className={styles.tagSkeleton} style={{ width: `${60 + (i % 4) * 20}px`, animationDelay: `${i * 0.04}s` }} />
              ))}
            </div>
          ) : tags.length === 0 ? (
            <p className={styles.noTags}>暂无话题</p>
          ) : (
            <div className={styles.tagCloud}>
              {tags.map((t, i) => (
                <button
                  key={t.tag}
                  className={`${styles.tagChip} ${activeTag === t.tag ? styles.tagChipActive : ''}`}
                  style={{ animationDelay: `${i * 0.025}s` }}
                  onClick={() => selectTag(t.tag)}
                >
                  <span className={styles.tagName}>{t.tag}</span>
                  <span className={styles.tagCount}>{t.count}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Question list ── */}
        <section className={styles.listSection}>
          <div className={styles.listHeader}>
            <span className={styles.sectionLabel}>
              {activeTag ? `「${activeTag}」下的问题` : '全部问题'}
            </span>
            <span className={styles.listCount}>{questions.length} 个</span>
          </div>

          {loadingQ ? (
            <div className={styles.qSkeletonWrap}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className={styles.qSkeleton} style={{ animationDelay: `${i * 0.07}s` }} />
              ))}
            </div>
          ) : questions.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>暂无相关问题</p>
              {user && <Link to="/ask" className={styles.emptyBtn}>发布第一个问题</Link>}
            </div>
          ) : (
            <ul className={styles.list}>
              {questions.map((q, idx) => {
                const qTags = parseTags(q.tags)
                return (
                  <li key={q.id} className={styles.item} style={{ animationDelay: `${idx * 0.03}s` }}>
                    <span className={styles.itemIdx}>{String(idx + 1).padStart(2, '0')}</span>
                    <div className={styles.itemBody}>
                      <div className={styles.itemTop}>
                        {q.is_solved && <span className={styles.solvedBadge}>已解决</span>}
                        <Link to={`/questions/${q.id}`} className={styles.itemTitle}>
                          {q.title}
                        </Link>
                      </div>
                      <div className={styles.itemMeta}>
                        <Link to={`/users/${q.author_id}`} className={styles.metaAuthor}>{q.author_name}</Link>
                        <span className={styles.metaDot}>·</span>
                        <span className={styles.metaTime}>{formatRelative(q.created_at)}</span>
                        {qTags.length > 0 && (
                          <>
                            <span className={styles.metaDot}>·</span>
                            <div className={styles.tagRow}>
                              {qTags.slice(0, 4).map(tag => (
                                <button
                                  key={tag}
                                  className={`${styles.inlineTag} ${activeTag === tag ? styles.inlineTagActive : ''}`}
                                  onClick={() => selectTag(tag)}
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
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
        </section>
      </div>

      <footer className={styles.footer}>
        <span>问答社区 © {new Date().getFullYear()}</span>
      </footer>
    </div>
  )
}
