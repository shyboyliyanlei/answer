import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Topbar from '../components/Topbar'
import styles from './Profile.module.css'

interface UserInfo {
  id: number
  username: string
  points: number
  created_at: string
}

interface Question {
  id: number
  title: string
  tags: any
  views: number
  answers_count: number
  votes: number
  is_solved: boolean
  created_at: string
}

interface Answer {
  id: number
  content: string
  votes: number
  is_accepted: boolean
  created_at: string
  question_id: number
  question_title: string
  question_solved: boolean
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

export default function Profile() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [tab, setTab] = useState<'questions' | 'answers'>('questions')
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loadingUser, setLoadingUser] = useState(true)
  const [loadingContent, setLoadingContent] = useState(true)

  useEffect(() => {
    setLoadingUser(true)
    fetch(`/api/users/${id}`)
      .then(r => r.json())
      .then(data => setUserInfo(data))
      .catch(() => setUserInfo(null))
      .finally(() => setLoadingUser(false))
  }, [id])

  useEffect(() => {
    setLoadingContent(true)
    Promise.all([
      fetch(`/api/users/${id}/questions`).then(r => r.json()).catch(() => []),
      fetch(`/api/users/${id}/answers`).then(r => r.json()).catch(() => []),
    ]).then(([qs, as]) => {
      setQuestions(Array.isArray(qs) ? qs : [])
      setAnswers(Array.isArray(as) ? as : [])
    }).finally(() => setLoadingContent(false))
  }, [id])

  const joinYear = userInfo
    ? new Date(userInfo.created_at).getFullYear()
    : null

  return (
    <div className={styles.page}>
      <Topbar />

      <div className={styles.layout}>
        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          {loadingUser ? (
            <div className={styles.sidebarSkeleton} />
          ) : userInfo ? (
            <>
              <div className={styles.avatarWrap}>
                <div className={styles.avatar}>
                  {userInfo.username.charAt(0).toUpperCase()}
                </div>
              </div>
              <h1 className={styles.username}>{userInfo.username}</h1>
              <p className={styles.joinDate}>加入于 {joinYear}</p>

              <div className={styles.divider} />

              <div className={styles.statGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statVal}>{userInfo.points}</span>
                  <span className={styles.statKey}>积分</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statVal}>{questions.length}</span>
                  <span className={styles.statKey}>提问</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statVal}>{answers.length}</span>
                  <span className={styles.statKey}>回答</span>
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.sidebarTabs}>
                <button
                  className={`${styles.sideTab} ${tab === 'questions' ? styles.sideTabActive : ''}`}
                  onClick={() => setTab('questions')}
                >
                  <span className={styles.sideTabNum}>{questions.length}</span>
                  发布的问题
                </button>
                <button
                  className={`${styles.sideTab} ${tab === 'answers' ? styles.sideTabActive : ''}`}
                  onClick={() => setTab('answers')}
                >
                  <span className={styles.sideTabNum}>{answers.length}</span>
                  回答的问题
                </button>
              </div>
            </>
          ) : (
            <p className={styles.notFound}>用户不存在</p>
          )}
        </aside>

        {/* ── Main content ── */}
        <main className={styles.main}>
          <div className={styles.contentHeader}>
            <span className={styles.contentTitle}>
              {tab === 'questions' ? '发布的问题' : '回答的问题'}
            </span>
            <span className={styles.contentCount}>
              共 {tab === 'questions' ? questions.length : answers.length} 条
            </span>
          </div>

          {loadingContent ? (
            <div className={styles.skeletonWrap}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className={styles.skeleton} style={{ animationDelay: `${i * 0.08}s` }} />
              ))}
            </div>
          ) : tab === 'questions' ? (
            questions.length === 0 ? (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>还没有发布问题</p>
              </div>
            ) : (
              <ul className={styles.list}>
                {questions.map((q, idx) => {
                  const tags = parseTags(q.tags)
                  return (
                    <li key={q.id} className={styles.item} style={{ animationDelay: `${idx * 0.04}s` }}>
                      <span className={styles.itemIdx}>{String(idx + 1).padStart(2, '0')}</span>
                      <div className={styles.itemBody}>
                        <div className={styles.itemTop}>
                          {q.is_solved && <span className={styles.solvedBadge}>已解决</span>}
                          <Link to={`/questions/${q.id}`} className={styles.itemTitle}>
                            {q.title}
                          </Link>
                        </div>
                        <div className={styles.itemMeta}>
                          <span className={styles.metaItem}>{formatRelative(q.created_at)}</span>
                          {tags.length > 0 && (
                            <>
                              <span className={styles.metaDot}>·</span>
                              {tags.slice(0, 3).map(tag => (
                                <span key={tag} className={styles.tag}>{tag}</span>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                      <div className={styles.itemStats}>
                        <div className={styles.statPill}>
                          <span>{q.votes}</span>
                          <span className={styles.pillLabel}>赞</span>
                        </div>
                        <div className={`${styles.statPill} ${q.answers_count > 0 ? styles.hasAnswer : ''} ${q.is_solved ? styles.solved : ''}`}>
                          <span>{q.answers_count}</span>
                          <span className={styles.pillLabel}>答</span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )
          ) : (
            answers.length === 0 ? (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>还没有回答问题</p>
              </div>
            ) : (
              <ul className={styles.list}>
                {answers.map((a, idx) => (
                  <li key={a.id} className={styles.item} style={{ animationDelay: `${idx * 0.04}s` }}>
                    <span className={styles.itemIdx}>{String(idx + 1).padStart(2, '0')}</span>
                    <div className={styles.itemBody}>
                      <div className={styles.itemTop}>
                        {a.is_accepted && <span className={styles.acceptedBadge}>最佳答案</span>}
                        <Link to={`/questions/${a.question_id}`} className={styles.itemTitle}>
                          {a.question_title}
                        </Link>
                      </div>
                      <div className={styles.answerPreview}>
                        {a.content.length > 120 ? a.content.slice(0, 120) + '…' : a.content}
                      </div>
                      <div className={styles.itemMeta}>
                        <span className={styles.metaItem}>{formatRelative(a.created_at)}</span>
                      </div>
                    </div>
                    <div className={styles.itemStats}>
                      <div className={`${styles.statPill} ${a.is_accepted ? styles.solved : ''}`}>
                        <span>{a.votes}</span>
                        <span className={styles.pillLabel}>赞</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </main>
      </div>

      <footer className={styles.footer}>
        <span>问答社区 © {new Date().getFullYear()}</span>
      </footer>
    </div>
  )
}
