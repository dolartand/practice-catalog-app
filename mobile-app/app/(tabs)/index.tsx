import { Redirect } from 'expo-router';

import { ROUTES } from '@shared/lib';

export default function TabsIndex() {
  return <Redirect href={ROUTES.tabs.catalog} />;
}