declare module 'expo-router/entry' {
  import { ReactNode } from 'react';
  
  interface EntryProps {
    children?: ReactNode;
  }
  
  const Entry: React.FC<EntryProps>;
  export default Entry;
}