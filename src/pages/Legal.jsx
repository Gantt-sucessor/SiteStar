import { Link } from 'react-router-dom';

const UPDATED = '9 de novembro de 2026';

function LegalPage({ title, children }) {
  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <Link to="/" className="btn sm ghost">← Voltar ao Holocron</Link>
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="kicker">Holocron · Star Wars Saga RPG</div>
        <h1 className="yellow" style={{ marginTop: 6 }}>{title}</h1>
        <p className="tiny muted">Última atualização: {UPDATED}</p>
        <div className="legal">{children}</div>
      </div>
    </div>
  );
}

export function Privacy() {
  return (
    <LegalPage title="Política de Privacidade">
      <p>O Holocron é um site gratuito e sem fins comerciais, feito para um grupo de amigos jogar o RPG de mesa Star Wars Edição Saga. Esta página explica quais dados usamos e por quê.</p>
      <h3>Dados que coletamos</h3>
      <ul>
        <li><b>Dados da sua conta Google ou Discord:</b> nome, endereço de e-mail e foto de perfil, fornecidos quando você escolhe entrar com um desses serviços.</li>
        <li><b>Conteúdo que você cria:</b> fichas de personagem, campanhas, anotações e o histórico de rolagens de dados.</li>
      </ul>
      <h3>Como usamos</h3>
      <ul>
        <li>Para identificar você no login e mostrar seu nome e foto para os outros participantes das suas campanhas.</li>
        <li>Para salvar suas fichas e compartilhar fichas e rolagens com o mestre e os jogadores da mesma campanha.</li>
      </ul>
      <p>Não vendemos, alugamos nem compartilhamos seus dados com terceiros para publicidade. Não usamos seus dados para nenhuma outra finalidade.</p>
      <h3>Onde ficam guardados</h3>
      <p>Os dados ficam armazenados no Supabase, serviço de banco de dados e autenticação, e o site é hospedado na Vercel. O navegador guarda localmente sua sessão de login e algumas preferências, como o som ligado ou desligado.</p>
      <h3>Seus direitos</h3>
      <p>Você pode apagar suas fichas a qualquer momento pelo próprio site. Para excluir sua conta e todos os dados associados, peça ao administrador do site, que fará a exclusão.</p>
      <h3>Alterações</h3>
      <p>Esta política pode ser atualizada. A data no topo indica a versão mais recente.</p>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage title="Termos de Uso">
      <p>Ao usar o Holocron, você concorda com estes termos.</p>
      <ul>
        <li>O site é oferecido gratuitamente, sem garantias, para uso pessoal e recreativo em partidas de RPG.</li>
        <li>Você é responsável pelo conteúdo que escreve em fichas, campanhas e anotações. Não publique nada ofensivo ou ilegal.</li>
        <li>O administrador pode remover conteúdo ou contas que violem estes termos.</li>
        <li>Star Wars e todos os nomes, personagens e elementos relacionados são marcas registradas da Lucasfilm Ltd. Este é um projeto de fã, não oficial e sem fins lucrativos, sem afiliação com a Lucasfilm ou a Disney.</li>
        <li>O tratamento dos seus dados segue a nossa <Link to="/privacidade">Política de Privacidade</Link>.</li>
      </ul>
    </LegalPage>
  );
}
