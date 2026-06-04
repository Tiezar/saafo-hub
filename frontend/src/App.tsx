import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Layers, 
  Sparkles, 
  User as UserIcon, 
  LogOut, 
  TrendingUp, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Flame, 
  Brain, 
  Search, 
  RotateCw, 
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Check
} from 'lucide-react';

// API Configuration
const API_URL = 'http://localhost:3000';

interface User {
  id: string;
  email: string;
  name: string;
  nickname: string | null;
  institutionId: string | null;
}

interface Institution {
  id: string;
  name: string;
  sigla: string;
  uf: string;
  domains: string[];
}

interface Subject {
  id: string;
  name: string;
  color: string | null;
}

interface Topic {
  id: string;
  name: string;
  subjectId: string;
}

interface Card {
  id: string;
  front: string;
  back: string;
  topicId: string;
  interval: number;
  repetition: number;
  efactor: number;
  nextReview: string;
}

interface Metrics {
  totalReviewed: number;
  averageRating: number;
  retentionRate: number;
  dailyActivity: { date: string; count: number }[];
  subjectsPerformance: {
    subjectId: string;
    subjectName: string;
    totalCards: number;
    reviewedCards: number;
    averageRating: number;
    retentionRate: number;
  }[];
}

export default function App() {
  // Navigation & Authentication
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'subjects' | 'ai' | 'profile'>('dashboard');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Data states
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  
  // Active states
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  
  // Forms & Modals
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#8b5cf6');
  const [newTopicName, setNewTopicName] = useState('');
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  
  // AI generation state
  const [aiText, setAiText] = useState('');
  const [aiTopicId, setAiTopicId] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiGeneratedCards, setAiGeneratedCards] = useState<{ front: string; back: string }[]>([]);
  
  // Profile Update Form
  const [profileName, setProfileName] = useState('');
  const [profileNickname, setProfileNickname] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileInstSearch, setProfileInstSearch] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [showInstDropdown, setShowInstDropdown] = useState(false);
  
  // Study session player
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [currentSessionCardIndex, setCurrentSessionCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Mock Database for Offline/Fallback Mode
  const [mockDb, setMockDb] = useState<{
    users: User[];
    institutions: Institution[];
    subjects: Subject[];
    topics: Topic[];
    cards: Card[];
    metrics: Metrics;
  }>({
    users: [],
    institutions: [
      { id: '1', name: 'Universidade de São Paulo', sigla: 'USP', uf: 'SP', domains: ['usp.br'] },
      { id: '2', name: 'Universidade Estadual de Campinas', sigla: 'UNICAMP', uf: 'SP', domains: ['unicamp.br'] },
      { id: '3', name: 'Instituto Federal de Rondônia - Campus Ariquemes', sigla: 'IFRO Ariquemes', uf: 'RO', domains: ['ifro.edu.br'] },
      { id: '4', name: 'Universidade Federal do Rio de Janeiro', sigla: 'UFRJ', uf: 'RJ', domains: ['ufrj.br'] },
      { id: '5', name: 'Universidade Federal de Minas Gerais', sigla: 'UFMG', uf: 'MG', domains: ['ufmg.br'] },
      { id: '6', name: 'Instituto Federal de São Paulo', sigla: 'IFSP', uf: 'SP', domains: ['ifsp.edu.br'] }
    ],
    subjects: [
      { id: 'sub-1', name: 'Direito Constitucional', color: '#3b82f6' },
      { id: 'sub-2', name: 'Anatomia Humana', color: '#10b981' }
    ],
    topics: [
      { id: 'top-1', name: 'Direitos Individuais (Artigo 5º)', subjectId: 'sub-1' },
      { id: 'top-2', name: 'Sistema Cardiovascular', subjectId: 'sub-2' }
    ],
    cards: [
      { id: 'card-1', front: 'O que diz o Artigo 5º sobre a igualdade?', back: 'Todos são iguais perante a lei, sem distinção de qualquer natureza.', topicId: 'top-1', interval: 1, repetition: 0, efactor: 2.5, nextReview: new Date().toISOString() },
      { id: 'card-2', front: 'Qual a câmara principal do coração que bombeia sangue para a artéria aorta?', back: 'Ventrículo Esquerdo.', topicId: 'top-2', interval: 1, repetition: 0, efactor: 2.5, nextReview: new Date().toISOString() }
    ],
    metrics: {
      totalReviewed: 15,
      averageRating: 4.2,
      retentionRate: 88.5,
      dailyActivity: [
        { date: new Date().toISOString().split('T')[0], count: 5 },
        { date: new Date(Date.now() - 86400000).toISOString().split('T')[0], count: 3 }
      ],
      subjectsPerformance: [
        { subjectId: 'sub-1', subjectName: 'Direito Constitucional', totalCards: 1, reviewedCards: 1, averageRating: 4.5, retentionRate: 90 },
        { subjectId: 'sub-2', subjectName: 'Anatomia Humana', totalCards: 1, reviewedCards: 1, averageRating: 4.0, retentionRate: 85 }
      ]
    }
  });

  // Load Initial Data
  useEffect(() => {
    if (token) {
      fetchUserProfile();
      fetchInstitutions();
    }
  }, [token]);

  useEffect(() => {
    if (currentUser) {
      fetchSubjectsAndCards();
      fetchMetrics();
    }
  }, [currentUser, isOfflineMode]);

  // Alert message timeout
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleOfflineNotice = () => {
    setIsOfflineMode(true);
    setErrorMessage('Conectado no Modo Local/Simulado.');
  };

  // API Call helper
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    if (isOfflineMode) {
      throw new Error('Offline Mode Active');
    }
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };
    try {
      const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
      if (res.status === 401) {
        handleLogout();
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Erro na requisição');
      }
      return await res.json();
    } catch (err: any) {
      if (err.message.includes('Failed to fetch') || err.message === 'Offline Mode Active') {
        if (!isOfflineMode) {
          handleOfflineNotice();
        }
        throw err;
      }
      throw err;
    }
  };

  const fetchUserProfile = async () => {
    try {
      const user = await apiCall('/profile');
      setCurrentUser(user);
      setProfileName(user.name);
      setProfileNickname(user.nickname || '');
      if (user.institutionId) {
        const matched = mockDb.institutions.find(i => i.id === user.institutionId);
        if (matched) setSelectedInstitution(matched);
      }
    } catch (err) {
      // Fallback
      const mockUser: User = {
        id: 'mock-user-1',
        email: 'estudante@saafo.edu.br',
        name: 'Carlos Estudante',
        nickname: 'carlinhos',
        institutionId: '3' // IFRO
      };
      setCurrentUser(mockUser);
      setProfileName(mockUser.name);
      setProfileNickname(mockUser.nickname || '');
      setSelectedInstitution(mockDb.institutions.find(i => i.id === '3') || null);
    }
  };

  const fetchInstitutions = async (search = '') => {
    try {
      const list = await apiCall(`/institutions?search=${encodeURIComponent(search)}`);
      setInstitutions(list);
    } catch (err) {
      // Fallback
      if (search) {
        const filtered = mockDb.institutions.filter(
          i => i.name.toLowerCase().includes(search.toLowerCase()) || 
               i.sigla.toLowerCase().includes(search.toLowerCase())
        );
        setInstitutions(filtered);
      } else {
        setInstitutions(mockDb.institutions);
      }
    }
  };

  const fetchSubjectsAndCards = async () => {
    try {
      const subList = await apiCall('/subjects');
      setSubjects(subList);
      
      // Load all cards for these subjects
      // In real backend, we'll fetch them dynamically. Let's load mock state if fails
    } catch (err) {
      setSubjects(mockDb.subjects);
      setTopics(mockDb.topics);
      setCards(mockDb.cards);
    }
  };

  const fetchMetrics = async () => {
    try {
      const data = await apiCall('/metrics');
      setMetrics(data);
    } catch (err) {
      setMetrics(mockDb.metrics);
    }
  };

  // Auth Handling
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        // Register simulation
        const mockUser = {
          id: `user-${Date.now()}`,
          email: authEmail,
          name: authName,
          nickname: '',
          institutionId: null
        };
        const updatedDb = { ...mockDb, users: [...mockDb.users, mockUser] };
        setMockDb(updatedDb);
        setIsRegistering(false);
        setErrorMessage('Cadastro simulado com sucesso! Faça login.');
      } else {
        // Login simulation
        const fakeToken = `fake-jwt-${Date.now()}`;
        localStorage.setItem('token', fakeToken);
        setToken(fakeToken);
        setErrorMessage('Logado com sucesso!');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    setIsOfflineMode(false);
  };

  // Subjects CRUD
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    try {
      let created: Subject;
      if (isOfflineMode) {
        created = {
          id: `sub-${Date.now()}`,
          name: newSubjectName,
          color: newSubjectColor
        };
        const updated = [...subjects, created];
        setSubjects(updated);
        setMockDb({ ...mockDb, subjects: updated });
      } else {
        created = await apiCall('/subjects', {
          method: 'POST',
          body: JSON.stringify({ name: newSubjectName, color: newSubjectColor })
        });
        setSubjects([...subjects, created]);
      }
      setNewSubjectName('');
      setErrorMessage('Matéria criada com sucesso!');
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleDeleteSubject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir esta matéria e tudo relacionado?')) return;
    try {
      if (isOfflineMode) {
        const filtered = subjects.filter(s => s.id !== id);
        setSubjects(filtered);
        setTopics(topics.filter(t => t.subjectId !== id));
        setMockDb({
          ...mockDb,
          subjects: filtered,
          topics: mockDb.topics.filter(t => t.subjectId !== id),
          cards: mockDb.cards.filter(c => !topics.find(t => t.subjectId === id && t.id === c.topicId))
        });
      } else {
        await apiCall(`/subjects/${id}`, { method: 'DELETE' });
        setSubjects(subjects.filter(s => s.id !== id));
      }
      if (selectedSubject?.id === id) {
        setSelectedSubject(null);
        setSelectedTopic(null);
      }
      setErrorMessage('Matéria excluída.');
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Topics CRUD
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim() || !selectedSubject) return;

    try {
      let created: Topic;
      if (isOfflineMode) {
        created = {
          id: `top-${Date.now()}`,
          name: newTopicName,
          subjectId: selectedSubject.id
        };
        const updated = [...topics, created];
        setTopics(updated);
        setMockDb({ ...mockDb, topics: updated });
      } else {
        created = await apiCall('/topics', {
          method: 'POST',
          body: JSON.stringify({ name: newTopicName, subjectId: selectedSubject.id })
        });
        setTopics([...topics, created]);
      }
      setNewTopicName('');
      setErrorMessage('Tópico criado!');
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleDeleteTopic = async (id: string) => {
    if (!confirm('Excluir este tópico e todos os seus flashcards?')) return;
    try {
      if (isOfflineMode) {
        const filtered = topics.filter(t => t.id !== id);
        setTopics(filtered);
        setMockDb({
          ...mockDb,
          topics: filtered,
          cards: mockDb.cards.filter(c => c.topicId !== id)
        });
      } else {
        await apiCall(`/topics/${id}`, { method: 'DELETE' });
        setTopics(topics.filter(t => t.id !== id));
      }
      if (selectedTopic?.id === id) {
        setSelectedTopic(null);
      }
      setErrorMessage('Tópico excluído.');
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Cards CRUD
  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardFront.trim() || !newCardBack.trim() || !selectedTopic) return;

    try {
      let created: Card;
      if (isOfflineMode) {
        created = {
          id: `card-${Date.now()}`,
          front: newCardFront,
          back: newCardBack,
          topicId: selectedTopic.id,
          interval: 1,
          repetition: 0,
          efactor: 2.5,
          nextReview: new Date().toISOString()
        };
        const updated = [...cards, created];
        setCards(updated);
        setMockDb({ ...mockDb, cards: updated });
      } else {
        created = await apiCall('/cards', {
          method: 'POST',
          body: JSON.stringify({ front: newCardFront, back: newCardBack, topicId: selectedTopic.id })
        });
        setCards([...cards, created]);
      }
      setNewCardFront('');
      setNewCardBack('');
      setErrorMessage('Flashcard criado!');
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      if (isOfflineMode) {
        const filtered = cards.filter(c => c.id !== id);
        setCards(filtered);
        setMockDb({ ...mockDb, cards: filtered });
      } else {
        await apiCall(`/cards/${id}`, { method: 'DELETE' });
        setCards(cards.filter(c => c.id !== id));
      }
      setErrorMessage('Card excluído.');
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Study Session Player
  const startStudySession = async () => {
    // Filter due cards
    const due = cards.filter(c => {
      if (selectedTopic) return c.topicId === selectedTopic.id;
      if (selectedSubject) {
        const matchedTopics = topics.filter(t => t.subjectId === selectedSubject.id);
        return matchedTopics.some(t => t.id === c.topicId);
      }
      return true;
    });

    if (due.length === 0) {
      setErrorMessage('Não há cards pendentes de revisão!');
      return;
    }

    try {
      let session: { id: string };
      if (isOfflineMode) {
        session = { id: `session-${Date.now()}` };
      } else {
        session = await apiCall('/study-sessions', { method: 'POST' });
      }
      setActiveSessionId(session.id);
      setSessionCards(due);
      setCurrentSessionCardIndex(0);
      setIsCardFlipped(false);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleReviewCard = async (rating: number) => {
    if (!activeSessionId || sessionCards.length === 0) return;
    const currentCard = sessionCards[currentSessionCardIndex];

    try {
      if (isOfflineMode) {
        // SM-2 Heuristics simulator
        let { interval, repetition, efactor } = currentCard;
        if (rating >= 3) {
          if (repetition === 0) {
            interval = 1;
          } else if (repetition === 1) {
            interval = 6;
          } else {
            interval = Math.round(interval * efactor);
          }
          repetition++;
        } else {
          repetition = 0;
          interval = 1;
        }
        efactor = efactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
        if (efactor < 1.3) efactor = 1.3;

        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + interval);

        const updatedCards = cards.map(c => 
          c.id === currentCard.id 
            ? { ...c, interval, repetition, efactor, nextReview: nextDate.toISOString() }
            : c
        );
        setCards(updatedCards);
        setMockDb({ ...mockDb, cards: updatedCards });
      } else {
        await apiCall('/study-sessions/review', {
          method: 'POST',
          body: JSON.stringify({
            cardId: currentCard.id,
            sessionId: activeSessionId,
            rating
          })
        });
      }

      // Next Card
      if (currentSessionCardIndex + 1 < sessionCards.length) {
        setIsCardFlipped(false);
        // Add a slight delay for transition
        setTimeout(() => {
          setCurrentSessionCardIndex(currentSessionCardIndex + 1);
        }, 150);
      } else {
        // Finished
        setActiveSessionId(null);
        setSessionCards([]);
        setErrorMessage('Sessão de estudos concluída com sucesso!');
        fetchMetrics();
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // AI Flashcard Generator
  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiText.trim() || !aiTopicId) return;
    setIsGeneratingAi(true);
    setAiGeneratedCards([]);

    try {
      if (isOfflineMode) {
        // Simulated AI generation delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        const simCards = [
          { front: 'Pergunta da IA 1?', back: 'Resposta curta e objetiva 1 baseada no texto.' },
          { front: 'Pergunta da IA 2?', back: 'Resposta objetiva 2 baseada no texto.' },
          { front: 'Pergunta da IA 3?', back: 'Resposta objetiva 3 baseada no texto.' }
        ];
        setAiGeneratedCards(simCards);
      } else {
        await apiCall('/ai/generate', {
          method: 'POST',
          body: JSON.stringify({ text: aiText, topicId: aiTopicId })
        });
        // Real response returns fully saved cards. Let's sync state
        fetchSubjectsAndCards();
        setErrorMessage('Flashcards gerados e salvos com sucesso via IA!');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSaveSimulatedAiCards = () => {
    if (aiGeneratedCards.length === 0) return;
    const newSaved = aiGeneratedCards.map((c, index) => ({
      id: `ai-card-${Date.now()}-${index}`,
      front: c.front,
      back: c.back,
      topicId: aiTopicId,
      interval: 1,
      repetition: 0,
      efactor: 2.5,
      nextReview: new Date().toISOString()
    }));
    const updated = [...cards, ...newSaved];
    setCards(updated);
    setMockDb({ ...mockDb, cards: updated });
    setAiGeneratedCards([]);
    setAiText('');
    setErrorMessage(`${newSaved.length} flashcards gerados por IA foram salvos!`);
  };

  // Profile Update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isOfflineMode) {
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            name: profileName,
            nickname: profileNickname || null,
            institutionId: selectedInstitution?.id || null
          };
          setCurrentUser(updatedUser);
          setErrorMessage('Perfil atualizado com sucesso no Modo Local!');
        }
      } else {
        const updated = await apiCall('/profile', {
          method: 'PATCH',
          body: JSON.stringify({
            name: profileName,
            nickname: profileNickname || undefined,
            password: profilePassword || undefined,
            institutionId: selectedInstitution?.id || null
          })
        });
        setCurrentUser(updated);
        setErrorMessage('Perfil atualizado com sucesso!');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Unauthenticated view (Login & SignUp)
  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="logo-container" style={{ justifyContent: 'center', marginBottom: 24 }}>
            <div className="logo-icon"><Brain size={18} /></div>
            <div className="logo-text">SAAFO HUB</div>
          </div>
          
          <h2 className="auth-title">
            {isRegistering ? 'Criar Conta' : 'Acessar o Hub'}
          </h2>
          <p className="auth-subtitle">
            {isRegistering ? 'Inscreva-se para turbinar seus estudos' : 'Entre para gerenciar seus flashcards'}
          </p>

          <form onSubmit={handleAuth}>
            {isRegistering && (
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Seu nome oficial" 
                  required
                />
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input 
                type="email" 
                className="form-input" 
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="estudante@instituicao.edu.br" 
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <input 
                type="password" 
                className="form-input" 
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres" 
                required
              />
            </div>

            <button type="submit" className="btn-primary">
              {isRegistering ? 'Cadastrar' : 'Entrar'}
              <ChevronRight size={16} />
            </button>
          </form>

          <div className="divider">ou continue com</div>

          <button 
            onClick={() => {
              // Simulated OAuth Google Login
              localStorage.setItem('token', 'google-oauth-mock-token');
              setToken('google-oauth-mock-token');
              setErrorMessage('Entrada com conta Google autorizada!');
            }}
            className="btn-secondary"
          >
            <Sparkles size={16} style={{ color: 'var(--color-primary-light)' }} />
            Entrar com Google
          </button>

          <p style={{ marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' }}>
            {isRegistering ? 'Já tem conta?' : 'Não tem conta?'} &nbsp;
            <span 
              onClick={() => setIsRegistering(!isRegistering)}
              style={{ color: 'var(--color-primary-light)', cursor: 'pointer', fontWeight: 600 }}
            >
              {isRegistering ? 'Fazer Login' : 'Cadastre-se'}
            </span>
          </p>

          {errorMessage && (
            <div style={{ marginTop: 20, padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active study session player overlay
  if (activeSessionId && sessionCards.length > 0) {
    const activeCard = sessionCards[currentSessionCardIndex];
    return (
      <div className="auth-wrapper" style={{ background: 'var(--bg-deep)' }}>
        <div style={{ width: '100%', maxWidth: '600px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Card {currentSessionCardIndex + 1} de {sessionCards.length}
            </span>
            <button 
              onClick={() => {
                setActiveSessionId(null);
                setSessionCards([]);
              }}
              style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Sair do Estudo
            </button>
          </div>

          <div 
            className={`study-card-outer ${isCardFlipped ? 'flipped' : ''}`}
            onClick={() => setIsCardFlipped(!isCardFlipped)}
          >
            <div className="study-card-inner">
              <div className="study-card-front">
                <span className="badge badge-primary" style={{ marginBottom: 16 }}>Pergunta</span>
                <p className="study-card-text">{activeCard.front}</p>
                <div className="study-card-tip">Clique para virar</div>
              </div>
              <div className="study-card-back">
                <span className="badge badge-success" style={{ marginBottom: 16 }}>Resposta</span>
                <p className="study-card-text">{activeCard.back}</p>
                <div className="study-card-tip">Avalie seu grau de resposta abaixo</div>
              </div>
            </div>
          </div>

          {isCardFlipped && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
                Quão bem você se lembrou da resposta?
              </p>
              <div className="rating-bar">
                {[0, 1, 2, 3, 4, 5].map((val) => (
                  <button 
                    key={val} 
                    className="rating-btn"
                    onClick={() => handleReviewCard(val)}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 12, color: 'var(--text-muted)', padding: '0 8px' }}>
                <span>0 = Esqueci</span>
                <span>3 = Lembrei com dificuldade</span>
                <span>5 = Excelente</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon"><Brain size={18} /></div>
          <div className="logo-text">SAAFO HUB</div>
        </div>

        <ul className="nav-list">
          <li>
            <button 
              className={`nav-item-btn ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              <TrendingUp size={18} />
              Desempenho
            </button>
          </li>
          <li>
            <button 
              className={`nav-item-btn ${currentView === 'subjects' ? 'active' : ''}`}
              onClick={() => setCurrentView('subjects')}
            >
              <Layers size={18} />
              Minhas Matérias
            </button>
          </li>
          <li>
            <button 
              className={`nav-item-btn ${currentView === 'ai' ? 'active' : ''}`}
              onClick={() => setCurrentView('ai')}
            >
              <Sparkles size={18} />
              Gerar por IA
            </button>
          </li>
          <li>
            <button 
              className={`nav-item-btn ${currentView === 'profile' ? 'active' : ''}`}
              onClick={() => setCurrentView('profile')}
            >
              <UserIcon size={18} />
              Meu Perfil
            </button>
          </li>
        </ul>

        {currentUser && (
          <div className="user-profile-summary">
            <div className="avatar">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.email}
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* Top Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 700, margin: 0 }}>
              {currentView === 'dashboard' && 'Dashboard de Desempenho'}
              {currentView === 'subjects' && 'Estrutura de Estudos'}
              {currentView === 'ai' && 'Geração de Cards Inteligentes'}
              {currentView === 'profile' && 'Perfil do Estudante'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
              {currentView === 'dashboard' && 'Acompanhe suas estatísticas e revisões pendentes'}
              {currentView === 'subjects' && 'Navegue por Matérias, Tópicos e seus respectivos Flashcards'}
              {currentView === 'ai' && 'Transforme PDFs e resumos textuais em flashcards automaticamente com Gemini Pro'}
              {currentView === 'profile' && 'Atualize suas preferências e dados institucionais'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {isOfflineMode && (
              <span className="badge" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)', height: 'fit-content' }}>
                Modo Offline
              </span>
            )}
            <button 
              onClick={startStudySession}
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <RotateCw size={16} />
              Estudar Pendentes
            </button>
          </div>
        </div>

        {errorMessage && (
          <div style={{ marginBottom: 24, padding: 14, borderRadius: 8, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: 'var(--color-primary-light)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ==================== VIEW: DASHBOARD ==================== */}
        {currentView === 'dashboard' && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><BookOpen size={24} /></div>
                <div>
                  <div className="stat-value">{cards.length}</div>
                  <div className="stat-label">Total de Flashcards</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><RotateCw size={24} /></div>
                <div>
                  <div className="stat-value">{cards.filter(c => new Date(c.nextReview) <= new Date()).length}</div>
                  <div className="stat-label">Pendentes Hoje</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><Flame size={24} style={{ color: 'var(--color-warning)' }} /></div>
                <div>
                  <div className="stat-value">5 dias</div>
                  <div className="stat-label">Ofensiva de Estudos</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><CheckCircle size={24} style={{ color: 'var(--color-success)' }} /></div>
                <div>
                  <div className="stat-value">{metrics ? `${metrics.retentionRate}%` : '85%'}</div>
                  <div className="stat-label">Taxa de Retenção</div>
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="glass-card">
                <h3 className="card-title" style={{ marginBottom: 20 }}>Atividade Recente</h3>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div className="heatmap-container">
                    {Array.from({ length: 28 }).map((_, i) => {
                      const levelClass = i % 7 === 0 ? 'level-4' : i % 5 === 0 ? 'level-2' : i % 3 === 0 ? 'level-1' : '';
                      return <div key={i} className={`heatmap-day ${levelClass}`} title={`Dia com atividades`} />;
                    })}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Frequência de estudos consolidada.</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Cada quadrante representa a carga horária de revisões concluídas.</p>
                  </div>
                </div>
              </div>

              <div className="glass-card">
                <h3 className="card-title" style={{ marginBottom: 20 }}>Visão Institucional</h3>
                {selectedInstitution ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <span className="badge badge-cyan" style={{ padding: '6px 12px', fontSize: 14 }}>
                        {selectedInstitution.sigla}
                      </span>
                      <strong style={{ fontSize: 16 }}>{selectedInstitution.name}</strong>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                      Você está competindo nos rankings e filtragens da instituição {selectedInstitution.sigla} ({selectedInstitution.uf}).
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                      Nenhuma instituição vinculada ao seu perfil. Acesse a aba "Meu Perfil" para registrar.
                    </p>
                    <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => setCurrentView('profile')}>
                      Configurar Vínculo
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card">
              <div className="card-header-flex">
                <h3 className="card-title">Desempenho por Matéria</h3>
              </div>
              <div className="custom-table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Matéria</th>
                      <th>Total de Cards</th>
                      <th>Cards Revisados</th>
                      <th>Classificação Média</th>
                      <th>Retenção Estimada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics?.subjectsPerformance.map((sub, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{sub.subjectName}</td>
                        <td>{sub.totalCards}</td>
                        <td>{sub.reviewedCards}</td>
                        <td>
                          <span className="badge badge-cyan">
                            ★ {sub.averageRating.toFixed(1)}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--color-success)' }}>
                            {sub.retentionRate}%
                          </strong>
                        </td>
                      </tr>
                    ))}
                    {(!metrics || metrics.subjectsPerformance.length === 0) && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          Nenhuma matéria com revisões registradas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ==================== VIEW: SUBJECTS & CARDS ==================== */}
        {currentView === 'subjects' && (
          <div className="grid-2">
            {/* Left Column: Subjects & Topics List */}
            <div>
              <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                <h3 className="card-title" style={{ marginBottom: 16 }}>Nova Matéria</h3>
                <form onSubmit={handleCreateSubject} style={{ display: 'flex', gap: 12 }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Nome da matéria (ex: Anatomia)" 
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                  />
                  <input 
                    type="color" 
                    style={{ width: 44, height: 44, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}
                    value={newSubjectColor}
                    onChange={(e) => setNewSubjectColor(e.target.value)}
                  />
                  <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 20px' }}>
                    <Plus size={18} />
                  </button>
                </form>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {subjects.map((sub) => (
                  <div 
                    key={sub.id} 
                    className="subject-card"
                    style={{ 
                      '--subject-color': sub.color,
                      border: selectedSubject?.id === sub.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                      background: selectedSubject?.id === sub.id ? 'rgba(139,92,246,0.05)' : 'var(--bg-card)'
                    } as React.CSSProperties}
                    onClick={() => {
                      setSelectedSubject(sub);
                      setSelectedTopic(null);
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div className="subject-name">{sub.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {topics.filter(t => t.subjectId === sub.id).length} Tópicos cadastrados
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteSubject(sub.id, e)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Topics and Flashcards */}
            <div>
              {selectedSubject ? (
                <div className="glass-card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 className="card-title">Tópicos de: {selectedSubject.name}</h3>
                  </div>

                  <form onSubmit={handleCreateTopic} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Nome do Tópico (ex: Sistema Circulatório)" 
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                    />
                    <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 20px' }}>
                      <Plus size={18} />
                    </button>
                  </form>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                    {topics.filter(t => t.subjectId === selectedSubject.id).map(t => (
                      <span 
                        key={t.id} 
                        className="badge" 
                        style={{ 
                          padding: '8px 14px', 
                          cursor: 'pointer',
                          border: selectedTopic?.id === t.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                          background: selectedTopic?.id === t.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.03)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                        onClick={() => setSelectedTopic(t)}
                      >
                        {t.name}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTopic(t.id);
                          }}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  {selectedTopic ? (
                    <div>
                      <h4 style={{ marginBottom: 12, fontSize: 16 }}>Flashcards de: {selectedTopic.name}</h4>
                      
                      <form onSubmit={handleCreateCard} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, border: '1px dashed var(--border-color)', padding: 16, borderRadius: 8 }}>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="Frente (Pergunta)"
                          value={newCardFront}
                          onChange={(e) => setNewCardFront(e.target.value)}
                        />
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="Verso (Resposta)"
                          value={newCardBack}
                          onChange={(e) => setNewCardBack(e.target.value)}
                        />
                        <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end', width: 'auto', padding: '8px 16px' }}>
                          Salvar Card
                        </button>
                      </form>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {cards.filter(c => c.topicId === selectedTopic.id).map(c => (
                          <div 
                            key={c.id} 
                            style={{ 
                              padding: 12, 
                              background: 'rgba(255,255,255,0.02)', 
                              border: '1px solid var(--border-color)',
                              borderRadius: 8,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ flexGrow: 1, minWidth: 0, paddingRight: 16 }}>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.front}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{c.back}</div>
                            </div>
                            <button 
                              onClick={() => handleDeleteCard(c.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        {cards.filter(c => c.topicId === selectedTopic.id).length === 0 && (
                          <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>
                            Nenhum card cadastrado neste tópico ainda.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Selecione um tópico para visualizar seus flashcards.</p>
                  )}
                </div>
              ) : (
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', color: 'var(--text-muted)' }}>
                  <HelpCircle size={32} style={{ marginBottom: 12 }} />
                  Selecione uma matéria na coluna esquerda para expandir
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== VIEW: AI GENERATOR ==================== */}
        {currentView === 'ai' && (
          <div className="glass-card">
            <h3 className="card-title" style={{ marginBottom: 20 }}>Gerar Flashcards com Inteligência Artificial</h3>
            <form onSubmit={handleAiGenerate}>
              <div className="form-group">
                <label className="form-label">Tópico de Destino</label>
                <select 
                  className="form-input"
                  value={aiTopicId}
                  onChange={(e) => setAiTopicId(e.target.value)}
                  required
                >
                  <option value="">Selecione o Tópico...</option>
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>
                      {subjects.find(s => s.id === t.subjectId)?.name} &gt; {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Material de Estudo (Texto / Resumo / Anotações)</label>
                <textarea 
                  className="form-input" 
                  rows={8}
                  style={{ resize: 'vertical' }}
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  placeholder="Cole aqui o conteúdo de PDFs ou anotações. A inteligência artificial vai gerar os melhores flashcards."
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: 'auto', padding: '12px 24px' }}
                disabled={isGeneratingAi}
              >
                {isGeneratingAi ? (
                  <>
                    <RotateCw size={16} className="animate-spin" />
                    Gerando Flashcards com Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Gerar Cards Inteligentes
                  </>
                )}
              </button>
            </form>

            {aiGeneratedCards.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <h4 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />
                  Cards Gerados Pré-visualização
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  {aiGeneratedCards.map((c, i) => (
                    <div key={i} style={{ padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>P: {c.front}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>R: {c.back}</div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={handleSaveSimulatedAiCards}
                  className="btn-primary"
                  style={{ width: 'auto', background: 'var(--grad-success)' }}
                >
                  <Check size={16} />
                  Salvar Cards Gerados na Minha Conta
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================== VIEW: PROFILE ==================== */}
        {currentView === 'profile' && (
          <div className="glass-card" style={{ maxWidth: '640px', margin: '0 auto' }}>
            <h3 className="card-title" style={{ marginBottom: 24 }}>Dados da Conta</h3>
            <form onSubmit={handleProfileUpdate}>
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Apelido (Nickname)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={profileNickname}
                  onChange={(e) => setProfileNickname(e.target.value)}
                  placeholder="Como gostaria de ser chamado"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Instituição de Ensino</label>
                <div className="autocomplete-container">
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ paddingLeft: '40px' }}
                      value={profileInstSearch}
                      onChange={(e) => {
                        setProfileInstSearch(e.target.value);
                        fetchInstitutions(e.target.value);
                        setShowInstDropdown(true);
                      }}
                      onFocus={() => setShowInstDropdown(true)}
                      placeholder={selectedInstitution ? `${selectedInstitution.sigla} - ${selectedInstitution.name}` : 'Digite o nome da sua escola ou faculdade'}
                    />
                    <Search size={16} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--text-muted)' }} />
                  </div>

                  {showInstDropdown && (
                    <div className="autocomplete-dropdown">
                      {institutions.map(inst => (
                        <div 
                          key={inst.id} 
                          className="autocomplete-item"
                          onClick={() => {
                            setSelectedInstitution(inst);
                            setProfileInstSearch(`${inst.sigla} - ${inst.name}`);
                            setShowInstDropdown(false);
                          }}
                        >
                          <div className="autocomplete-item-name">{inst.sigla} - {inst.name}</div>
                          <div className="autocomplete-item-meta">{inst.uf} | Domínios: {inst.domains.join(', ')}</div>
                        </div>
                      ))}
                      {institutions.length === 0 && (
                        <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 14 }}>
                          Nenhuma instituição encontrada.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nova Senha (Mudar apenas se quiser atualizar)</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  placeholder="Minimo 6 caracteres"
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: 'auto', marginTop: 12 }}>
                Salvar Configurações
              </button>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}
