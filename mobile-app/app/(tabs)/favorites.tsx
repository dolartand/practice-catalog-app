import { AuthGuard } from '@entities/session';
import { FavoritesPage } from '@pages/favorites';

export default function FavoritesTabScreen() {
  return (
    <AuthGuard>
      <FavoritesPage />
    </AuthGuard>
  );
}
