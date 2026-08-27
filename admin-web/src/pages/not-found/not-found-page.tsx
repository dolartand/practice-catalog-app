import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Result
      status="404"
      title="404"
      subTitle="Такой страницы не существует."
      extra={
        <Button type="primary">
          <Link to="/dashboard">На дашборд</Link>
        </Button>
      }
    />
  );
}
