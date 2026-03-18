import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Home.module.css'

interface Question {
  id: number
  title: string
  tags: string[]
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

export default function Home() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/questions?sort=newest')
      .then(r => r.json())
      .then(data => setQuestions(Array.isArray(data) ? data : []))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false))
  }, [])

  function handleLogout() {
    logout()
    navigate('/')
  }

  const parseTags = (tags: any): string[] => {
    if (Array.isArray(tags)) return tags
    try { return JSON.parse(tags) } catch { return [] }
  }

  return (
    <div className={styles.page}>
      {/* ── Top bar ── */}
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <div className={styles.brand}>
            <span className={styles.brandChar}>答</span>
            <div className={styles.brandText}>
              <span className={styles.brandName}>问答社区</span>
              <span className={styles.brandSub}>知识共建平台</span>
            </div>
          </div>

          <nav className={styles.nav}>
            {user ? (
              <>
                <span className={styles.navUser}>{user.username}</span>
                <Link to="/ask" className={styles.askBtn}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  提问
                </Link>
                <button className={styles.logoutBtn} onClick={handleLogout}>退出</button>
              </>
            ) : (
              <>
                <Link to="/login" className={styles.navLink}>登录</Link>
                <Link to="/register" className={styles.registerBtn}>注册</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.heroLabel}>最新问题</p>
          <h1 className={styles.heroTitle}>
            每一个好问题<br />
            <em>都在等待答案</em>
          </h1>
          {!user && (
            <div className={styles.heroCta}>
              <Link to="/register" className={styles.heroRegisterBtn}>免费注册</Link>
              <Link to="/login" className={styles.heroLoginLink}>已有账户，登录 →</Link>
            </div>
          )}
        </div>
        <div className={styles.heroStats} aria-hidden="true">
          <div className={styles.heroStat}>
            <span className={styles.heroStatNum}>{questions.length}</span>
            <span className={styles.heroStatLabel}>个问题</span>
          </div>
          <div className={styles.heroStatDivider} />
          <div className={styles.heroStat}>
            <span className={styles.heroStatNum}>
              {questions.reduce((s, q) => s + q.answers_count, 0)}
            </span>
            <span className={styles.heroStatLabel}>个回答</span>
          </div>
          <div className={styles.heroStatDivider} />
          <div className={styles.heroStat}>
            <span className={styles.heroStatNum}>
              {questions.filter(q => q.is_solved).length}
            </span>
            <span className={styles.heroStatLabel}>已解决</span>
          </div>
        </div>
      </section>

      {/* ── Question list ── */}
      <main className={styles.main}>
        <div className={styles.listHeader}>
          <span className={styles.listTitle}>按发布时间排序</span>
          {user && (
            <Link to="/ask" className={styles.listAskBtn}>
              发布问题
            </Link>
          )}
        </div>

        {loading ? (
          <div className={styles.loadingWrap}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className={styles.skeleton} style={{ animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>还没有问题</p>
            <p className={styles.emptyHint}>成为第一个提问者</p>
            {user
              ? <Link to="/ask" className={styles.emptyBtn}>立即提问</Link>
              : <Link to="/register" className={styles.emptyBtn}>注册后提问</Link>
            }
          </div>
        ) : (
          <ul className={styles.list}>
            {questions.map((q, idx) => {
              const tags = parseTags(q.tags)
              return (
                <li key={q.id} className={styles.item} style={{ animationDelay: `${idx * 0.04}s` }}>
                  <div className={styles.itemIndex}>{String(idx + 1).padStart(2, '0')}</div>

                  <div className={styles.itemBody}>
                    <div className={styles.itemTop}>
                      {q.is_solved && <span className={styles.solvedDot} title="已解决" />}
                      <Link to={`/questions/${q.id}`} className={styles.itemTitle}>
                        {q.title}
                      </Link>
                    </div>
                    <div className={styles.itemMeta}>
                      <span className={styles.itemAuthor}>{q.author_name}</span>
                      <span className={styles.metaDot}>·</span>
                      <span className={styles.itemTime}>{formatRelative(q.created_at)}</span>
                      {tags.length > 0 && (
                        <>
                          <span className={styles.metaDot}>·</span>
                          <div className={styles.tagRow}>
                            {tags.slice(0, 3).map(tag => (
                              <span key={tag} className={styles.tag}>{tag}</span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className={styles.itemStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statNum}>{q.votes}</span>
                      <span className={styles.statLabel}>赞</span>
                    </div>
                    <div className={`${styles.statItem} ${q.answers_count > 0 ? styles.hasAnswers : ''} ${q.is_solved ? styles.isSolved : ''}`}>
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
