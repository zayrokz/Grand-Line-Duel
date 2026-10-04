import { Link, Route, Routes } from 'react-router-dom';
import { useOnline } from './hooks/useOnline';
import { USE_EMULATORS } from './firebase';
import { GamePage } from './pages/GamePage';
import { HomePage } from './pages/HomePage';
import { JoinPage } from './pages/JoinPage';
import { NotFound } from './pages/NotFound';
import { ProfilePage } from './pages/ProfilePage';
import { RulesPage } from './pages/RulesPage';
import { GAME_TITLE, ICONS } from './theme';

export function App() {
  const online = useOnline();
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand" aria-label={`${GAME_TITLE} — accueil`}>
          <img src={ICONS.logo} alt="" width={28} height={28} />
          <span>{GAME_TITLE}</span>
        </Link>
        <nav>
          <Link to="/regles">Règles</Link>
          <Link to="/profil">Profil</Link>
        </nav>
      </header>
      {!online && (
        <div className="banner">Hors ligne : la partie reprendra dès le retour du réseau.</div>
      )}
      {USE_EMULATORS && (
        <div className="banner banner-dev">Mode développement : émulateurs Firebase</div>
      )}
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/profil" element={<ProfilePage />} />
          <Route path="/regles" element={<RulesPage />} />
          <Route path="/rejoindre/:code" element={<JoinPage />} />
          <Route path="/partie/:gameId" element={<GamePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
