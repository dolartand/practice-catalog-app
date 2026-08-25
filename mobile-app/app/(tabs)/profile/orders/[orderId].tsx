import { AuthGuard } from '@entities/session';
import { OrderDetailPage } from '@pages/order-detail';

export default function OrderDetailScreen() {
  return (
    <AuthGuard>
      <OrderDetailPage />
    </AuthGuard>
  );
}