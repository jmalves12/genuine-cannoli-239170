// ============================================================
//  ORGANIZADOR DE DOCUMENTOS PARA HABILITAÇÃO
//  app.js
// ============================================================

// ── PERSISTÊNCIA DE ARQUIVOS (Firebase Storage) ───────────────
// Os arquivos anexados são enviados para o Firebase Storage, na pasta
// do usuário logado (usuarios/{uid}/{itemId}/{nome}), o que permite
// que fiquem disponíveis em qualquer dispositivo após o login — ao
// contrário do localStorage, que fica preso ao navegador/dispositivo
// onde o arquivo foi anexado.

function caminhoStorage(itemId, nome) {
  return `usuarios/${usuarioAtual.uid}/${itemId}/${Date.now()}_${nome}`;
}

async function uploadArquivoStorage(itemId, file) {
  const path = caminhoStorage(itemId, file.name);
  const ref = storage.ref().child(path);
  await ref.put(file);
  const url = await ref.getDownloadURL();
  return { nome: file.name, tipo: file.type, path, url };
}

async function removerArquivoStorage(path) {
  if (!path) return;
  try {
    await storage.ref().child(path).delete();
  } catch (e) {
    console.warn('⚠️ Não foi possível remover o arquivo da nuvem:', e);
  }
}

async function baixarArquivoStorage(meta) {
  const resposta = await fetch(meta.url);
  const blob = await resposta.blob();
  return new File([blob], meta.nome, { type: meta.tipo });
}

let carregandoArquivos = true;

// ── DADOS DOS DOCUMENTOS ────────────────────────────────────
const DOCS = [
  {
    id: 'sec1', cor: 'sec-juridica', icone: '⚖️',
    titulo: '1. Habilitação Jurídica',
    itens: [
      {
        id: 'cnpj_cpf',
        nome: 'Inscrição no CNPJ ou CPF',
        desc: 'Cadastro Nacional de Pessoas Jurídicas (empresa) ou CPF (pessoa física). Aceito em nome da matriz ou filial.',
        base: 'Art. 9.5 do TR 753/2026',
        obrig: true
      }
    ]
  },
  {
    id: 'sec2', cor: 'sec-fiscal', icone: '📄',
    titulo: '2. Regularidade Fiscal e Trabalhista',
    itens: [
      {
        id: 'rfb_pgfn',
        nome: 'Certidão Conjunta RFB/PGFN',
        desc: 'Expedida pela Receita Federal e PGFN — cobre créditos tributários federais, Dívida Ativa da União e Seguridade Social.',
        base: 'Art. 9.6 do TR | Portaria Conjunta nº 1.751/2014',
        obrig: true
      },
      {
        id: 'fgts',
        nome: 'Certificado de Regularidade do FGTS (CRF)',
        desc: 'Regularidade perante o Fundo de Garantia do Tempo de Serviço, emitido pela Caixa Econômica Federal.',
        base: 'Art. 9.7 do TR 753/2026',
        obrig: true
      },
      {
        id: 'cndt',
        nome: 'Certidão Negativa de Débitos Trabalhistas (CNDT)',
        desc: 'Certidão negativa ou positiva com efeito de negativa perante a Justiça do Trabalho.',
        base: 'Art. 9.8 do TR | Decreto-Lei nº 5.452/1943',
        obrig: true
      }
    ]
  },
  {
    id: 'sec3', cor: 'sec-sicaf', icone: '🗂️',
    titulo: '3. Cadastro no SICAF',
    itens: [
      {
        id: 'sicaf',
        nome: 'Regularidade no SICAF',
        desc: 'Sistema de Cadastramento Unificado de Fornecedores — pode substituir os documentos das seções 1 e 2 quando atualizado.',
        base: 'Art. 9.4 do TR 753/2026',
        obrig: true
      },
      {
        id: 'sicaf_equiv',
        nome: 'Documentos equivalentes (se SICAF inacessível)',
        desc: 'Na impossibilidade de acesso ao SICAF, apresentar documentação equivalente conforme sítios eletrônicos oficiais.',
        base: 'Art. 8.13 do TR | Art. 68 da Lei nº 14.133/2021',
        obrig: true
      }
    ]
  },
  {
    id: 'sec4', cor: 'sec-tecnica', icone: '🔧',
    titulo: '4. Qualificação Técnica',
    itens: [
      {
        id: 'atestado',
        nome: 'Atestado de Capacidade Técnica',
        desc: 'Emitido por pessoa jurídica de direito público ou privado. Exigência facultativa — somente se a administração solicitar.',
        base: 'Art. 9.9 do TR 753/2026',
        obrig: false
      }
    ]
  },
  {
    id: 'sec5', cor: 'sec-proposta', icone: '💼',
    titulo: '5. Proposta Comercial e Documentos Técnicos',
    itens: [
      {
        id: 'proposta',
        nome: 'Proposta Comercial com preços unitários',
        desc: 'Proposta com preço unitário por item, critério de menor preço unitário. Deve conter e-mail válido para notificações.',
        base: 'Arts. 9.1 e 9.2 do TR 753/2026',
        obrig: true
      },
      {
        id: 'ficha_tec',
        nome: 'Ficha técnica do fabricante (itens 02, 04 e 05)',
        desc: 'Obrigatória para Placa-mãe, SSD NVMe e Fonte, se a marca ofertada for diferente das marcas de referência do TR.',
        base: 'Art. 1.1.1.2 do TR 753/2026',
        obrig: true
      },
      {
        id: 'cert80plus',
        nome: 'Certificação 80Plus Bronze real — Fonte (item 05)',
        desc: 'Certificado emitido por instituição credenciada pelo Conmetro ou constante do sítio oficial do certificador.',
        base: 'Art. 1.1.1.5 do TR 753/2026',
        obrig: true
      }
    ]
  },
  {
    id: 'sec6', cor: 'sec-anexos', icone: '✍️',
    titulo: '6. Anexos do Termo de Referência',
    itens: [
      {
        id: 'anexo2',
        nome: 'Termo de Ciência e Concordância – Anexo II',
        desc: 'Assinado pelo representante legal após vencer o processo. Deve conter: cidade, data, nome, cargo, CPF, empresa e CNPJ.',
        base: 'Anexo II do TR 753/2026',
        obrig: true
      }
    ]
  }
];

