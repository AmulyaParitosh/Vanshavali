import AppProvider from '../providers/AppProvider';
import './globals.css';

export const metadata = {
  title: 'Vanshavali',
  description: 'Family Tree Application',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}