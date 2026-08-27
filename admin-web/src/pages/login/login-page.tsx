import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Alert, Avatar, Button, Card, Flex, Form, Input, Typography } from 'antd';
import type { Rule } from 'antd/es/form';
import type { NamePath } from 'antd/es/form/interface';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { AccessDeniedError, useAuth } from '@entities/session';
import { parseApiError } from '@shared/api';
import { getFeedback } from '@shared/lib';
import { FullPageSpinner } from '@shared/ui';

interface LoginFormValues {
  email: string;
  password: string;
}

const emailRules: Rule[] = [
  { required: true, message: 'Введите email' },
  { type: 'email', message: 'Некорректный email' },
];

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm<LoginFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // Маршрут, с которого пользователя редиректнуло на логин (guard сохраняет state.from)
  const fromPathname = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  if (status === 'restoring') {
    return <FullPageSpinner />;
  }

  if (status === 'authenticated') {
    return <Navigate to={fromPathname ?? '/dashboard'} replace />;
  }

  const onFinish = async (values: LoginFormValues) => {
    setSubmitting(true);
    setAccessDenied(false);
    try {
      await login(values);
      navigate(fromPathname ?? '/dashboard', { replace: true });
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        setAccessDenied(true);
        return;
      }
      const appError = parseApiError(error);
      switch (appError.kind) {
        case 'api': {
          const fieldErrors = Object.entries(appError.fieldErrors);
          if (fieldErrors.length > 0) {
            form.setFields(
              fieldErrors.map(([name, errors]) => ({
                name: name as NamePath<LoginFormValues>,
                errors,
              })),
            );
            break;
          }
          getFeedback().message.error(
            appError.status === 401 || appError.status === 400
              ? 'Неверный email или пароль'
              : appError.title,
          );
          break;
        }
        case 'network': {
          getFeedback().message.error('Нет соединения с сервером');
          break;
        }
        default: {
          getFeedback().message.error('Не удалось выполнить вход. Попробуйте ещё раз');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Flex
      align="center"
      justify="center"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #f5f6fa 0%, #e9edfb 60%, #dfe7fa 100%)',
        padding: 24,
      }}
    >
      <Card
        style={{ width: 400, boxShadow: '0 12px 32px rgba(31, 50, 108, 0.10)' }}
        styles={{ body: { paddingBlock: 32 } }}
      >
        <Flex vertical gap={24}>
          <Flex vertical align="center" gap={8}>
            <Avatar
              shape="square"
              size={48}
              style={{ backgroundColor: '#2f54eb', fontSize: 22, fontWeight: 600 }}
            >
              Ф
            </Avatar>
            <Typography.Title level={3} style={{ marginBottom: 0 }}>
              Админ-панель
            </Typography.Title>
            <Typography.Text type="secondary">Фарфоровый завод</Typography.Text>
          </Flex>

          {accessDenied && (
            <Alert
              type="warning"
              showIcon
              message="Доступ только для администраторов"
              description="Этот аккаунт не имеет роли ADMIN."
            />
          )}

          <Form<LoginFormValues> form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item name="email" label="Email" rules={emailRules}>
              <Input autoComplete="username" placeholder="admin@example.com" prefix={<MailOutlined />} />
            </Form.Item>
            <Form.Item name="password" label="Пароль" rules={[{ required: true, message: 'Введите пароль' }]}>
              <Input.Password autoComplete="current-password" placeholder="Пароль" prefix={<LockOutlined />} />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              Войти
            </Button>
          </Form>
        </Flex>
      </Card>
    </Flex>
  );
}