// ── AUTENTICAÇÃO E SINCRONIZAÇÃO (Firebase) ──────────────────
let usuarioAtual = null;

function traduzErroAuth(e) {
  const mapa = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-not-found': 'Usuário não encontrado.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já está cadastrado. Tente entrar.',
    'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres).',
    'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.'
  };
  return mapa[e.code] || ('Erro: ' + e.message);
}

function fazerLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value;
  const msg = document.getElementById('loginMsg');
  msg.textContent = '';

  if (!email || !senha) { msg.textContent = 'Preencha e-mail e senha.'; return; }

  auth.signInWithEmailAndPassword(email, senha).catch(e => {
    msg.textContent = traduzErroAuth(e);
  });
}

function criarConta() {
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value;
  const msg = document.getElementById('loginMsg');
  msg.textContent = '';

  if (!email || !senha) { msg.textContent = 'Preencha e-mail e senha.'; return; }
  if (senha.length < 6) { msg.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }

  auth.createUserWithEmailAndPassword(email, senha).catch(e => {
    msg.textContent = traduzErroAuth(e);
  });
}

function fazerLogout() {
  auth.signOut();
}

let appConstruido = false;

auth.onAuthStateChanged(user => {
  usuarioAtual = user;
  const loginOverlay = document.getElementById('loginOverlay');
  const appContent = document.getElementById('appContent');

  if (user) {
    loginOverlay.hidden = true;
    appContent.hidden = false;
    document.getElementById('userEmailLabel').textContent = user.email;
    document.getElementById('loginMsg').textContent = '';
    document.getElementById('loginSenha').value = '';

    if (!appConstruido) {
      appConstruido = true;
      buildUI();
    }
    carregarDados();
  } else {
    appContent.hidden = true;
    loginOverlay.hidden = false;
  }
});

// ── ESTADO GLOBAL ───────────────────────────────────────────
const estado = {};

