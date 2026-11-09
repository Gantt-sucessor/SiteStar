import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useLiveCharacter } from '../lib/useLiveCharacter';
import { useSetRollTarget } from '../lib/rollTarget';
import { listMyCampaigns } from '../lib/data';
import Sheet from '../components/Sheet';

export function SaveStatus({ status, error }) {
  const map = { saving: ['Transmitindo...', 'muted'], saved: ['Salvo no Holocron', 'green-text'], error: [`Erro: ${error}`, 'red-text'] };
  const [text, cls] = map[status] || ['', ''];
  return <span className={`tiny mono ${cls}`}>{text}</span>;
}

export default function CharacterPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { row, status, error, setData, setCampaign } = useLiveCharacter(id);
  const [camps, setCamps] = useState({ owned: [], joined: [] });

  useEffect(() => { listMyCampaigns(user.id).then(setCamps).catch(() => {}); }, [user.id]);

  const isOwner = row?.owner_id === user.id;
  const camp = [...camps.owned, ...camps.joined].find((c) => c.id === row?.campaign_id);
  const isMaster = camp?.master_id === user.id;

  useSetRollTarget(row ? { campaignId: row.campaign_id, character: { id: row.id, name: row.data.name }, isMaster } : null);

  if (status === 'loading') return <div className="loader"><div className="saber" />CARREGANDO HOLOGRAMA</div>;
  if (status === 'missing') return <div className="page"><div className="empty">Esta ficha não existe ou você não tem acesso a ela.<div style={{ marginTop: 10 }}><Link to="/" className="btn">Voltar</Link></div></div></div>;

  return (
    <div className="page">
      <div className="row between" style={{ marginBottom: 14 }}>
        <div className="row">
          <Link to="/" className="btn sm ghost">← Ponte</Link>
          {camp && <Link to={`/campanha/${camp.id}`} className="btn sm">⟡ {camp.name}</Link>}
        </div>
        <div className="row">
          {isOwner && (
            <select value={row.campaign_id || ''} onChange={(e) => setCampaign(e.target.value || null)} title="Campanha desta ficha">
              <option value="">Sem campanha</option>
              {camps.joined.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              {camps.owned.map((c) => <option key={c.id} value={c.id}>{c.name} (mestre)</option>)}
            </select>
          )}
          <SaveStatus status={status} error={error} />
        </div>
      </div>
      {!row.campaign_id && <div className="info-box small" style={{ marginBottom: 14 }}>Esta ficha não está em nenhuma campanha: as rolagens aparecem só para você.</div>}
      <Sheet data={row.data} onChange={setData} editable={isOwner || isMaster} campaignId={row.campaign_id} characterId={row.id} isMaster={isMaster} />
    </div>
  );
}
