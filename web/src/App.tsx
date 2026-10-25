import ProvedorAutenticacao from './autenticacao/ProvedorAutenticacao';
import AppRoutes from './routes/AppRoutes';

// O provedor fica dentro do BrowserRouter (main.tsx), pois navega após login e logout
export default function App() {
  return (
    <ProvedorAutenticacao>
      <AppRoutes />
    </ProvedorAutenticacao>
  );
}