// ── INICIALIZAÇÃO ───────────────────────────────────────────
function buildUI() {
  const container = document.getElementById('sectionsContainer');

  DOCS.forEach(sec => {
    const div = document.createElement('div');
    div.className = `section ${sec.cor}`;
    div.id = sec.id;

    div.innerHTML = `
      <div class="section-header" onclick="toggleSection('${sec.id}')">
        <span class="section-icon">${sec.icone}</span>
        <span class="section-title">${sec.titulo}</span>
        <span class="section-badge obrig" id="badge_${sec.id}">0/${sec.itens.length}</span>
        <span class="chevron">▼</span>
      </div>
      <div class="section-body" id="body_${sec.id}">
        ${sec.itens.map(it => itemHTML(it)).join('')}
      </div>`;

    container.appendChild(div);
  });
}

// ── HTML DE CADA ITEM ───────────────────────────────────────
function itemHTML(it) {
  return `
  <div class="doc-item" id="docitem_${it.id}">
    <div>
      <div class="doc-name">${it.nome}</div>
      <div class="doc-desc">${it.desc}</div>
      <div class="doc-base">Base legal: ${it.base}</div>

      <div class="upload-area" id="uarea_${it.id}" onclick="triggerUpload('${it.id}')">
        <input type="file" id="finput_${it.id}" multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onchange="handleFile('${it.id}', this)"
          onclick="event.stopPropagation()">
        <span class="upload-icon">📎</span>
        <div class="upload-label" id="ulabel_${it.id}">
          Clique para anexar o documento<br>
          <small style="color:#94a3b8">PDF, JPG, PNG, DOC • Múltiplos arquivos permitidos</small>
        </div>
      </div>

      <div class="file-preview" id="fpreview_${it.id}"></div>

      <div class="obs-field">
        <input type="text" id="obs_${it.id}"
          placeholder="Observação (ex: válido até dd/mm/aaaa)"
          oninput="salvarDados()">
      </div>
    </div>
    <div>
      <span class="obrig-badge ${it.obrig ? 'obrig' : 'facult'}">
        ${it.obrig ? 'OBRIGATÓRIO' : 'FACULTATIVO'}
      </span>
    </div>
  </div>`;
}

// ── UPLOAD ──────────────────────────────────────────────────
function triggerUpload(id) {
  document.getElementById('finput_' + id).click();
}

async function handleFile(id, input) {
  if (!input.files.length) return;
  if (!estado[id]) estado[id] = { files: [], obs: '' };
  if (!estado[id].fileObjs) estado[id].fileObjs = [];
  if (!estado[id].meta) estado[id].meta = [];

  const novos = Array.from(input.files).filter(f => !estado[id].files.includes(f.name));
  input.value = '';
  if (novos.length === 0) return;

  const label = document.getElementById('ulabel_' + id);
  const textoOriginal = label.innerHTML;
  label.innerHTML = '⏳ Enviando arquivo(s) para a nuvem...';

  try {
    for (const f of novos) {
      const meta = await uploadArquivoStorage(id, f);
      estado[id].files.push(f.name);
      estado[id].fileObjs.push(f);
      estado[id].meta.push(meta);
    }
    salvarDados();
  } catch (e) {
    console.warn('⚠️ Não foi possível enviar o arquivo para a nuvem:', e);
    alert('⚠️ Não foi possível enviar o arquivo para a nuvem. Verifique sua conexão e tente novamente.');
  }

  renderPreview(id);
  atualizarProgresso();
}

function renderPreview(id) {
  const files  = estado[id] ? estado[id].files : [];
  const area   = document.getElementById('uarea_'    + id);
  const label  = document.getElementById('ulabel_'   + id);
  const preview = document.getElementById('fpreview_' + id);

  if (files.length > 0) {
    area.classList.add('has-file');
    label.classList.add('has-file');
    label.innerHTML = `✅ ${files.length} arquivo(s) anexado(s)`;
    preview.innerHTML = files.map((f, i) =>
      `<span class="file-tag">📄 ${f}
        <button onclick="removeFile('${id}', ${i})">✕</button>
      </span>`
    ).join('');
  } else {
    area.classList.remove('has-file');
    label.classList.remove('has-file');
    label.innerHTML = `Clique para anexar o documento<br>
      <small style="color:#94a3b8">PDF, JPG, PNG, DOC • Múltiplos arquivos permitidos</small>`;
    preview.innerHTML = '';
  }
}

