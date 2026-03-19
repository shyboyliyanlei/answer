import { useState, type KeyboardEvent, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Topbar from '../components/Topbar'
import styles from './AskQuestion.module.css'

export default function AskQuestion() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim().replace(/,$/, '')
      if (tag && !tags.includes(tag) && tags.length < 5) {
        setTags(t => [...t, tag])
      }
      setTagInput('')
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(t => t.slice(0, -1))
    }
  }

  function removeTag(tag: string) {
    setTags(t => t.filter(x => x !== tag))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('请填写问题标题'); return }
    if (!content.trim()) { setError('请描述你的问题'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user!.token}`,
        },
        body: JSON.stringify({ title, content, tags, author_id: user!.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '提交失败')
      navigate('/')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <Topbar />

      <div className={styles.body}>
        {/* Main form */}
        <main className={styles.main}>
          <div className={styles.pageHead}>
            <p className={styles.stepLabel}>发布问题</p>
            <h1 className={styles.pageTitle}>描述你遇到的问题</h1>
            <p className={styles.pageHint}>清晰的标题和详细的描述能帮你更快获得解答</p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Title */}
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="title">
                问题标题
                <span className={styles.fieldCount}>{title.length}/150</span>
              </label>
              <input
                id="title"
                type="text"
                className={styles.titleInput}
                placeholder="用一句话概括你的问题……"
                value={title}
                maxLength={150}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Tags */}
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="tag-input">
                标签
                <span className={styles.fieldHint}>最多 5 个，按 Enter 或逗号确认</span>
              </label>
              <div className={styles.tagField}>
                {tags.map(tag => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                    <button
                      type="button"
                      className={styles.tagRemove}
                      onClick={() => removeTag(tag)}
                      aria-label={`移除标签 ${tag}`}
                    >×</button>
                  </span>
                ))}
                {tags.length < 5 && (
                  <input
                    id="tag-input"
                    type="text"
                    className={styles.tagInput}
                    placeholder={tags.length === 0 ? '例如：JavaScript、React……' : ''}
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                  />
                )}
              </div>
            </div>

            {/* Content */}
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="content">
                详细描述
              </label>
              <textarea
                id="content"
                className={styles.contentInput}
                placeholder="详细描述问题背景、你尝试过的方法、期望的结果……支持 Markdown"
                value={content}
                onChange={e => setContent(e.target.value)}
                required
                rows={14}
              />
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading
                  ? <><span className={styles.spinner} />提交中</>
                  : '发布问题'}
              </button>
              <Link to="/" className={styles.cancelBtn}>取消</Link>
            </div>
          </form>
        </main>

        {/* Sidebar tips */}
        <aside className={styles.sidebar}>
          <div className={styles.tipCard}>
            <h3 className={styles.tipTitle}>提问技巧</h3>
            <ul className={styles.tipList}>
              <li>标题简洁明了，直述问题核心</li>
              <li>说明你使用的语言、框架和版本</li>
              <li>贴上相关代码片段或错误信息</li>
              <li>描述你已尝试过的解决方案</li>
              <li>添加合适的标签让更多人看到</li>
            </ul>
          </div>
          <div className={styles.pointsCard}>
            <p className={styles.pointsNote}>
              <span className={styles.pointsMinus}>−5</span> 积分
            </p>
            <p className={styles.pointsDesc}>发布问题会扣除 5 积分，获得好答案后可通过采纳回答的方式让社区获益。</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
