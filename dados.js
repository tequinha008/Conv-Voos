window.dadosBanco = {
  aeroportos: {},
  companhias: {}
};

const CACHE_DADOS = "conversor-voos-dados-v4";
let carregamentoDados = null;

function nomeCurtoAeroporto(item) {
  const cidade = String(item.cidade || "").trim();
  let nome = String(item.nome || item.codigo_iata || "").trim();

  if (cidade) {
    const cidadeSegura = cidade.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    nome = nome.replace(new RegExp(`^${cidadeSegura}\\s*[–—-]\\s*`, "i"), "");
  }

  nome = nome
    .replace(/\b(international|internacional|intl\.?|airport|aeroporto|regional|municipal)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+[–—-]\s*$/g, "")
    .replace(/^[–—-]\s*/g, "")
    .trim();

  if (!cidade) return nome || item.codigo_iata;
  if (!nome || nome.toLocaleLowerCase() === cidade.toLocaleLowerCase()) return cidade;

  return `${cidade} – ${nome}`;
}

function aplicarDadosBanco(dados) {
  window.dadosBanco.aeroportos = Object.fromEntries(
    (dados.aeroportos || []).map(item => [
      item.codigo_iata,
      item.nome_personalizado || nomeCurtoAeroporto(item)
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

async function buscarTabelaBanco(nomeTabela, colunas) {
  const config = window.APP_CONFIG || {};
  const registros = [];
  const tamanhoPagina = 1000;

  for (let inicio = 0; ; inicio += tamanhoPagina) {
    const url = new URL(`${config.supabaseUrl}/rest/v1/${nomeTabela}`);
    url.searchParams.set("select", colunas);
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
    buscarTabelaBanco("aeroportos", "codigo_iata,nome,nome_personalizado,cidade"),
    buscarTabelaBanco("companhias", "codigo_iata,nome,nome_personalizado")
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
    status.textContent = "";
    if (typeof mostrarToast === "function") {
      mostrarToast(`${resultado.codigo} adicionado com sucesso!`);
    }
    input.value = "";
  } catch (erro) {
    status.textContent = "";
    const mensagem = erro.message || "Não foi possível adicionar o código.";
    if (typeof mostrarToast === "function") mostrarToast(mensagem);
  } finally {
    botao.disabled = false;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const areaCodigo = document.querySelector(".codigo-area");

  if (areaCodigo) {
    const campos = [...areaCodigo.querySelectorAll("#codigoAusente")];
    const botoes = [...areaCodigo.querySelectorAll('.codigo-linha button[type="submit"]')];
    const ajudas = [...areaCodigo.querySelectorAll(".codigo-ajuda")];

    campos.slice(0, -1).forEach(elemento => elemento.remove());
    botoes.slice(0, -1).forEach(elemento => elemento.remove());
    ajudas.forEach(elemento => elemento.remove());
  }

  carregarCacheBanco();
  carregarDados();

  const input = document.getElementById("codigoAusente");
  input?.addEventListener("input", () => {
    input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const status = document.getElementById("codigoStatus");
    if (status) status.textContent = "";
  });
});