async function removeFile(id, idx) {
  const meta = estado[id].meta ? estado[id].meta[idx] : null;

  estado[id].files.splice(idx, 1);
  if (estado[id].fileObjs) estado[id].fileObjs.splice(idx, 1);
  if (estado[id].meta) estado[id].meta.splice(idx, 1);

  renderPreview(id);
  salvarDados();
  atualizarProgresso();

  if (meta && meta.path) await removerArquivoStorage(meta.path);
}

// ── SEÇÕES ──────────────────────────────────────────────────
function toggleSection(id) {
  document.getElementById(id).classList.toggle('collapsed');
}

// ── PROGRESSO ───────────────────────────────────────────────
function atualizarProgresso() {
  let total = 0, anexados = 0;

  DOCS.forEach(sec => {
    let secAnex = 0;
    sec.itens.forEach(it => {
      total++;
      if (estado[it.id] && estado[it.id].files && estado[it.id].files.length > 0) {
        secAnex++;
        anexados++;
      }
    });

    const badge = document.getElementById('badge_' + sec.id);
    if (badge) {
      badge.textContent = `${secAnex}/${sec.itens.length}`;
      badge.style.background = secAnex === sec.itens.length
        ? '#22c55e'
        : 'rgba(255,255,255,0.25)';
    }
  });

  document.getElementById('globalBar').style.width = (anexados / total * 100) + '%';
  document.getElementById('globalLabel').textContent = `${anexados} de ${total} documentos anexados`;
}

// ── SALVAR / CARREGAR ────────────────────────────────────────
// Remove os objetos File (não serializáveis) antes de gravar no
// localStorage ou no Firestore. Os metadados dos arquivos (nome, tipo
// e URL do Firebase Storage) são sincronizados, permitindo restaurar
// os arquivos de verdade em qualquer dispositivo após o login.
function estadoParaSalvar() {
  const copia = {};
  Object.keys(estado).forEach(id => {
    copia[id] = {
      files: estado[id].files || [],
      obs: estado[id].obs || '',
      meta: estado[id].meta || []
    };
  });
  return copia;
}

function salvarDados() {
  // Salva observações no estado
  DOCS.forEach(sec => sec.itens.forEach(it => {
    const obs = document.getElementById('obs_' + it.id);
    if (obs) {
      if (!estado[it.id]) estado[it.id] = { files: [], obs: '' };
      estado[it.id].obs = obs.value;
    }
  }));

  const dados = {
    razao:      document.getElementById('razao').value,
    cnpj:       document.getElementById('cnpj').value,
    rep:        document.getElementById('rep').value,
    email:      document.getElementById('email').value,
    tel:        document.getElementById('tel').value,
    datapreench:document.getElementById('datapreench').value,
    estado: estadoParaSalvar()
  };

  let ok = true;
  try {
    localStorage.setItem('org719_2026', JSON.stringify(dados));
    console.log('✅ Dados salvos no localStorage');
  } catch(e) {
    console.warn('⚠️ Não foi possível salvar localmente:', e);
    ok = false;
  }

  if (usuarioAtual) {
    db.collection('usuarios').doc(usuarioAtual.uid).set(dados, { merge: true })
      .then(() => console.log('☁️ Dados sincronizados com a nuvem'))
      .catch(e => console.warn('⚠️ Não foi possível sincronizar com a nuvem:', e));
  }

  return ok;
}

function salvarProgressoManual() {
  const ok = salvarDados();
  if (ok) {
    mostrarToast('✅ Progresso salvo neste navegador');
  } else {
    mostrarToast('⚠️ Não foi possível salvar — armazenamento cheio ou bloqueado', true);
  }
}

let toastTimeout;
function mostrarToast(mensagem, erro) {
  const toast = document.getElementById('toastSalvo');
  toast.textContent = mensagem;
  toast.style.background = erro ? '#dc2626' : '#16a34a';
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
}

