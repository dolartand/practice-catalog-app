import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

import { ProductForm } from '@features/product-form';
import { PageHeader } from '@shared/ui';

export function ProductCreatePage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        title="Новый товар"
        subtitle="SKU-варианты и изображения добавляются на карточке после создания"
        extra={<Button onClick={() => navigate('/products')}>К списку</Button>}
      />
      <ProductForm />
    </>
  );
}
