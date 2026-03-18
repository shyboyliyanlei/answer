import { useState, FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Auth.module.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || '/'

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '登录失败')
      login(data)
      navigate(from, { replace: true })
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
            每一个问题<br />
            <em>都值得一个好答案</em>
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
            <p className={styles.label}>欢迎回来</p>
            <h1 className={styles.title}>登录账户</h1>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.fields}>
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
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : '登录'}
            </button>
          </form>

          <p className={styles.switchText}>
            还没有账户？{' '}
            <Link to="/register" className={styles.switchLink}>立即注册</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
