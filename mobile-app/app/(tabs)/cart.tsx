import { AuthGuard } from '@entities/session';
import { CartPage } from '@pages/cart';

export default function CartTabScreen() {
  return (
    <AuthGuard>
      <CartPage />
    </AuthGuard>
  );
}