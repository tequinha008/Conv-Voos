window.dadosBanco = {
  aeroportos: {},
  companhias: {}
};

const CACHE_DADOS = "conversor-voos-dados-v2";
let carregamentoDados = null;

function aplicarDadosBanco(dados) {
  window.dadosBanco.aeroportos = Object.fromEntries(
    (dados.aeroportos || []).map(item => [
      item.codigo_iata,
      item.nome_personalizado || item.nome
    ])
  );

  window.dadosBanco.companhias = Object.fromEntries(
    (dados.companhias || []).map(item => [
      item.codigo_iata,
      item.nome_personalizado || item.nome
    ])
  );
}

function carregarCacheBanco() {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_DADOS) || "null");
    if (!cache?.aeroportos?.length || !cache?.companhias?.length) return false;
    aplicarDadosBanco(cache);
    return true;
  } catch {
    return false;
  }
}

async function buscarTabelaBanco(nomeTabela) {
  const config = window.APP_CONFIG || {};
  const registros = [];
  const tamanhoPagina = 1000;

  for (let inicio = 0; ; inicio += tamanhoPagina) {
    const url = new URL(`${config.supabaseUrl}/rest/v1/${nomeTabela}`);
    url.searchParams.set("select", "codigo_iata,nome,nome_personalizado");
    url.searchParams.set("ativo", "eq.true");
    url.searchParams.set("order", "codigo_iata.asc");

    const resposta = await fetch(url, {
      headers: {
        apikey: config.supabasePublishableKey,
        Range: `${inicio}-${inicio + tamanhoPagina - 1}`
      }
    });

    if (!resposta.ok) throw new Error(`Falha ao consultar ${nomeTabela}.`);

    const pagina = await resposta.json();
    registros.push(...pagina);
    if (pagina.length < tamanhoPagina) break;
  }

  return registros;
}

async function atualizarDadosBanco() {
  const [aeroportosBanco, companhiasBanco] = await Promise.all([
    buscarTabelaBanco("aeroportos"),
    buscarTabelaBanco("companhias")
  ]);

  const dados = {
    aeroportos: aeroportosBanco,
    companhias: companhiasBanco,
    atualizadoEm: new Date().toISOString()
  };

  localStorage.setItem(CACHE_DADOS, JSON.stringify(dados));
  aplicarDadosBanco(dados);
}

async function carregarDados() {
  if (carregamentoDados) return carregamentoDados;

  carregamentoDados = (async () => {
    try {
      await atualizarDadosBanco();
    } catch (erro) {
      if (!carregarCacheBanco()) {
        console.warn("Banco indisponível; usando as listas locais.", erro);
      }
    }
  })();

  try {
    await carregamentoDados;
  } finally {
    carregamentoDados = null;
  }
}

async function adicionarCodigo(evento) {
  evento?.preventDefault();

  const input = document.getElementById("codigoAusente");
  const botao = document.getElementById("btnAdicionarCodigo");
  const status = document.getElementById("codigoStatus");
  const codigo = (input?.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!/^(?:[A-Z0-9]{2}|[A-Z]{3})$/.test(codigo)) {
    status.textContent = "Digite 3 letras para aeroporto ou 2 caracteres para companhia.";
    return;
  }

  const config = window.APP_CONFIG || {};
  botao.disabled = true;
  status.textContent = "Buscando o nome…";

  try {
    const resposta = await fetch(
      `${config.supabaseUrl}/functions/v1/${config.funcaoAdicionarCodigo}`,
      {
        method: "POST",
        headers: {
          apikey: config.supabasePublishableKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ codigo })
      }
    );

    const resultado = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(resultado.erro || "Código não encontrado.");

    await atualizarDadosBanco();
    status.textContent = `${resultado.codigo} — ${resultado.nome} adicionado com sucesso.`;
    input.value = "";
  } catch (erro) {
    status.textContent = erro.message || "Não foi possível adicionar o código.";
  } finally {
    botao.disabled = false;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  carregarCacheBanco();
  carregarDados();

  const input = document.getElementById("codigoAusente");
  input?.addEventListener("input", () => {
    input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  });
});
