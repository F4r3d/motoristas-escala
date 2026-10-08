
  // 1. URL da sua API no Google Apps Script
  const API_URL = "https://script.google.com/macros/s/AKfycbzyhKffSRRaf83b2QzyM6K6kEK-06cEcrthTndvVFejKZzhAxwvZLOlb72aWbK8DHzu/exec";

  // Estado global da aplicação em memória
  let appState = {
    motoristas: [],
    viagensHistorico: [],
    datas: {
      hoje: "",
      ontem: "",
      anteontem: ""
    }
  };

  // Executa assim que o HTML for completamente carregado
  document.addEventListener("DOMContentLoaded", () => {
    configurarDatas();
    carregarDadosDoSheets();
  });

   // Busca motoristas e histórico de viagens no Sheets
  async function carregarDadosDoSheets() {
    try {
      console.log("Buscando dados no Google Sheets...");
      const response = await fetch(API_URL);
      const data = await response.json();

      appState.motoristas = data.motoristas || [];
      appState.viagensHistorico = data.viagens || [];

      console.log("Motoristas carregados:", appState.motoristas);
      console.log("Histórico de viagens carregado:", appState.viagensHistorico);

      // Renderiza os nomes dos motoristas no cabeçalho da tabela/cards
      renderizarMotoristas();

      // Preenche os históricos de Ontem e Anteontem
      renderizarHistorico();

      indexarHistoricoRecente();

      preencherInputsDiaZero();

    } catch (error) {
      console.error("Erro ao carregar dados do Sheets:", error);
      alert("Não foi possível carregar os dados do Google Sheets. Verifique a conexão.");
    }
  }

  // Atualiza os cabeçalhos das tabelas com os nomes reais vindos da aba "Motoristas"
  function renderizarMotoristas() {
  if (appState.motoristas.length === 0) return;

  // Atualiza todos os <th> da tabela desktop (sem a coluna #)
  const thsHeadHoje = document.querySelectorAll("#table-head-hoje th, thead tr th");
  thsHeadHoje.forEach((th, index) => {
    if (appState.motoristas[index]) {
      th.innerText = appState.motoristas[index];
    }
  });

  // Atualiza os títulos dos cards mobile
  const titulosCardsMobile = document.querySelectorAll("#grid-mobile-hoje h4, .lg\\:hidden h4");
  titulosCardsMobile.forEach((h4, index) => {
    if (appState.motoristas[index]) {
      h4.innerText = appState.motoristas[index];
    }
  });
}

 // Normaliza qualquer formato de data (Google, ISO, etc) para YYYY-MM-DD
function extrairDataISO(dataRaw) {
  if (!dataRaw) return '';

  if (typeof dataRaw === 'string') {
    const s = dataRaw.trim();
    // DD/MM/YYYY ou D/M/YYYY
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    // já está em YYYY-MM-DD
    const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
  }

  const d = new Date(dataRaw);
  if (isNaN(d.getTime())) return String(dataRaw).split('T')[0];
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}


function preencherInputsDiaZero() {
  if (!appState.viagensHistorico || appState.viagensHistorico.length === 0) return;

  // Filtra as viagens gravadas no banco que pertencem ao Dia Zero (hoje)
  const viagensHoje = appState.viagensHistorico.filter(v =>
    extrairDataISO(v.data) === appState.datas.hoje
  );
  
  // Limpa os inputs do Dia Zero antes de preencher
  document.querySelectorAll("input[data-mot]").forEach(input => input.value = "");

  // Agrupa viagens por motorista para saber qual linha preencher
  const contadorPorMotorista = {};

  viagensHoje.forEach(v => {
    // Descobre o número do motorista (1 a 8) com base no nome
    const indiceMotorista = appState.motoristas.indexOf(v.motorista);
    
    if (indiceMotorista !== -1) {
      const numMotorista = indiceMotorista + 1;
      
      if (!contadorPorMotorista[numMotorista]) {
        contadorPorMotorista[numMotorista] = 1;
      } else {
        contadorPorMotorista[numMotorista]++;
      }

      const numViagem = contadorPorMotorista[numMotorista];

      // Busca TODOS os inputs (Desktop e Mobile) correspondentes a este motorista e viagem
      const targets = document.querySelectorAll(`input[data-mot="${numMotorista}"][data-v="${numViagem}"]`);
      targets.forEach(input => {
        input.value = v.passageiro;
      });
    }
  });
}