async function carregarDados() {
  try {
    // Limpa estado de uma sessão/usuário anterior antes de recarregar
    Object.keys(estado).forEach(k => delete estado[k]);
    ['razao', 'cnpj', 'rep', 'email', 'tel', 'datapreench'].forEach(id => {
      document.getElementById(id).value = '';
    });
    DOCS.forEach(sec => sec.itens.forEach(it => {
      const obs = document.getElementById('obs_' + it.id);
      if (obs) obs.value = '';
      renderPreview(it.id);
    }));

    let dados = null;

    if (usuarioAtual) {
      try {
        const snap = await db.collection('usuarios').doc(usuarioAtual.uid).get();
        if (snap.exists) {
          dados = snap.data();
          console.log('☁️ Dados carregados da nuvem');
        }
      } catch (e) {
        console.warn('⚠️ Não foi possível buscar dados da nuvem, usando cópia local:', e);
      }
    }

    if (!dados) {
      const raw = localStorage.getItem('org719_2026');
      if (raw) dados = JSON.parse(raw);
    }

    if (!dados) { carregandoArquivos = false; atualizarProgresso(); return; }

    if (dados.razao)       document.getElementById('razao').value       = dados.razao;
    if (dados.cnpj)        document.getElementById('cnpj').value        = dados.cnpj;
    if (dados.rep)         document.getElementById('rep').value         = dados.rep;
    if (dados.email)       document.getElementById('email').value       = dados.email;
    if (dados.tel)         document.getElementById('tel').value         = dados.tel;
    if (dados.datapreench) document.getElementById('datapreench').value = dados.datapreench;

    if (dados.estado) {
      Object.assign(estado, dados.estado);
      DOCS.forEach(sec => sec.itens.forEach(it => {
        renderPreview(it.id);
        const obs = document.getElementById('obs_' + it.id);
        if (obs && estado[it.id]) obs.value = estado[it.id].obs || '';
      }));
    }

    await restaurarArquivosPersistidos();
  } catch(e) {
    console.warn('⚠️ Erro ao carregar dados:', e);
    carregandoArquivos = false;
    atualizarProgresso();
  }
}

async function restaurarArquivosPersistidos() {
  const tarefas = [];

  DOCS.forEach(sec => sec.itens.forEach(it => {
    const item = estado[it.id];
    if (item && item.meta && item.meta.length > 0) {
      tarefas.push(
        Promise.all(item.meta.map(m => baixarArquivoStorage(m)))
          .then(arquivos => {
            item.fileObjs = arquivos;
            renderPreview(it.id);
          })
          .catch(e => {
            console.warn(`⚠️ Não foi possível baixar os arquivos de ${it.id}:`, e);
          })
      );
    }
  }));

  await Promise.all(tarefas);

  carregandoArquivos = false;
  atualizarProgresso();
}

// ── RELATÓRIO ───────────────────────────────────────────────
function abrirRelatorio() {
  salvarDados();

  const razao = document.getElementById('razao').value || 'Não informado';
  const cnpj  = document.getElementById('cnpj').value  || 'Não informado';
  const data  = new Date().toLocaleDateString('pt-BR');

  let ok = 0, pend = 0, miss = 0;
  let bodyHTML = '';

  DOCS.forEach(sec => {
    bodyHTML += `<div class="rel-section"><h3>${sec.icone} ${sec.titulo}</h3>`;

    sec.itens.forEach(it => {
      const arqs = estado[it.id] && estado[it.id].files && estado[it.id].files.length > 0;
      const obs  = estado[it.id] && estado[it.id].obs ? estado[it.id].obs : '';
      let dot, status;

      if (arqs) {
        dot = 'dot-ok';
        status = `✅ Anexado — ${estado[it.id].files.join(', ')}`;
        ok++;
      } else if (!it.obrig) {
        dot = 'dot-pend';
        status = '⚠️ Facultativo — não anexado';
        pend++;
      } else {
        dot = 'dot-miss';
        status = '❌ PENDENTE — documento obrigatório em falta';
        miss++;
      }

      bodyHTML += `
        <div class="rel-item">
          <div class="rel-dot ${dot}"></div>
          <div class="rel-info">
            <div class="rel-name">${it.nome}</div>
            <div class="rel-status">${status}</div>
            ${obs ? `<div class="rel-obs">Obs: ${obs}</div>` : ''}
          </div>
        </div>`;
    });

    bodyHTML += '</div>';
  });

  document.getElementById('relMeta').textContent =
    `Empresa: ${razao} | CNPJ: ${cnpj} | Gerado em: ${data}`;

  document.getElementById('relSummary').innerHTML = `
    <div class="sum-card sc-ok">
      <div class="num">${ok}</div><div class="lbl">Anexados</div>
    </div>
    <div class="sum-card sc-pend">
      <div class="num">${pend}</div><div class="lbl">Facultativos pendentes</div>
    </div>
    <div class="sum-card sc-miss">
      <div class="num">${miss}</div><div class="lbl">Obrigatórios em falta</div>
    </div>`;

  document.getElementById('relBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').classList.add('open');
}

