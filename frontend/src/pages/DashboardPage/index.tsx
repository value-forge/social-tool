import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layout,
  Menu,
  Avatar,
  Typography,
  Button,
  Divider,
  Space,
  theme as antTheme,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  AimOutlined,
  FireOutlined,
  FileTextOutlined,
  FormOutlined,
  BellOutlined,
  SettingOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../hooks/useAuth'
import { useThemeMode } from '../../theme/ThemeProvider'
import FollowingListPanel from '../../components/dashboard/FollowingListPanel'
import MonitoredAccountsPanel from '../../components/dashboard/MonitoredAccountsPanel'
import TweetsPanel from '../../components/dashboard/TweetsPanel'

const { Sider, Header, Content } = Layout
const { Text } = Typography

function XIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

const MENU_ITEMS: MenuProps['items'] = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  {
    key: 'monitor',
    icon: <AimOutlined />,
    label: '监控',
    children: [
      { key: 'following', label: '关注列表' },
      { key: 'accounts', label: '监控账号' },
      { key: 'tweets', label: '推文动态' },
    ],
  },
  { key: 'trending', icon: <FireOutlined />, label: '热点大盘' },
  { key: 'drafts', icon: <FileTextOutlined />, label: '草稿历史' },
  { key: 'ai', icon: <FormOutlined />, label: 'AI 起草' },
  { type: 'divider', key: 'menu-divider-system' },
  {
    key: 'push',
    icon: <BellOutlined />,
    label: '推送',
    children: [
      { key: 'ding', label: '钉钉配置' },
      { key: 'feishu', label: '飞书配置' },
    ],
  },
  { key: 'settings', icon: <SettingOutlined />, label: '设置' },
]

/** 菜单 key → 页面标题（用于主区域展示） */
const MENU_PAGE_TITLE: Record<string, string> = {
  dashboard: 'Dashboard',
  following: '关注列表',
  accounts: '监控账号',
  tweets: '推文动态',
  trending: '热点大盘',
  drafts: '草稿历史',
  ai: 'AI 起草',
  ding: '钉钉配置',
  feishu: '飞书配置',
  settings: '设置',
}

