import React, { useState, useCallback } from 'react';
import { X, CreditCard, RotateCw } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

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
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function parseExpiry(v: string): { expiryMonth: string; expiryYear: string } {
  const [m = '', y = ''] = v.split('/');
  return { expiryMonth: m, expiryYear: `20${y}` };
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CheckoutModal({ open, onClose }: Props) {
  const { apiCall, showSuccess, showError } = useApp();
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<CardForm>(BLANK_CARD);

  const { fetchPlanStatus } = useApp() as any;

  const reset = useCallback(() => {
    setCard(BLANK_CARD);
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => { reset(); onClose(); }, [reset, onClose]);

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

  if (!open) return null;

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

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: 'var(--text-muted)',
    marginBottom: 4,
    display: 'block',
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} style={{ color: 'var(--color-primary)' }} />
            Assinar — R$ 19<span style={{ fontSize: 13, fontWeight: 400 }}>/mês</span>
          </h3>
          <button onClick={handleClose} className="btn-ghost btn-icon"><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ paddingTop: 8 }}>
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
        </div>

        <div className="modal-footer" style={{ flexDirection: 'column', gap: 10 }}>
          <button form="card-form" type="submit" className="btn-primary"
            style={{ width: '100%', padding: '14px' }} disabled={loading}>
            {loading
              ? <><RotateCw size={16} className="animate-spin" /> Processando…</>
              : <><CreditCard size={16} /> Assinar agora — R$ 19/mês</>}
          </button>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
            Cancele quando quiser. Sem multas ou fidelidade.
          </p>
        </div>
      </div>
    </div>
  );
}
