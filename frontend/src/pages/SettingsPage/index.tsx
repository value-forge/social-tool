import { useState, useEffect } from 'react'
import { getSettings, updateSettings } from '../../api/settings'

interface SettingsPageProps {
  userId: string
}

export function SettingsPage({ userId }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'general'>('notifications')
  const [settings, setSettings] = useState<{
    poll_interval_minutes: number
    feed_poll_interval_minutes: number
    notify_on_new_post: boolean
    notify_on_draft_ready: boolean
    notify_on_trending: boolean
    notify_on_feed_summary: boolean
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [userId])

  const loadSettings = async () => {
    try {
      const data = await getSettings(userId)
      setSettings({
        poll_interval_minutes: data.poll_interval_minutes,
        feed_poll_interval_minutes: data.feed_poll_interval_minutes,
        notify_on_new_post: data.notify_on_new_post,
        notify_on_draft_ready: data.notify_on_draft_ready,
        notify_on_trending: data.notify_on_trending,
        notify_on_feed_summary: data.notify_on_feed_summary,
      })
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  const handleSaveGeneralSettings = async () => {
    if (!settings) return
    
    setLoading(true)
    setSaveSuccess(false)
    
    try {
      await updateSettings(userId, settings)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save settings:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="settings-page" style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>⚙️ 设置</h1>
        <p style={styles.subtitle}>管理您的推送通道和系统偏好</p>
      </div>

      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'notifications' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 推送通知
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'general' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('general')}
        >
          ⚙️ 通用设置
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'notifications' ? (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>消息推送设置</h2>
            
            <div style={styles.switchGroup}>
              <div style={styles.switchItem}>
                <span>新推文到达时推送</span>
                <label style={styles.switch}>
                  <input
                    type="checkbox"
                    checked={settings?.notify_on_new_post ?? true}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev
                          ? { ...prev, notify_on_new_post: e.target.checked }
                          : null
                      )
                    }
                  />
                  <span style={styles.slider}></span>
                </label>
              </div>

              <div style={styles.switchItem}>
                <span>草稿生成完成时推送</span>
                <label style={styles.switch}>
                  <input
                    type="checkbox"
                    checked={settings?.notify_on_draft_ready ?? true}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev
                          ? { ...prev, notify_on_draft_ready: e.target.checked }
                          : null
                      )
                    }
                  />
                  <span style={styles.slider}></span>
                </label>
              </div>

              <div style={styles.switchItem}>
                <span>热点大盘更新时推送</span>
                <label style={styles.switch}>
                  <input
                    type="checkbox"
                    checked={settings?.notify_on_trending ?? true}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev
                          ? { ...prev, notify_on_trending: e.target.checked }
                          : null
                      )
                    }
                  />
                  <span style={styles.slider}></span>
                </label>
              </div>

              <div style={styles.switchItem}>
                <span>信息流摘要生成时推送</span>
                <label style={styles.switch}>
                  <input
                    type="checkbox"
                    checked={settings?.notify_on_feed_summary ?? false}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev
                          ? { ...prev, notify_on_feed_summary: e.target.checked }
                          : null
                      )
                    }
                  />
                  <span style={styles.slider}></span>
                </label>
              </div>
            </div>

            <hr style={styles.divider} />

            <div style={{ padding: '20px 0' }}>
              <p style={{ color: '#71767b' }}>
                钉钉配置已移至「推送 → 钉钉配置」菜单
              </p>
            </div>
          </div>
        ) : (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>通用设置</h2>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>推文拉取频率（分钟）</label>
              <select
                style={styles.select}
                value={settings?.poll_interval_minutes ?? 10}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev
                      ? { ...prev, poll_interval_minutes: parseInt(e.target.value) }
                      : null
                  )
                }
              >
                <option value={5}>5 分钟</option>
                <option value={10}>10 分钟</option>
                <option value={15}>15 分钟</option>
                <option value={30}>30 分钟</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>推荐流拉取频率（分钟）</label>
              <select
                style={styles.select}
                value={settings?.feed_poll_interval_minutes ?? 5}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev
                      ? { ...prev, feed_poll_interval_minutes: parseInt(e.target.value) }
                      : null
                  )
                }
              >
                <option value={5}>5 分钟</option>
                <option value={10}>10 分钟</option>
                <option value={15}>15 分钟</option>
              </select>
            </div>

            <button
              style={styles.saveButton}
              onClick={handleSaveGeneralSettings}
              disabled={loading}
            >
              {loading ? '保存中...' : '保存设置'}
            </button>

            {saveSuccess && (
              <div style={styles.saveSuccess}>✅ 设置已保存</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#71767b',
    margin: 0,
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '1px solid #2a2a2a',
    paddingBottom: '12px',
  },
  tab: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#71767b',
    cursor: 'pointer',
  },
  activeTab: {
    backgroundColor: '#1a1a1a',
    color: '#e7e9ea',
  },
  content: {
    backgroundColor: '#111111',
    borderRadius: '12px',
    padding: '24px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    margin: '0 0 8px 0',
  },
  switchGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  switchItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
  },
  switch: {
    position: 'relative',
    display: 'inline-block',
    width: '48px',
    height: '24px',
  },
  slider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#2a2a2a',
    borderRadius: '24px',
    transition: '0.3s',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #2a2a2a',
    margin: '24px 0',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
  },
  select: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #2a2a2a',
    backgroundColor: '#0a0a0a',
    color: '#e7e9ea',
    fontSize: '14px',
  },
  saveButton: {
    padding: '12px 24px',
    backgroundColor: '#1d9bf0',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: '8px',
  },
  saveSuccess: {
    padding: '12px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    color: '#22c55e',
    borderRadius: '6px',
    fontSize: '14px',
  },
}
