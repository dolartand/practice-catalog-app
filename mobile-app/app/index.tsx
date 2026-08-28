import { Redirect } from 'expo-router';

import { ROUTES } from '@shared/lib';

export default function Index() {
  return <Redirect href={ROUTES.tabs.catalog} />;
}