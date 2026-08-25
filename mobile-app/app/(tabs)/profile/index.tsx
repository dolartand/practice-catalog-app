import { AuthGuard } from '@entities/session';
import { ProfileMenuPage } from '@pages/profile/menu';

export default function ProfileIndexScreen() {
  return (
    <AuthGuard>
      <ProfileMenuPage />
    </AuthGuard>
  );
}