export default function DashboardPage() {
  const { token } = antTheme.useToken()
  const { mode, toggleTheme } = useThemeMode()
  const menuTheme = mode === 'dark' ? 'dark' : 'light'
  const { user, loading, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['dashboard'])

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [loading, isAuthenticated, navigate])

  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: '100vh', background: token.colorBgLayout }}
      >
        <Text type="secondary">加载中…</Text>
      </div>
    )
  }

  const onMenuClick: MenuProps['onClick'] = (info) => {
    // 忽略分割线等无业务 key
    if (!info.key || String(info.key).startsWith('menu-divider')) return
    setSelectedKeys([String(info.key)])
  }

  const activeKey = selectedKeys[0] ?? 'dashboard'
  const pageTitle = MENU_PAGE_TITLE[activeKey] ?? '控制台'
  const showDashboardHome = activeKey === 'dashboard'
  const showFollowingList = activeKey === 'following'
  const showMonitoredAccounts = activeKey === 'accounts'
  const showTweets = activeKey === 'tweets'

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Sider
        className="dashboard-sider"
        width={232}
        theme={menuTheme}
        style={{
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          overflow: 'auto',
          borderRight: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
          }}
        >
        {/* 品牌 */}
        <div
          style={{
            height: 60,
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <span style={{ color: token.colorText, display: 'flex' }}>
            <XIcon size={22} />
          </span>
          <span style={{ fontSize: 15, fontWeight: 600, color: token.colorText }}>
            social_tool
          </span>
        </div>

        {/* 菜单：占满中间高度；展开态用 defaultOpenKeys 非受控，避免受控 openKeys 导致点击/展开失效 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            padding: '12px 0',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Menu
            theme={menuTheme}
            mode="inline"
            selectable
            selectedKeys={selectedKeys}
            defaultOpenKeys={['monitor', 'push']}
            onClick={onMenuClick}
            items={MENU_ITEMS}
            style={{
              border: 'none',
              background: 'transparent',
            }}
          />
        </div>
        </div>
      </Sider>

      <Layout style={{ background: token.colorBgLayout }}>
        <Header
          style={{
            height: 48,
            lineHeight: '48px',
            paddingInline: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 16,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Space size="middle" align="center">
            <Button
              type="text"
              icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
              title={mode === 'dark' ? '切换为浅色' : '切换为深色'}
              style={{ color: token.colorTextSecondary }}
            />
            {user && (
              <>
                <Divider type="vertical" style={{ height: 24, margin: 0, borderColor: token.colorBorderSecondary }} />
                <Space size={10} align="center">
                  <Avatar src={user.avatar_url} size={32} />
                  <div style={{ lineHeight: 1.3, maxWidth: 160 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: token.colorText,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.display_name}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                      @{user.twitter_username}
                    </Text>
                  </div>
                  <Button type="text" size="small" danger onClick={logout}>
                    登出
                  </Button>
                </Space>
              </>
            )}
          </Space>
        </Header>

        <Content style={{ overflow: 'auto' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 40px 40px' }}>
            <Typography.Title level={3} style={{ margin: 0, color: token.colorText }}>
              {pageTitle}
            </Typography.Title>
            <Text type="secondary" style={{ display: 'block', marginTop: 8, marginBottom: 32 }}>
              {showDashboardHome && '监控动态 · AI 起草 · 追踪热点'}
              {showFollowingList &&
                '使用 bird-cli 从当前 Chrome 登录的 X 账号拉取关注列表（无需 OAuth，直接读取 Chrome Cookies）。'}
              {showMonitoredAccounts &&
                '管理已添加监控的 Twitter 账号，系统将自动追踪这些账号的新推文。'}
              {showTweets &&
                '查看监控账号的最新推文动态，包括点赞、转发、评论等互动数据。'}
              {!showDashboardHome && !showFollowingList && !showMonitoredAccounts && !showTweets && '该功能开发中，后续将在此展示对应页面'}
            </Text>

            {showFollowingList && (
              <div
                style={{
                  padding: 24,
                  marginBottom: 32,
                  borderRadius: token.borderRadiusLG,
                  background: token.colorBgContainer,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <FollowingListPanel />
              </div>
            )}

            {showMonitoredAccounts && (
              <div
                style={{
                  padding: 24,
                  marginBottom: 32,
                  borderRadius: token.borderRadiusLG,
                  background: token.colorBgContainer,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <MonitoredAccountsPanel />
              </div>
            )}

            {showTweets && (
              <div
                style={{
                  padding: 24,
                  marginBottom: 32,
                  borderRadius: token.borderRadiusLG,
                  background: token.colorBgContainer,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <TweetsPanel />
              </div>
            )}

            {!showDashboardHome && !showFollowingList && !showMonitoredAccounts && !showTweets && (
              <div
                style={{
                  padding: 24,
                  marginBottom: 32,
                  borderRadius: token.borderRadiusLG,
                  background: token.colorBgContainer,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <Text type="secondary">
                  当前菜单：<Text strong style={{ color: token.colorText }}>{pageTitle}</Text>
                  <br />
                  <span style={{ marginTop: 8, display: 'inline-block' }}>
                    接口与页面接入后，此处将替换为实际业务内容。
                  </span>
                </Text>
              </div>
            )}

            {showDashboardHome && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 12,
                marginBottom: 32,
              }}
            >
              {[
                { label: '监控账号', value: '0', unit: '个账号', dot: '#1d9bf0' },
                { label: '今日新推文', value: '0', unit: '条', dot: '#22c55e' },
                { label: '待处理草稿', value: '0', unit: '条待复制', dot: '#f59e0b' },
                { label: '热点话题', value: '0', unit: '个在榜', dot: '#ef4444' },
              ].map((c) => (
                <div
                  key={c.label}
                  style={{
                    padding: 20,
                    borderRadius: token.borderRadiusLG,
                    background: token.colorBgContainer,
                    border: `1px solid ${token.colorBorderSecondary}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>{c.label}</Text>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, opacity: 0.7 }} />
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: token.colorText }}>{c.value}</div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>{c.unit}</Text>
                </div>
              ))}
            </div>
            )}

            {showDashboardHome && (
            <div>
                <Text strong style={{ fontSize: 13, color: token.colorTextTertiary, display: 'block', marginBottom: 12 }}>
                  快捷操作
                </Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { title: '导入关注列表', desc: '自动获取你的 X 关注列表，快速添加监控', badge: '推荐' },
                    { title: '添加监控账号', desc: '手动输入 X 用户名，加入监控列表' },
                    { title: '查看热点大盘', desc: '实时 X 热门话题，每 10 分钟更新一次' },
                    { title: '配置钉钉推送', desc: '新推文、草稿生成时推送到钉钉群' },
                  ].map((a) => (
                    <a
                      key={a.title}
                      href="#"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 16,
                        borderRadius: token.borderRadiusLG,
                        background: token.colorBgContainer,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        textDecoration: 'none',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = token.colorPrimaryBorderHover
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = token.colorBorderSecondary
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: token.colorText }}>{a.title}</span>
                          {a.badge && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'rgba(34,197,94,0.12)',
                                color: '#22c55e',
                              }}
                            >
                              {a.badge}
                            </span>
                          )}
                        </div>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>{a.desc}</Text>
                      </div>
                    </a>
                  ))}
                </div>
            </div>
            )}
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
