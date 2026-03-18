import { useState, useEffect, FormEvent, KeyboardEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Topbar from '../components/Topbar'
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

  const [question, setQuestion] = useState<Question | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [answerContent, setAnswerContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // ── Question edit state ──
  const [editingQuestion, setEditingQuestion] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editTagInput, setEditTagInput] = useState('')
  const [savingQuestion, setSavingQuestion] = useState(false)

  // ── Answer edit state ──
  const [editingAnswerId, setEditingAnswerId] = useState<number | null>(null)
  const [editAnswerContent, setEditAnswerContent] = useState('')
  const [savingAnswer, setSavingAnswer] = useState(false)

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

  function startEditQuestion() {
    if (!question) return
    const t = Array.isArray(question.tags) ? question.tags
      : (typeof question.tags === 'string' ? (() => { try { return JSON.parse(question.tags as any) } catch { return [] } })() : [])
    setEditTitle(question.title)
    setEditContent(question.content)
    setEditTags(t)
    setEditTagInput('')
    setEditingQuestion(true)
  }

  function handleEditTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return
    if ((e.key === 'Enter' || e.key === ',') && editTagInput.trim()) {
      e.preventDefault()
      const tag = editTagInput.trim().replace(/,$/, '')
      if (tag && !editTags.includes(tag) && editTags.length < 5) {
        setEditTags(t => [...t, tag])
      }
      setEditTagInput('')
    }
    if (e.key === 'Backspace' && !editTagInput && editTags.length > 0) {
      setEditTags(t => t.slice(0, -1))
    }
  }

  async function saveQuestion() {
    if (!question || !user) return
    setSavingQuestion(true)
    try {
      const res = await fetch(`/api/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, content: editContent, tags: editTags, operator_id: user.id }),
      })
      if (!res.ok) throw new Error('保存失败')
      setQuestion(q => q ? { ...q, title: editTitle, content: editContent, tags: editTags } : q)
      setEditingQuestion(false)
    } catch {
      // silently ignore
    } finally {
      setSavingQuestion(false)
    }
  }

  function startEditAnswer(answer: Answer) {
    setEditingAnswerId(answer.id)
    setEditAnswerContent(answer.content)
  }

  async function saveAnswer() {
    if (!user || editingAnswerId === null) return
    setSavingAnswer(true)
    try {
      const res = await fetch(`/api/answers/${editingAnswerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editAnswerContent, operator_id: user.id }),
      })
      if (!res.ok) throw new Error('保存失败')
      setAnswers(a => a.map(x => x.id === editingAnswerId ? { ...x, content: editAnswerContent } : x))
      setEditingAnswerId(null)
    } catch {
      // silently ignore
    } finally {
      setSavingAnswer(false)
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
      <Topbar />

      <div className={styles.layout}>
        <main className={styles.main}>

          {/* Question */}
          <section className={styles.questionSection}>
            <div className={styles.voteCol}>
              <VoteButton count={question.votes} targetType="question" targetId={question.id} />
            </div>
            <div className={`${styles.questionBody} ${editingQuestion ? styles.editingBlock : ''}`}>
              {editingQuestion ? (
                <>
                  <div className={styles.editLabel}>编辑问题</div>
                  <input
                    className={styles.editTitleInput}
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="问题标题"
                    maxLength={150}
                  />
                  <div className={styles.editTagsField}>
                    {editTags.map(tag => (
                      <span key={tag} className={styles.editTag}>
                        {tag}
                        <button type="button" className={styles.editTagRemove} onClick={() => setEditTags(t => t.filter(x => x !== tag))}>×</button>
                      </span>
                    ))}
                    {editTags.length < 5 && (
                      <input
                        className={styles.editTagInput}
                        placeholder="添加标签，Enter 确认"
                        value={editTagInput}
                        onChange={e => setEditTagInput(e.target.value)}
                        onKeyDown={handleEditTagKeyDown}
                      />
                    )}
                  </div>
                  <textarea
                    className={styles.editContentTextarea}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={10}
                    placeholder="问题描述"
                  />
                  <div className={styles.editActions}>
                    <button className={styles.editSaveBtn} onClick={saveQuestion} disabled={savingQuestion}>
                      {savingQuestion ? '保存中…' : '保存修改'}
                    </button>
                    <button className={styles.editCancelBtn} onClick={() => setEditingQuestion(false)}>取消</button>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.questionMeta}>
                    {tags.map(tag => (
                      <Link key={tag} to={`/topics?tag=${encodeURIComponent(tag)}`} className={styles.tag}>{tag}</Link>
                    ))}
                    {question.is_solved && <span className={styles.solvedBadge}>已解决</span>}
                  </div>
                  <h1 className={styles.questionTitle}>{question.title}</h1>
                  <div className={styles.authorLine}>
                    <Link to={`/users/${question.author_id}`} className={styles.authorName}>{question.author_name}</Link>
                    <span className={styles.dot}>·</span>
                    <span className={styles.date}>{formatDate(question.created_at)}</span>
                    <span className={styles.dot}>·</span>
                    <span className={styles.stat}>{question.views} 次浏览</span>
                    <span className={styles.dot}>·</span>
                    <span className={styles.stat}>{question.answers_count} 个回答</span>
                    {isAuthor && (
                      <button className={styles.editBtn} onClick={startEditQuestion}>编辑</button>
                    )}
                  </div>
                  <div className={styles.content}>
                    {question.content.split('\n').map((line, i) => (
                      <p key={i}>{line || <br />}</p>
                    ))}
                  </div>
                </>
              )}
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
                    <div className={`${styles.answerBody} ${editingAnswerId === answer.id ? styles.editingBlock : ''}`}>
                      {editingAnswerId === answer.id ? (
                        <>
                          <div className={styles.editLabel}>编辑回答</div>
                          <textarea
                            className={styles.editContentTextarea}
                            value={editAnswerContent}
                            onChange={e => setEditAnswerContent(e.target.value)}
                            rows={8}
                            placeholder="回答内容"
                            autoFocus
                          />
                          <div className={styles.editActions}>
                            <button className={styles.editSaveBtn} onClick={saveAnswer} disabled={savingAnswer}>
                              {savingAnswer ? '保存中…' : '保存修改'}
                            </button>
                            <button className={styles.editCancelBtn} onClick={() => setEditingAnswerId(null)}>取消</button>
                          </div>
                        </>
                      ) : (
                        <>
                          {answer.is_accepted && (
                            <div className={styles.acceptedLabel}>最佳答案</div>
                          )}
                          <div className={styles.content}>
                            {answer.content.split('\n').map((line, i) => (
                              <p key={i}>{line || <br />}</p>
                            ))}
                          </div>
                          <div className={styles.answerFooter}>
                            <Link to={`/users/${answer.author_id}`} className={styles.authorName}>{answer.author_name}</Link>
                            <span className={styles.dot}>·</span>
                            <span className={styles.date}>{formatDate(answer.created_at)}</span>
                            {user?.id === answer.author_id && (
                              <button className={styles.editBtn} onClick={() => startEditAnswer(answer)}>编辑</button>
                            )}
                            {isAuthor && !answer.is_accepted && !question.is_solved && (
                              <button
                                className={styles.acceptBtn}
                                onClick={() => acceptAnswer(answer.id)}
                              >
                                采纳此答案
                              </button>
                            )}
                          </div>
                        </>
                      )}
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
