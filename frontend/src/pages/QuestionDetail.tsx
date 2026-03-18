import { useState, useEffect, FormEvent } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './QuestionDetail.module.css'

interface Question {
  id: number
  title: string
  content: string
  tags: string[]
  author_id: number
  author_name: string
  views: number
  answers_count: number
  votes: number
  is_solved: boolean
  created_at: string
}

interface Answer {
  id: number
  content: string
  author_id: number
  author_name: string
  votes: number
  is_accepted: boolean
  created_at: string
}

function VoteButton({
  count,
  targetType,
  targetId,
}: {
  count: number
  targetType: 'question' | 'answer'
  targetId: number
}) {
  const { user } = useAuth()
  const [votes, setVotes] = useState(count)
  const [voted, setVoted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    fetch(`/api/votes?user_id=${user.id}&target_type=${targetType}&target_id=${targetId}`)
      .then(r => r.json())
      .then(d => setVoted(d.voted))
      .catch(() => {})
  }, [user, targetType, targetId])

  async function toggle() {
    if (!user) return
    setLoading(true)
    try {
      if (voted) {
        const res = await fetch('/api/votes', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, target_type: targetType, target_id: targetId }),
        })
        if (res.ok) { setVoted(false); setVotes(v => v - 1) }
      } else {
        const res = await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, target_type: targetType, target_id: targetId }),
        })
        if (res.ok) { setVoted(true); setVotes(v => v + 1) }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.voteBox}>
      <button
        className={`${styles.voteBtn} ${voted ? styles.votedBtn : ''}`}
        onClick={toggle}
        disabled={!user || loading}
        aria-label={voted ? '取消点赞' : '点赞'}
        title={!user ? '登录后可以点赞' : undefined}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2L14 10H2L8 2Z" fill="currentColor" />
        </svg>
      </button>
      <span className={`${styles.voteCount} ${voted ? styles.votedCount : ''}`}>{votes}</span>
    </div>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function QuestionDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [question, setQuestion] = useState<Question | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [answerContent, setAnswerContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [qRes, aRes] = await Promise.all([
          fetch(`/api/questions/${id}`),
          fetch(`/api/answers?question_id=${id}`),
        ])
        if (qRes.status === 404) { setNotFound(true); return }
        const q = await qRes.json()
        const a = await aRes.json()
        setQuestion(q)
        setAnswers(a)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function submitAnswer(e: FormEvent) {
    e.preventDefault()
    if (!answerContent.trim()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user!.token}`,
        },
        body: JSON.stringify({ content: answerContent, question_id: Number(id), author_id: user!.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '提交失败')
      const newAnswer: Answer = {
        id: data.id,
        content: answerContent,
        author_id: user!.id,
        author_name: user!.username,
        votes: 0,
        is_accepted: false,
        created_at: new Date().toISOString(),
      }
      setAnswers(a => [...a, newAnswer])
      setAnswerContent('')
      setQuestion(q => q ? { ...q, answers_count: q.answers_count + 1 } : q)
    } catch (err: any) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function acceptAnswer(answerId: number) {
    if (!user) return
    const res = await fetch(`/api/answers/${answerId}/accept`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operator_id: user.id }),
    })
    if (res.ok) {
      setAnswers(a => a.map(x => ({ ...x, is_accepted: x.id === answerId })))
      setQuestion(q => q ? { ...q, is_solved: true } : q)
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.loadingSpinner} />
      </div>
    )
  }

  if (notFound || !question) {
    return (
      <div className={styles.errorPage}>
        <p className={styles.errorCode}>404</p>
        <p className={styles.errorMsg}>问题不存在</p>
        <Link to="/" className={styles.backLink}>← 返回首页</Link>
      </div>
    )
  }

  const tags: string[] = Array.isArray(question.tags)
    ? question.tags
    : (typeof question.tags === 'string' ? JSON.parse(question.tags) : [])

  const isAuthor = user?.id === question.author_id

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <header className={styles.topbar}>
        <Link to="/" className={styles.logoLink}>
          <span className={styles.logoChar}>答</span>
          <span className={styles.logoText}>问答社区</span>
        </Link>
        <div className={styles.topbarRight}>
          {user ? (
            <>
              <span className={styles.userBadge}>{user.username}</span>
              <Link to="/ask" className={styles.askBtn}>提问</Link>
            </>
          ) : (
            <Link to="/login" className={styles.askBtn}>登录</Link>
          )}
        </div>
      </header>

      <div className={styles.layout}>
        <main className={styles.main}>

          {/* Question */}
          <section className={styles.questionSection}>
            <div className={styles.voteCol}>
              <VoteButton count={question.votes} targetType="question" targetId={question.id} />
            </div>
            <div className={styles.questionBody}>
              <div className={styles.questionMeta}>
                {tags.map(tag => (
                  <Link key={tag} to={`/topics?tag=${encodeURIComponent(tag)}`} className={styles.tag}>{tag}</Link>
                ))}
                {question.is_solved && <span className={styles.solvedBadge}>已解决</span>}
              </div>
              <h1 className={styles.questionTitle}>{question.title}</h1>
              <div className={styles.authorLine}>
                <span className={styles.authorName}>{question.author_name}</span>
                <span className={styles.dot}>·</span>
                <span className={styles.date}>{formatDate(question.created_at)}</span>
                <span className={styles.dot}>·</span>
                <span className={styles.stat}>{question.views} 次浏览</span>
                <span className={styles.dot}>·</span>
                <span className={styles.stat}>{question.answers_count} 个回答</span>
              </div>
              <div className={styles.content}>
                {question.content.split('\n').map((line, i) => (
                  <p key={i}>{line || <br />}</p>
                ))}
              </div>
            </div>
          </section>

          {/* Answers */}
          {answers.length > 0 && (
            <section className={styles.answersSection}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionNum}>{answers.length}</span> 个回答
              </h2>
              <div className={styles.answerList}>
                {answers.map((answer, idx) => (
                  <article
                    key={answer.id}
                    className={`${styles.answerCard} ${answer.is_accepted ? styles.acceptedCard : ''}`}
                    style={{ animationDelay: `${idx * 0.06}s` }}
                  >
                    <div className={styles.voteCol}>
                      <VoteButton count={answer.votes} targetType="answer" targetId={answer.id} />
                      {answer.is_accepted && (
                        <div className={styles.acceptedMark} title="已采纳">
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M3 9l4.5 4.5L15 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className={styles.answerBody}>
                      {answer.is_accepted && (
                        <div className={styles.acceptedLabel}>最佳答案</div>
                      )}
                      <div className={styles.content}>
                        {answer.content.split('\n').map((line, i) => (
                          <p key={i}>{line || <br />}</p>
                        ))}
                      </div>
                      <div className={styles.answerFooter}>
                        <span className={styles.authorName}>{answer.author_name}</span>
                        <span className={styles.dot}>·</span>
                        <span className={styles.date}>{formatDate(answer.created_at)}</span>
                        {isAuthor && !answer.is_accepted && !question.is_solved && (
                          <button
                            className={styles.acceptBtn}
                            onClick={() => acceptAnswer(answer.id)}
                          >
                            采纳此答案
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Answer form */}
          <section className={styles.replySection}>
            <h2 className={styles.sectionTitle}>
              {user ? '写下你的回答' : '登录后参与回答'}
            </h2>
            {user ? (
              <form onSubmit={submitAnswer} className={styles.replyForm}>
                {submitError && <div className={styles.error}>{submitError}</div>}
                <textarea
                  className={styles.replyTextarea}
                  placeholder="分享你的见解……支持 Markdown"
                  value={answerContent}
                  onChange={e => setAnswerContent(e.target.value)}
                  rows={8}
                  required
                />
                <div className={styles.replyActions}>
                  <button type="submit" className={styles.replySubmit} disabled={submitting}>
                    {submitting ? <><span className={styles.spinner} />提交中</> : '发布回答'}
                  </button>
                </div>
              </form>
            ) : (
              <div className={styles.loginPrompt}>
                <p>请先登录才能回答问题</p>
                <Link to="/login" state={{ from: { pathname: `/questions/${id}` } }} className={styles.loginPromptBtn}>
                  前往登录
                </Link>
              </div>
            )}
          </section>

        </main>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sideCard}>
            <h3 className={styles.sideTitle}>关于这个问题</h3>
            <dl className={styles.statList}>
              <div className={styles.statRow}>
                <dt>浏览</dt>
                <dd>{question.views}</dd>
              </div>
              <div className={styles.statRow}>
                <dt>回答</dt>
                <dd>{question.answers_count}</dd>
              </div>
              <div className={styles.statRow}>
                <dt>点赞</dt>
                <dd>{question.votes}</dd>
              </div>
              <div className={styles.statRow}>
                <dt>状态</dt>
                <dd className={question.is_solved ? styles.solved : styles.unsolved}>
                  {question.is_solved ? '已解决' : '待解答'}
                </dd>
              </div>
            </dl>
          </div>
          {tags.length > 0 && (
            <div className={styles.sideCard}>
              <h3 className={styles.sideTitle}>标签</h3>
              <div className={styles.tagList}>
                {tags.map(tag => (
                  <Link key={tag} to={`/topics?tag=${encodeURIComponent(tag)}`} className={styles.sideTag}>{tag}</Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
