import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './NotificationBell.module.css'

interface Notification {
  id: number
  type: 'answer' | 'question_vote' | 'answer_vote' | 'answer_accept'
  message: string
  related_question_id: number | null
  is_read: boolean
  created_at: string
}

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} 小时前`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} 天前`
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function TypeIcon({ type }: { type: Notification['type'] }) {
  if (type === 'answer') return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M1.5 1.5h10a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5H4l-2.5 2V2a.5.5 0 0 1 .5-.5z"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  )
  if (type === 'answer_accept') return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 6.5l3.5 3.5 5.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M6.5 2L8.2 5.4l3.8.55-2.75 2.68.65 3.78L6.5 10.6l-3.4 1.81.65-3.78L1 5.95l3.8-.55L6.5 2z"
        stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  )
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [ringing, setRinging] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const prevUnread = useRef(0)

  const unreadCount = items.filter(n => !n.is_read).length

  useEffect(() => {
    if (!user) return
    function load() {
      fetch(`/api/notifications?user_id=${user!.id}`)
        .then(r => r.json())
        .then(data => setItems(Array.isArray(data) ? data : []))
        .catch(() => {})
    }
    load()
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [user])

  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      setRinging(true)
      setTimeout(() => setRinging(false), 800)
    }
    prevUnread.current = unreadCount
  }, [unreadCount])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function toggleOpen() {
    setOpen(v => !v)
  }

  async function markAllRead() {
    if (!user) return
    await fetch('/api/notifications/read-all', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    })
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function markRead(id: number) {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  if (!user) return null

  return (
    <div className={styles.wrap} ref={panelRef}>
      <button
        className={`${styles.bell} ${ringing ? styles.ringing : ''}`}
        onClick={toggleOpen}
        aria-label={`通知${unreadCount > 0 ? `（${unreadCount}条未读）` : ''}`}
      >
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
          <path
            d="M8.5 2a5 5 0 0 1 5 5v3l1.2 2H2.3L3.5 10V7a5 5 0 0 1 5-5z"
            stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
          />
          <path d="M6.5 14a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>通知</span>
            {unreadCount > 0 && (
              <span className={styles.unreadChip}>{unreadCount} 未读</span>
            )}
            {unreadCount > 0 && (
              <button className={styles.readAllBtn} onClick={markAllRead}>全部已读</button>
            )}
          </div>

          <div className={styles.list}>
            {items.length === 0 ? (
              <div className={styles.empty}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M14 4a8 8 0 0 1 8 8v5l2 3H4l2-5V12a8 8 0 0 1 8-8z"
                    stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                  <path d="M11 23a3 3 0 0 0 6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <p className={styles.emptyText}>暂无通知</p>
              </div>
            ) : (
              items.map((n, i) => {
                const inner = (
                  <div
                    className={`${styles.item} ${!n.is_read ? styles.unread : ''}`}
                    style={{ animationDelay: `${i * 28}ms` }}
                    onClick={() => !n.is_read && markRead(n.id)}
                  >
                    <span className={`${styles.typeIcon} ${styles[`icon_${n.type}`]}`}>
                      <TypeIcon type={n.type} />
                    </span>
                    <div className={styles.itemBody}>
                      <p className={styles.itemMsg}>{n.message}</p>
                      <span className={styles.itemTime}>{formatTime(n.created_at)}</span>
                    </div>
                    {!n.is_read && <span className={styles.dot} />}
                  </div>
                )
                return n.related_question_id ? (
                  <Link
                    key={n.id}
                    to={`/questions/${n.related_question_id}`}
                    className={styles.itemLink}
                    onClick={() => { setOpen(false); if (!n.is_read) markRead(n.id) }}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