function renderizarHistorico() {
  if (!appState.viagensHistorico || appState.viagensHistorico.length === 0) return;

  // Filtra comparando ambas as datas no formato limpo YYYY-MM-DD
  const viagensOntem = appState.viagensHistorico.filter(v => 
    extrairDataISO(v.data) === appState.datas.ontem
  );

  const viagensAnteontem = appState.viagensHistorico.filter(v => 
    extrairDataISO(v.data) === appState.datas.anteontem
  );

  // Preenche Ontem
  preencherHistoricoEspecifico(
    viagensOntem, 
    "table-head-ontem", 
    "table-body-ontem", 
    "grid-mobile-ontem"
  );

  // Preenche Anteontem
  preencherHistoricoEspecifico(
    viagensAnteontem, 
    "table-head-anteontem", 
    "table-body-anteontem", 
    "grid-mobile-anteontem"
  );
}


function preencherHistoricoEspecifico(viagensDoDia, idHeadDesktop, idBodyDesktop, idGridMobile) {
  const elHead = document.getElementById(idHeadDesktop);
  const elBody = document.getElementById(idBodyDesktop);
  const elMobile = document.getElementById(idGridMobile);

  if (!elHead || !elBody || !elMobile) return;

  // Garantimos que a tabela pai tenha largura fixa igual para todas as colunas
  const tabelaPai = elHead.closest('table');
  if (tabelaPai) {
    tabelaPai.classList.add('table-fixed', 'w-full');
  }

  // 1. Cabeçalho com Azul Pastel, centralizado e com largura idêntica
  elHead.innerHTML = appState.motoristas
    .map(mot => `<th class="p-3 text-center border-r border-blue-200 bg-blue-100 text-blue-900 font-bold uppercase text-xs tracking-wider">${mot}</th>`)
    .join('');

  // Organiza viagens por motorista
  const porMotorista = {};
  appState.motoristas.forEach(mot => { 
    porMotorista[mot.trim().toLowerCase()] = []; 
  });

  viagensDoDia.forEach(v => {
    const motChave = String(v.motorista || '').trim().toLowerCase();
    if (porMotorista[motChave]) {
      porMotorista[motChave].push(v.passageiro);
    }
  });

  const maxViagens = Math.max(
    ...Object.values(porMotorista).map(arr => arr.length), 
    5
  );

  // 2. Corpo da Tabela também centralizado (text-center) e alinhado
  let htmlBody = '';
  for (let i = 0; i < maxViagens; i++) {
    htmlBody += `<tr class="hover:bg-slate-50">`;
    appState.motoristas.forEach(mot => {
      const motChave = mot.trim().toLowerCase();
      const passageiro = porMotorista[motChave][i] || '-';
      const estilo = passageiro !== '-' ? 'text-slate-800 font-medium' : 'text-slate-300';
      htmlBody += `<td class="p-3 text-center border-r border-slate-200 ${estilo}">${passageiro}</td>`;
    });
    htmlBody += `</tr>`;
  }
  elBody.innerHTML = htmlBody;

  // 3. Cards Mobile
  let htmlMobile = '';
  appState.motoristas.forEach(mot => {
    const motChave = mot.trim().toLowerCase();
    const listaPassageiros = porMotorista[motChave] || [];
    htmlMobile += `
      <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
        <h4 class="bg-blue-100 font-bold text-blue-900 text-sm border-b pb-1 border-slate-100 text-left pl-2">${mot}</h4>
        <ul class="text-xs space-y-1 text-slate-600">
          ${listaPassageiros.length > 0 
            ? listaPassageiros.map(p => `<li class="bg-slate-50 p-1.5 rounded border border-slate-100 text-left">${p}</li>`).join('')
            : '<li class="text-slate-400 italic text-center">Sem viagens registradas</li>'}
        </ul>
      </div>
    `;
  });
  elMobile.innerHTML = htmlMobile;
}


