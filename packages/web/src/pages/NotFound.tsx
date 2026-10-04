import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="panel center">
      <h2>Eaux inconnues</h2>
      <p>Cette page n’existe pas.</p>
      <Link className="button primary" to="/">
        Retour au port
      </Link>
    </div>
  );
}
