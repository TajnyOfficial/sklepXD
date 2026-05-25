import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiLogIn, FiUser, FiLock } from 'react-icons/fi';
import toast from 'react-hot-toast';

/* Ekran autoryzacji do głównego systemu ERP oparty o formularz (login i hasło) łączący się z Supabase lub logowaniem awaryjnym */
export default function LoginPage() {
  /* Funkcja weryfikująca poświadczenia udostępniana przez kontekst uwierzytelniania */
  const { loginWithCredentials } = useAuth();
  
  /* Zmienna routingu react-router-dom do przekierowywania np. po udanym logowaniu */
  const navigate = useNavigate();
  
  /* Lokalne stany formularza kontrolujące inputy oraz stan procedury logowania (ładowanie, błędne hasło) */
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* Funkcja zatwierdzająca formularz z obsługą blokady podczas próby logowania (loading) */
  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Wprowadź nazwę użytkownika i hasło');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await loginWithCredentials(username, password);
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success(`Zalogowano pomyślnie`);
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError('Wystąpił błąd podczas logowania');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page" style={{
      width: '100%',
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(145deg, var(--bg) 0%, var(--bg-secondary) 100%)',
      padding: '24px'
    }}>
      <div className="login-card" style={{
        background: 'var(--bg-card)',
        padding: '48px',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid var(--border-light)'
      }}>
        
        <div className="login-logo" style={{ marginBottom: '32px' }}>
          <div className="sidebar-logo" style={{ 
            width: 56, 
            height: 56, 
            fontSize: '1.8rem',
            margin: '0 auto',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            color: 'white',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800
          }}>S</div>
        </div>
        
        <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '1.5rem', fontWeight: 700 }}>SklepXD ERP</h2>
        <p className="login-subtitle" style={{ textAlign: 'center', marginBottom: '32px', color: 'var(--text-muted)' }}>
          Zaloguj się do panelu zarządzania
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: 'var(--danger-bg, #fee2e2)',
              color: 'var(--danger)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '20px',
              textAlign: 'center',
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          <div className="input-group mb-16">
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Nazwa użytkownika</label>
            <div style={{ position: 'relative' }}>
              <FiUser style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
              <input 
                type="text" 
                className="input" 
                style={{ paddingLeft: 42, paddingRight: 16, height: 48, fontSize: '1rem' }}
                placeholder="Wprowadź login lub email..." 
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                disabled={loading}
              />
            </div>
          </div>

          <div className="input-group mb-24">
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Hasło</label>
            <div style={{ position: 'relative' }}>
              <FiLock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
              <input 
                type="password" 
                className="input" 
                style={{ paddingLeft: 42, paddingRight: 16, height: 48, fontSize: '1rem' }}
                placeholder="Wprowadź hasło..." 
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              width: '100%', 
              height: 48, 
              fontSize: '1rem', 
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px'
            }}
            disabled={loading}
          >
            {loading ? <div className="spinner"></div> : <><FiLogIn /> Zaloguj się</>}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Konto awaryjne: login <b>admin</b>, hasło <b>admin</b>
        </div>
      </div>
    </div>
  );
}