// Auxiliar para gerar e formatar as datas
function configurarDatas() {
  const hojeObj = new Date();
  
  const ontemObj = new Date();
  ontemObj.setDate(hojeObj.getDate() - 1);
  
  const anteontemObj = new Date();
  anteontemObj.setDate(hojeObj.getDate() - 2);

  // Formata YYYY-MM-DD com garantia do fuso local
  const formatarISO = (d) => {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  // Formata DD/MM/YYYY para exibir na tela
  const formatarBR = (d) => {
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  appState.datas.hoje = formatarISO(hojeObj);
  appState.datas.ontem = formatarISO(ontemObj);
  appState.datas.anteontem = formatarISO(anteontemObj);

  if (document.getElementById("data-zero")) document.getElementById("data-zero").innerText = `(${formatarBR(hojeObj)})`;
  if (document.getElementById("data-1")) document.getElementById("data-1").innerText = `(${formatarBR(ontemObj)})`;
  if (document.getElementById("data-2")) document.getElementById("data-2").innerText = `(${formatarBR(anteontemObj)})`;
}


// VALIDAÇÃO

// Memória para guardar os pares "motorista + passageiro" dos últimos 2 dias
let historicoRecenteSet = new Set();

// Prepara os dados logo após baixar da planilha
function indexarHistoricoRecente() {
  historicoRecenteSet.clear();
  if (!appState.viagensHistorico) return;

  appState.viagensHistorico.forEach(v => {
    const dataISO = extrairDataISO(v.data);
    if (dataISO === appState.datas.ontem || dataISO === appState.datas.anteontem) {
      const mot = String(v.motorista || '').trim().toLowerCase();
      const pas = String(v.passageiro || '').trim().toLowerCase();
      if (mot && pas) {
        historicoRecenteSet.add(`${mot}|${pas}`);
      }
    }
  });
}

// Fica de olho no que está sendo digitado (Tabela ou Cards)
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.tagName !== "INPUT" || el.type !== "text") return;

  // Em vez de procurar <td>, pegamos o número do motorista pelo data-mot do próprio input
  const numMot = el.getAttribute("data-mot");
  if (!numMot) return;

  // Pega o nome do motorista na lista usando o índice (lembrando que numMot começa em 1, então subtrai 1)
  const motorista = appState.motoristas[parseInt(numMot) - 1];
  if (!motorista) return;

  const valor = el.value.trim().toLowerCase();
  
  if (!valor) {
    el.className = "w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 bg-white text-slate-800";
    el.removeAttribute("title");
    return;
  }

  // Verifica se a combinação "motorista|passageiro" existe no histórico
  const chave = `${motorista.trim().toLowerCase()}|${valor}`;
  
  if (historicoRecenteSet.has(chave)) {
    // Fundo vermelho pastel se for repetido
    el.className = "w-full p-2 border border-red-400 rounded focus:ring-2 focus:ring-red-400 bg-red-100 text-red-900 font-medium";
    el.title = `Atenção: ${motorista} já transportou este passageiro nos últimos 2 dias!`;
  } else {
    // Fundo branco normal se for inédito
    el.className = "w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 bg-white text-slate-800";
    el.removeAttribute("title");
  }
});


// SALVAR

// Função para salvar a escala do Dia Zero no Google Sheets
async function salvarEscalaDiaZero() {
  const btnSalvar = document.getElementById("btnSalvarEscala");
  if (btnSalvar) {
    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando...";
  }

  const viagensParaSalvar = [];

  // Pega todos os inputs que possuem o atributo data-mot (visão Desktop)
  const dataHoje = appState.datas.hoje;
  const inputsDesktop = document.querySelectorAll("input[data-mot]");

  inputsDesktop.forEach(input => {
    const passageiro = input.value.trim();
    if (passageiro !== "") {
      const indiceMotorista = parseInt(input.dataset.mot, 10) - 1;
      const motorista = appState.motoristas[indiceMotorista];

      if (motorista) {
        viagensParaSalvar.push({
          data: dataHoje,
          motorista: motorista,
          passageiro: passageiro
        });
      }
    }
  });

  console.log("Enviando viagens encontradas:", viagensParaSalvar);

  if (viagensParaSalvar.length === 0) {
    alert("Nenhum passageiro preenchido para salvar!");
    if (btnSalvar) {
      btnSalvar.disabled = false;
      btnSalvar.innerText = "Salvar Escala";
    }
    return;
  }

  try {
    const resposta = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        data: dataHoje,
        viagens: viagensParaSalvar
      })
    });

    const resultado = await resposta.json();
    console.log("Resposta do servidor:", resultado);

    if (resultado.status === "success") {
      alert(`Escala salva com sucesso! (${resultado.count} registro(s))`);
      await carregarDadosDoSheets();
    } else {
      alert("Erro ao salvar: " + (resultado.mensagem || "Tente novamente."));
    }
  } catch (erro) {
    console.error("Erro na requisição de salvamento:", erro);
    alert("Erro de conexão ao salvar.");
  } finally {
    if (btnSalvar) {
      btnSalvar.disabled = false;
      btnSalvar.innerText = "Salvar Escala";
    }
  }
}

document.getElementById("btnSalvarEscala").addEventListener("click", salvarEscalaDiaZero);