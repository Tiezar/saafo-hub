import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, CreditCard, QrCode, FileText, RotateCw, Copy, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

type PayMethod = 'card' | 'pix' | 'boleto';

interface CardForm {
  number: string;
  holderName: string;
  expiry: string;
  cvv: string;
  cpf: string;
  cep: string;
  addressNumber: string;
  phone: string;
}

const BLANK_CARD: CardForm = {
  number: '', holderName: '', expiry: '', cvv: '',
  cpf: '', cep: '', addressNumber: '', phone: '',
};

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtCard(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function fmtExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}
function fmtCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
function fmtCep(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
function fmtPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function parseExpiry(v: string): { expiryMonth: string; expiryYear: string } {
  const [m = '', y = ''] = v.split('/');
  return { expiryMonth: m, expiryYear: `20${y}` };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CheckoutModal({ open, onClose }: Props) {
  const { apiCall, showSuccess, showError } = useApp();
  const [method, setMethod] = useState<PayMethod>('card');
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<CardForm>(BLANK_CARD);

  // PIX state
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixWaiting, setPixWaiting] = useState(false);
  const pixPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Boleto state
  const [boletoUrl, setBoletoUrl] = useState<string | null>(null);
  const [barCode, setBarCode] = useState<string | null>(null);
  const [barCopied, setBarCopied] = useState(false);

  const { fetchPlanStatus } = useApp() as any;

  // Poll plan status after PIX/boleto while waiting
  useEffect(() => {
    if (!pixWaiting) { if (pixPollRef.current) clearInterval(pixPollRef.current); return; }
    pixPollRef.current = setInterval(async () => {
      try {
        const status = await apiCall('/billing/status') as { plan: string };
        if (status.plan === 'STUDENT') {
          clearInterval(pixPollRef.current!);
          setPixWaiting(false);
          showSuccess('Pagamento confirmado! Plano Estudante ativado.');
          if (fetchPlanStatus) await fetchPlanStatus();
          onClose();
        }
      } catch { /* ignore */ }
    }, 4000);
    return () => { if (pixPollRef.current) clearInterval(pixPollRef.current); };
  }, [pixWaiting, apiCall, showSuccess, onClose, fetchPlanStatus]);

  const reset = useCallback(() => {
    setMethod('card');
    setCard(BLANK_CARD);
    setPixQr(null); setPixCode(null); setPixCopied(false); setPixWaiting(false);
    setBoletoUrl(null); setBarCode(null); setBarCopied(false);
    setLoading(false);
    if (pixPollRef.current) clearInterval(pixPollRef.current);
  }, []);

  const handleClose = useCallback(() => { reset(); onClose(); }, [reset, onClose]);

  // ── Card submit ─────────────────────────────────────────────────────────────

  const submitCard = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { expiryMonth, expiryYear } = parseExpiry(card.expiry);
      await apiCall('/billing/checkout/card', {
        method: 'POST',
        body: JSON.stringify({
          card: {
            holderName: card.holderName,
            number: card.number.replace(/\s/g, ''),
            expiryMonth,
            expiryYear,
            ccv: card.cvv,
          },
          holder: {
            name: card.holderName,
            cpfCnpj: card.cpf.replace(/\D/g, ''),
            postalCode: card.cep.replace(/\D/g, ''),
            addressNumber: card.addressNumber,
            phone: card.phone.replace(/\D/g, ''),
          },
        }),
      });
      showSuccess('Assinatura ativada com sucesso!');
      if (fetchPlanStatus) await fetchPlanStatus();
      handleClose();
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [card, apiCall, showSuccess, showError, handleClose, fetchPlanStatus]);

  // ── PIX submit ──────────────────────────────────────────────────────────────

  const submitPix = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall('/billing/checkout/pix', { method: 'POST' }) as {
        pixQrCode: string; pixCopyPaste: string;
      };
      setPixQr(res.pixQrCode);
      setPixCode(res.pixCopyPaste);
      setPixWaiting(true);
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [apiCall, showError]);

  // ── Boleto submit ───────────────────────────────────────────────────────────

  const submitBoleto = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall('/billing/checkout/boleto', { method: 'POST' }) as {
        boletoUrl: string; barCode: string;
      };
      setBoletoUrl(res.boletoUrl);
      setBarCode(res.barCode);
      setPixWaiting(true); // also poll for boleto confirmation
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [apiCall, showError]);

  if (!open) return null;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 0',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: active ? 'var(--color-primary)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
    transition: 'all 0.15s',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-input, rgba(255,255,255,0.05))',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 14,
    color: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} style={{ color: 'var(--color-primary)' }} />
            Assinar — R$ 19<span style={{ fontSize: 13, fontWeight: 400 }}>/mês</span>
          </h3>
          <button onClick={handleClose} className="btn-ghost btn-icon"><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ paddingTop: 8 }}>
          {/* Method tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card, rgba(255,255,255,0.03))', borderRadius: 10, padding: 4, marginBottom: 20 }}>
            <button style={tabStyle(method === 'card')} onClick={() => setMethod('card')}>
              <CreditCard size={14} /> Cartão
            </button>
            <button style={tabStyle(method === 'pix')} onClick={() => setMethod('pix')}>
              <QrCode size={14} /> PIX
            </button>
            <button style={tabStyle(method === 'boleto')} onClick={() => setMethod('boleto')}>
              <FileText size={14} /> Boleto
            </button>
          </div>

          {/* ── CARD ── */}
          {method === 'card' && (
            <form id="card-form" onSubmit={submitCard} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Número do cartão</label>
                <input style={inputStyle} placeholder="0000 0000 0000 0000" value={card.number}
                  onChange={e => setCard(p => ({ ...p, number: fmtCard(e.target.value) }))}
                  inputMode="numeric" autoComplete="cc-number" required />
              </div>
              <div>
                <label style={labelStyle}>Nome impresso no cartão</label>
                <input style={inputStyle} placeholder="NOME SOBRENOME" value={card.holderName}
                  onChange={e => setCard(p => ({ ...p, holderName: e.target.value.toUpperCase() }))}
                  autoComplete="cc-name" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Validade</label>
                  <input style={inputStyle} placeholder="MM/AA" value={card.expiry}
                    onChange={e => setCard(p => ({ ...p, expiry: fmtExpiry(e.target.value) }))}
                    inputMode="numeric" autoComplete="cc-exp" required />
                </div>
                <div>
                  <label style={labelStyle}>CVV</label>
                  <input style={inputStyle} placeholder="123" value={card.cvv}
                    onChange={e => setCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    inputMode="numeric" autoComplete="cc-csc" required />
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Dados do titular para verificação</p>
                <div>
                  <label style={labelStyle}>CPF do titular</label>
                  <input style={inputStyle} placeholder="000.000.000-00" value={card.cpf}
                    onChange={e => setCard(p => ({ ...p, cpf: fmtCpf(e.target.value) }))}
                    inputMode="numeric" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>CEP</label>
                    <input style={inputStyle} placeholder="00000-000" value={card.cep}
                      onChange={e => setCard(p => ({ ...p, cep: fmtCep(e.target.value) }))}
                      inputMode="numeric" required />
                  </div>
                  <div>
                    <label style={labelStyle}>Número do endereço</label>
                    <input style={inputStyle} placeholder="123" value={card.addressNumber}
                      onChange={e => setCard(p => ({ ...p, addressNumber: e.target.value.slice(0, 10) }))}
                      required />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Telefone</label>
                  <input style={inputStyle} placeholder="(11) 99999-9999" value={card.phone}
                    onChange={e => setCard(p => ({ ...p, phone: fmtPhone(e.target.value) }))}
                    inputMode="tel" required />
                </div>
              </div>
            </form>
          )}

          {/* ── PIX ── */}
          {method === 'pix' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              {!pixQr ? (
                <>
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <QrCode size={48} style={{ color: 'var(--color-primary)', marginBottom: 12 }} />
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                      Gere o QR Code PIX e pague pelo app do seu banco.<br />
                      A ativação é automática e imediata.
                    </p>
                  </div>
                  <div style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                    <strong>Como funciona:</strong> após o pagamento, a assinatura renova automaticamente todo mês via PIX.
                  </div>
                </>
              ) : (
                <>
                  {pixWaiting && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-warning)', fontSize: 13 }}>
                      <RotateCw size={14} className="animate-spin" /> Aguardando confirmação do pagamento…
                    </div>
                  )}
                  <img
                    src={`data:image/png;base64,${pixQr}`}
                    alt="PIX QR Code"
                    style={{ width: 220, height: 220, borderRadius: 12, border: '2px solid var(--border-color)' }}
                  />
                  <button
                    style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onClick={() => { navigator.clipboard.writeText(pixCode ?? ''); setPixCopied(true); setTimeout(() => setPixCopied(false), 2500); }}>
                    {pixCopied ? <><Check size={14} color="var(--color-success)" /> Copiado!</> : <><Copy size={14} /> Copiar código PIX</>}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── BOLETO ── */}
          {method === 'boleto' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!boletoUrl ? (
                <>
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <FileText size={48} style={{ color: 'var(--color-tertiary)', marginBottom: 12 }} />
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                      O boleto vence em 3 dias úteis.<br />
                      A ativação ocorre após a compensação bancária.
                    </p>
                  </div>
                  <div style={{ background: 'rgba(255,180,80,0.08)', borderRadius: 10, padding: 12, fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, color: 'var(--color-warning)', marginTop: 1 }} />
                    Pagamentos via boleto levam 1–3 dias úteis para compensar.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-success)', fontSize: 13 }}>
                    <CheckCircle2 size={16} /> Boleto gerado com sucesso!
                  </div>
                  {pixWaiting && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-warning)', fontSize: 13 }}>
                      <RotateCw size={14} className="animate-spin" /> Aguardando compensação bancária…
                    </div>
                  )}
                  <a href={boletoUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 8, background: 'var(--color-primary)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                    <FileText size={16} /> Abrir boleto
                  </a>
                  <button
                    style={{ padding: '10px 0', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onClick={() => { navigator.clipboard.writeText(barCode ?? ''); setBarCopied(true); setTimeout(() => setBarCopied(false), 2500); }}>
                    {barCopied ? <><Check size={14} color="var(--color-success)" /> Copiado!</> : <><Copy size={14} /> Copiar linha digitável</>}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer action */}
        <div className="modal-footer" style={{ flexDirection: 'column', gap: 10 }}>
          {method === 'card' && (
            <button form="card-form" type="submit" className="btn-primary"
              style={{ width: '100%', padding: '14px' }} disabled={loading}>
              {loading
                ? <><RotateCw size={16} className="animate-spin" /> Processando…</>
                : <><CreditCard size={16} /> Assinar agora — R$ 19/mês</>}
            </button>
          )}
          {method === 'pix' && !pixQr && (
            <button className="btn-primary" style={{ width: '100%', padding: '14px' }}
              onClick={submitPix} disabled={loading}>
              {loading
                ? <><RotateCw size={16} className="animate-spin" /> Gerando QR Code…</>
                : <><QrCode size={16} /> Gerar QR Code PIX</>}
            </button>
          )}
          {method === 'boleto' && !boletoUrl && (
            <button className="btn-primary" style={{ width: '100%', padding: '14px' }}
              onClick={submitBoleto} disabled={loading}>
              {loading
                ? <><RotateCw size={16} className="animate-spin" /> Gerando boleto…</>
                : <><FileText size={16} /> Gerar boleto</>}
            </button>
          )}
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
            Cancele quando quiser. Sem multas ou fidelidade.
          </p>
        </div>
      </div>
    </div>
  );
}
