import { useState, useEffect, useRef, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'
import styles from './Topbar.module.css'

export default function Topbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  function openSearch() {
    setSearchOpen(true)
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }

  function closeSearch() {
    setSearchOpen(false)
    setSearchVal('')
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault()
    const q = searchVal.trim()
    if (!q) return
    closeSearch()
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && searchOpen) closeSearch()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen])

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarInner}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandChar}>答</span>
          <div className={styles.brandText}>
            <span className={styles.brandName}>问答社区</span>
            <span className={styles.brandSub}>知识共建平台</span>
          </div>
        </Link>

        {/* 展开时显示搜索框，折叠时占位为零 */}
        <div className={styles.searchArea}>
          {searchOpen && (
            <form className={styles.searchBar} onSubmit={handleSearchSubmit}>
              <svg className={styles.searchBarIcon} width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M9.5 9.5l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input
                ref={searchInputRef}
                className={styles.searchBarInput}
                type="text"
                placeholder="搜索问题…"
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className={styles.searchBarBtn}>搜索</button>
              <button type="button" className={styles.searchBarClose} onClick={closeSearch} aria-label="关闭搜索">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </form>
          )}
        </div>

        <nav className={styles.nav}>
          {/* 搜索图标：个人中心左侧 */}
          <button className={styles.searchNavBtn} onClick={openSearch} aria-label="搜索">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 10l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          {user ? (
            <>
              <Link to={`/users/${user.id}`} className={styles.navUser}>{user.username}</Link>
              <Link to="/ask" className={styles.askBtn}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                提问
              </Link>
              <button className={styles.logoutBtn} onClick={handleLogout}>退出</button>
              {/* 铃铛：退出右侧 */}
              <NotificationBell />
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
  )
}
