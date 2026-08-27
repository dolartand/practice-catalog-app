import { Card, Empty, Typography } from 'antd';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <Card title={title} styles={{ body: { paddingBlock: 48 } }}>
      <Empty description={false}>
        <Typography.Text strong>Раздел в разработке</Typography.Text>
        <br />
        <Typography.Text type="secondary">{description}</Typography.Text>
      </Empty>
    </Card>
  );
}

export type { PlaceholderPageProps };
