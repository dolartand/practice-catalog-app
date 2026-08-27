import {
  AppstoreOutlined,
  DashboardOutlined,
  LogoutOutlined,
  ShoppingCartOutlined,
  StarOutlined,
  TagsOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Dropdown, Flex, Layout, Menu, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@entities/session';

const { Sider, Header, Content } = Layout;

const MENU_ITEMS: MenuProps['items'] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: <Link to="/dashboard">Дашборд</Link> },
  { key: '/products', icon: <AppstoreOutlined />, label: <Link to="/products">Товары</Link> },
  { key: '/categories', icon: <TagsOutlined />, label: <Link to="/categories">Категории</Link> },
  { key: '/orders', icon: <ShoppingCartOutlined />, label: <Link to="/orders">Заказы</Link> },
  { key: '/reviews', icon: <StarOutlined />, label: <Link to="/reviews">Отзывы</Link> },
];

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const selectedKey = `/${location.pathname.split('/')[1] ?? ''}`;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const userMenu: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти',
      onClick: () => void handleLogout(),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="light"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={232}
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <Flex
          align="center"
          gap={10}
          style={{ height: 64, paddingInline: 16, overflow: 'hidden' }}
        >
          <Avatar shape="square" size={36} style={{ backgroundColor: '#2f54eb', flexShrink: 0 }}>
            Ф
          </Avatar>
          {!collapsed && (
            <Flex vertical style={{ lineHeight: 1.2 }}>
              <Typography.Text strong>Фарфоровый завод</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Админ-панель
              </Typography.Text>
            </Flex>
          )}
        </Flex>
        <Menu mode="inline" selectedKeys={[selectedKey]} items={MENU_ITEMS} />
      </Sider>
      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingInline: 24,
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <Flex align="center" gap={8} style={{ cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <Typography.Text>{user?.email}</Typography.Text>
            </Flex>
          </Dropdown>
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