// ── EXPORTAÇÃO DO PACOTE COMPLETO (ZIP) ──────────────────────
function exportarPacote() {
  salvarDados();

  if (typeof JSZip === 'undefined') {
    alert('Não foi possível carregar o gerador de ZIP. Verifique sua conexão com a internet e tente novamente.');
    return;
  }

  if (carregandoArquivos) {
    alert('Ainda estamos carregando os documentos salvos. Aguarde alguns segundos e tente novamente.');
    return;
  }

  const razao = document.getElementById('razao').value || 'Não informado';
  const cnpj  = document.getElementById('cnpj').value  || 'Não informado';

  // Verifica documentos obrigatórios sem arquivo real disponível na sessão atual
  const faltando = [];
  const semConteudo = [];
  DOCS.forEach(sec => sec.itens.forEach(it => {
    const item = estado[it.id];
    const temNome = item && item.files && item.files.length > 0;
    const temConteudo = item && item.fileObjs && item.fileObjs.length > 0;
    if (it.obrig && !temNome) faltando.push(it.nome);
    else if (temNome && !temConteudo) semConteudo.push(it.nome);
  }));

  if (semConteudo.length > 0) {
    alert('⚠️ Não foi possível baixar o conteúdo destes documentos da nuvem (verifique sua conexão):\n\n- ' +
      semConteudo.join('\n- ') +
      '\n\nPor favor, tente novamente ou anexe-os de novo antes de gerar o pacote.');
    return;
  }

  if (faltando.length > 0) {
    const continuar = confirm('⚠️ Existem documentos OBRIGATÓRIOS ainda não anexados:\n\n- ' +
      faltando.join('\n- ') +
      '\n\nDeseja gerar o pacote mesmo assim (incompleto)?');
    if (!continuar) return;
  }

  const zip = new JSZip();
  let resumo = `PACOTE DE DOCUMENTOS PARA HABILITAÇÃO\n`;
  resumo += `================================================\n\n`;
  resumo += `Empresa: ${razao}\nCNPJ: ${cnpj}\nGerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;

  let ordem = 1;
  DOCS.forEach(sec => {
    resumo += `\n${sec.icone} ${sec.titulo}\n`;
    sec.itens.forEach(it => {
      const item = estado[it.id];
      const arquivos = item && item.fileObjs ? item.fileObjs : [];
      const prefixo = String(ordem).padStart(2, '0');
      const nomeSanitizado = it.nome.replace(/[\/\\]/g, '-');
      const pastaBase = `${prefixo} - ${nomeSanitizado}`;

      if (arquivos.length > 0) {
        resumo += `  ✅ ${it.nome} — ${arquivos.map(f => f.name).join(', ')}\n`;
        arquivos.forEach((f, idx) => {
          const nomeFinal = arquivos.length > 1
            ? `${pastaBase} (${idx + 1}) - ${f.name}`
            : `${pastaBase} - ${f.name}`;
          zip.file(nomeFinal, f);
        });
      } else {
        resumo += `  ${it.obrig ? '❌ PENDENTE (obrigatório)' : '⚠️ Não anexado (facultativo)'} — ${it.nome}\n`;
      }
      ordem++;
    });
  });

  zip.file('00 - Resumo do Pacote.txt', resumo);

  zip.generateAsync({ type: 'blob' }).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const nomeZip = `Documentos_719-2026_${(razao || 'empresa').replace(/[^\w\-]+/g, '_')}.zip`;
    a.href = url;
    a.download = nomeZip;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

function fecharModal(e) {
  if (e.target === document.getElementById('modalOverlay')) {
    document.getElementById('modalOverlay').classList.remove('open');
  }
}

// ── START ────────────────────────────────────────────────────
// A construção da tela (buildUI) e o carregamento dos dados
// (carregarDados) agora são disparados pelo listener de autenticação
// acima, assim que o usuário faz login.
