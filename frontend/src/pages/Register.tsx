import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import styles from './Auth.module.css'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '注册失败')
      // TODO: 跳转登录页
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <aside className={styles.brand}>
        <div className={styles.brandInner}>
          <span className={styles.logo}>答</span>
          <p className={styles.tagline}>
            加入社区<br />
            <em>开始提问与分享</em>
          </p>
        </div>
        <div className={styles.brandDeco} aria-hidden="true">
          <span className={styles.decoNum}>01</span>
          <span className={styles.decoLine} />
          <span className={styles.decoNum}>02</span>
          <span className={styles.decoLine} />
          <span className={styles.decoNum}>03</span>
        </div>
      </aside>

      <main className={styles.form}>
        <div className={styles.formInner}>
          <div className={styles.heading}>
            <p className={styles.label}>创建账户</p>
            <h1 className={styles.title}>注册</h1>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.fields}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="username">用户名</label>
              <input
                id="username"
                type="text"
                className={styles.input}
                placeholder="取一个独特的名字"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required
                autoComplete="username"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="email">邮箱</label>
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="password">密码</label>
              <input
                id="password"
                type="password"
                className={styles.input}
                placeholder="至少 8 位字符"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : '创建账户'}
            </button>
          </form>

          <p className={styles.switchText}>
            已有账户？{' '}
            <Link to="/login" className={styles.switchLink}>直接登录</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
