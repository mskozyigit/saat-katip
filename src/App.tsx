// ============================================================================
// App — Ana Uygulama Bileşeni (Auth Gate + Ionic Router)
// ============================================================================

import { IonApp, IonRouterOutlet } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';

/* Ionic tema ve özel stiller */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './theme/variables.css';

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <IonApp>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          fontSize: 24,
          color: 'var(--color-text-secondary)',
        }}>
          ⏱️ Yükleniyor...
        </div>
      </IonApp>
    );
  }

  return (
    <IonApp>
      <IonReactRouter basename="/saat-katip">
        <IonRouterOutlet>
          {session ? (
            <>
              <Route exact path="/" component={HomePage} />
              <Redirect to="/" />
            </>
          ) : (
            <>
              <Route exact path="/login" component={LoginPage} />
              <Redirect to="/login" />
            </>
          )}
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
}
