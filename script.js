async function converter() {
  if (typeof carregarDados === "function") carregarDados();

  const texto = document.getElementById("entrada").value;
  const linhas = prepararLinhas(texto);
  const voos = [];

  for (let linha of linhas) {
    if (!/^\d+/.test(linha)) continue;

    const vooAmadeus = processarAmadeus(linha);
    const vooSabre = vooAmadeus ? null : processarSabre(linha);
    const vooFinal = vooAmadeus || vooSabre;

    if (vooFinal) voos.push(vooFinal);
  }

  gerarTabelas(voos);

  const mostrar = voos.length > 0;
  document.getElementById("painelResultado").style.display = mostrar ? "block" : "none";

  if (mostrar) mostrarIdioma("PT");
}

let idiomaAtual = "PT";

function mostrarIdioma(idioma) {
  const idiomas = {
    PT: "Português",
    EN: "Inglês",
    ES: "Espanhol"
  };

  if (!idiomas[idioma]) return;

  idiomaAtual = idioma;

  for (const codigo of Object.keys(idiomas)) {
    const saida = document.getElementById(`saida${codigo}`);
    const botao = document.getElementById(`idioma${codigo}`);
    const selecionado = codigo === idioma;

    if (saida) saida.hidden = !selecionado;

    if (botao) {
      botao.classList.toggle("ativo", selecionado);
      botao.setAttribute("aria-pressed", String(selecionado));
    }
  }

}

/* ===== PREPARAR LINHAS ===== */

function prepararLinhas(texto) {
  const linhasOriginais = texto
    .split("\n")
    .map(l => l.trim())
    .filter(l => l !== "");

  const linhas = [];

  for (let i = 0; i < linhasOriginais.length; i++) {
    let linha = linhasOriginais[i];

    if (
      linha.startsWith("•") ||
      linha.includes("OPERADO POR") ||
      linha.includes("CONSULTE") ||
      linha.includes("LATAM AIRLINES BRASIL") ||
      /^[0-9]{3}\s/.test(linha) ||
      /^\d{1,3}$/.test(linha)
    ) {
      continue;
    }

    if (/^\d+\s+[A-Z0-9]{2}$/i.test(linha) && linhasOriginais[i + 1]) {
      const proxima = linhasOriginais[i + 1].trim();

      if (/^\d+\s+[A-Z]\s+[0-9]{2}[A-Z]{3}/i.test(proxima)) {
        linha = linha + " " + proxima;
        i++;
      }
    }

    linhas.push(linha);
  }

  return linhas;
}

/* ===== LIMPAR ROTA ===== */

function limparRota(token) {
  return (token || "")
    .replace(/\*?(SS|HK|TK|DK|HN|HL|UC|UN|WL|HX|NO|RR)\d+/i, "")
    .replace(/[^A-Z]/gi, "")
    .substring(0, 6)
    .toUpperCase();
}

/* ===== SABRE ===== */

function processarSabre(linha) {
  const partes = linha.split(/\s+/);
  let i = 0;

  i++;

  let companhia = "";
  let voo = "";

  if (/^[A-Z0-9]{2}\d+/i.test(partes[i])) {
    const completo = partes[i];

    companhia = completo.substring(0, 2).toUpperCase();
    voo = completo.substring(2).replace(/[A-Z]$/i, "");

    i++;
  } else {
    companhia = (partes[i] || "").toUpperCase();
    voo = (partes[i + 1] || "").replace(/[A-Z]$/i, "");

    i += 2;
  }

  const dataSaida = partes[i] || "";
  i++;

  i++;

  const rotaComPossivelStatus = partes[i] || "";
  i++;

  const rota = limparRota(rotaComPossivelStatus);
  const origem = rota.substring(0, 3).toUpperCase();
  const destino = rota.substring(3, 6).toUpperCase();

  if (!origem || !destino) return null;

  if (
    partes[i] &&
    /^[\*\-]?(SS|HK|TK|DK|HN|HL|UC|UN|WL|HX|NO|RR)\d+/i.test(partes[i])
  ) {
    i++;
  }

  const horaSaida = partes[i] || "";
  i++;

  const horaChegada = partes[i] || "";
  i++;

  let dataChegada = dataSaida;

  if (partes[i] && /^[0-9]{2}[A-Z]{3}$/i.test(partes[i])) {
    dataChegada = partes[i];
  }

  return {
    companhia,
    voo,
    origem,
    destino,
    horaSaida,
    dataSaida,
    horaChegada,
    dataChegada
  };
}

/* ===== AMADEUS ===== */

function processarAmadeus(linha) {
  const partes = linha.split(/\s+/).filter(Boolean);

  if (partes.length < 6) return null;

  if (/^\d+$/.test(partes[0])) {
    partes.shift();
  }

  let companhia = "";
  let voo = "";

  if (/^[A-Z0-9]{2}$/i.test(partes[0]) && /^\d+[A-Z]?$/i.test(partes[1])) {
    companhia = partes[0].toUpperCase();
    voo = partes[1].replace(/[A-Z]$/i, "");
  } else if (/^[A-Z0-9]{2}\d+[A-Z]?$/i.test(partes[0])) {
    companhia = partes[0].substring(0, 2).toUpperCase();
    voo = partes[0].substring(2).replace(/[A-Z]$/i, "");
  } else {
    return null;
  }

  const datas = partes.filter(p => /^[0-9]{2}[A-Z]{3}$/i.test(p));
  const dataSaida = datas[0] || "";
  const dataChegada = datas[1] || dataSaida;

  if (!dataSaida) return null;

  let origem = "";
  let destino = "";

  const rotaToken = partes.find(p => /[A-Z]{6}/i.test(p));

  if (rotaToken) {
    const rota = limparRota(rotaToken);

    origem = rota.substring(0, 3).toUpperCase();
    destino = rota.substring(3, 6).toUpperCase();
  } else {
    const indiceData = partes.findIndex(p => /^[0-9]{2}[A-Z]{3}$/i.test(p));

    const possiveisCodigos = partes
      .slice(indiceData + 1)
      .filter(p => /^[A-Z]{3}$/i.test(p));

    origem = (possiveisCodigos[0] || "").toUpperCase();
    destino = (possiveisCodigos[1] || "").toUpperCase();
  }

  if (origem.length !== 3 || destino.length !== 3) return null;

  const indiceStatus = partes.findIndex(p =>
    /^(HK|TK|DK|HN|HL|SS|RR|UC|UN|WL|HX|NO)\d+$/i.test(p)
  );

  let horarios = [];

  if (indiceStatus !== -1) {
    horarios = partes
      .slice(indiceStatus + 1)
      .filter(p => /^[0-9]{4}$/.test(p));
  } else {
    horarios = partes.filter(p => /^[0-9]{4}$/.test(p));
  }

  const horaSaida = horarios[0] || "";
  const horaChegada = horarios[1] || "";

  if (!horaSaida || !horaChegada) return null;

  return {
    companhia,
    voo,
    origem,
    destino,
    horaSaida,
    dataSaida,
    horaChegada,
    dataChegada
  };
}

/* ===== HELPERS ===== */

function aeroportoB(sigla) {
  const s = (sigla || "").toUpperCase();

  const nomeBanco = window.dadosBanco?.aeroportos?.[s];
  const nomeLocal = typeof aeroportos !== "undefined" ? aeroportos[s] : "";
  const nome = nomeBanco || nomeLocal;

  return nome ? `${nome} (${s})` : s;
}

function nomeCompanhia(sigla) {
  const s = (sigla || "").toUpperCase();

  const nomeBanco = window.dadosBanco?.companhias?.[s];
  const nomeLocal = typeof companhias !== "undefined" ? companhias[s] : "";

  return nomeBanco || nomeLocal || s;
}

function formatarHora(h, idioma = "PT") {
  if (!h) return "";

  const s = String(h).replace(/\D/g, "");

  if (s.length !== 4) return h;

  const horas = Number(s.slice(0, 2));
  const minutos = s.slice(2, 4);

  if (idioma === "EN") {
    const periodo = horas >= 12 ? "PM" : "AM";
    const hora12 = horas % 12 || 12;
    return `${hora12}:${minutos} ${periodo}`;
  }

  const hora24 = `${String(horas).padStart(2, "0")}:${minutos}`;
  return idioma === "ES" ? `${hora24} h` : hora24;
}

function formatarDataPT(data) {
  if (!data) return "";

  const mapaMes = {
    JAN: "JAN",
    FEB: "FEV",
    MAR: "MAR",
    APR: "ABR",
    MAY: "MAI",
    JUN: "JUN",
    JUL: "JUL",
    AUG: "AGO",
    SEP: "SET",
    OCT: "OUT",
    NOV: "NOV",
    DEC: "DEZ"
  };

  const dia = data.substring(0, 2);
  const mes = data.substring(2, 5).toUpperCase();

  return dia + (mapaMes[mes] || mes);
}

function formatarDataES(data) {
  if (!data) return "";

  const mapaMes = {
    JAN: "ENE",
    FEB: "FEB",
    MAR: "MAR",
    APR: "ABR",
    MAY: "MAY",
    JUN: "JUN",
    JUL: "JUL",
    AUG: "AGO",
    SEP: "SEP",
    OCT: "OCT",
    NOV: "NOV",
    DEC: "DIC"
  };

  const dia = data.substring(0, 2);
  const mes = data.substring(2, 5).toUpperCase();

  return dia + (mapaMes[mes] || mes);
}

function mostrarToast(mensagem) {
  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.textContent = mensagem;
  toast.classList.add("show");

  clearTimeout(toast._timer);

  toast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

/* ===== TABELAS ===== */

function gerarTabelas(voos) {
  let htmlPT = `
<table class="tabela-voos">
<tr>
  <th>Cia Aérea</th>
  <th>Voo</th>
  <th>Data</th>
  <th>De</th>
  <th>Para</th>
  <th>Hora Saída</th>
  <th>Hora Chegada</th>
  <th>Data Chegada</th>
</tr>
<tbody>
`;

  for (const v of voos) {
    htmlPT += `
<tr>
  <td>${nomeCompanhia(v.companhia)}</td>
  <td>${v.voo}</td>
  <td>${formatarDataPT(v.dataSaida)}</td>
  <td>${aeroportoB(v.origem)}</td>
  <td>${aeroportoB(v.destino)}</td>
  <td>${formatarHora(v.horaSaida, "PT")}</td>
  <td>${formatarHora(v.horaChegada, "PT")}</td>
  <td>${formatarDataPT(v.dataChegada)}</td>
</tr>
`;
  }

  htmlPT += `</tbody></table>`;
  document.getElementById("saidaPT").innerHTML = htmlPT;

  let htmlEN = `
<table class="tabela-voos">
<tr>
  <th>Airline</th>
  <th>Flight</th>
  <th>Date</th>
  <th>From</th>
  <th>To</th>
  <th>Departure Time</th>
  <th>Arrival Time</th>
  <th>Arrival Date</th>
</tr>
<tbody>
`;

  for (const v of voos) {
    htmlEN += `
<tr>
  <td>${nomeCompanhia(v.companhia)}</td>
  <td>${v.voo}</td>
  <td>${v.dataSaida}</td>
  <td>${aeroportoB(v.origem)}</td>
  <td>${aeroportoB(v.destino)}</td>
  <td>${formatarHora(v.horaSaida, "EN")}</td>
  <td>${formatarHora(v.horaChegada, "EN")}</td>
  <td>${v.dataChegada}</td>
</tr>
`;
  }

  htmlEN += `</tbody></table>`;
  document.getElementById("saidaEN").innerHTML = htmlEN;

  let htmlES = `
<table class="tabela-voos">
<tr>
  <th>Aerolínea</th>
  <th>Vuelo</th>
  <th>Fecha</th>
  <th>Origen</th>
  <th>Destino</th>
  <th>Hora de salida</th>
  <th>Hora de llegada</th>
  <th>Fecha de llegada</th>
</tr>
<tbody>
`;

  for (const v of voos) {
    htmlES += `
<tr>
  <td>${nomeCompanhia(v.companhia)}</td>
  <td>${v.voo}</td>
  <td>${formatarDataES(v.dataSaida)}</td>
  <td>${aeroportoB(v.origem)}</td>
  <td>${aeroportoB(v.destino)}</td>
  <td>${formatarHora(v.horaSaida, "ES")}</td>
  <td>${formatarHora(v.horaChegada, "ES")}</td>
  <td>${formatarDataES(v.dataChegada)}</td>
</tr>
`;
  }

  htmlES += `</tbody></table>`;
  document.getElementById("saidaES").innerHTML = htmlES;
}

/* ===== COPIAR TABELA ===== */

function copiarTabelaEmail(idioma) {
  const seletores = {
    PT: "#saidaPT table",
    EN: "#saidaEN table",
    ES: "#saidaES table"
  };
  const selector = seletores[idioma] || seletores.PT;
  const tabela = document.querySelector(selector);

  if (!tabela) {
    mostrarToast("Gere a tabela primeiro.");
    return;
  }

  copiarTabelaDireta(tabela);
}

function copiarTabelaAtual() {
  copiarTabelaEmail(idiomaAtual);
}

function copiarTabelaDireta(tabela) {
  if (!tabela) {
    mostrarToast("Nenhuma tabela para copiar.");
    return;
  }

  const headerBg = "#3a4255";
  const headerText = "#ffffff";
  const borderColor = "#e5e7eb";
  const zebraBg = "#f3f4f6";
  const textColor = "#000923";
  const bodyBg = "#ffffff";

  const estilos = `
    <style>
      table.tabela-voos{
        width:100%;
        max-width:900px;
        border-collapse:collapse;
        background:${bodyBg};
        border:1px solid ${borderColor};
        font-family:"Segoe UI", Arial, sans-serif;
        font-size:12px;
        color:${textColor};
      }

      table.tabela-voos th{
        background:${headerBg};
        color:${headerText};
        font-weight:700;
        text-align:center;
        padding:6px 8px;
        border:1px solid ${borderColor};
        white-space:nowrap;
      }

      table.tabela-voos td{
        text-align:center;
        padding:7px 8px;
        border:1px solid ${borderColor};
        color:${textColor};
        white-space:nowrap;
      }

      table.tabela-voos tbody tr:nth-child(even){
        background:${zebraBg};
      }
    </style>
  `;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>${estilos}</head>
      <body>${tabela.outerHTML}</body>
    </html>
  `;

  if (navigator.clipboard && window.ClipboardItem) {
    const item = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([tabela.innerText], { type: "text/plain" })
    });

    navigator.clipboard.write([item])
      .then(() => mostrarToast("Tabela copiada!"))
      .catch(() => {
        navigator.clipboard.writeText(tabela.innerText)
          .then(() => mostrarToast("Copiado como texto."))
          .catch(() => mostrarToast("Não foi possível copiar."));
      });

  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(tabela.innerText)
      .then(() => mostrarToast("Copiado como texto."))
      .catch(() => mostrarToast("Não foi possível copiar."));

  } else {
    mostrarToast("Seu navegador não suporta cópia automática.");
  }
}

/* ===== CTRL + C / CTRL + ENTER ===== */

window.addEventListener("DOMContentLoaded", () => {
  const entrada = document.getElementById("entrada");

  if (entrada) {
    entrada.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        converter();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    const teclaC = e.key.toLowerCase() === "c";
    const ctrlOuCmd = e.ctrlKey || e.metaKey;

    if (!ctrlOuCmd || !teclaC) return;

    const ativo = document.activeElement;

    const emCampoEditavel =
      ativo &&
      (
        ativo.tagName === "TEXTAREA" ||
        ativo.tagName === "INPUT" ||
        ativo.isContentEditable
      );

    if (emCampoEditavel) return;

    const selecao = window.getSelection();

    if (!selecao || selecao.rangeCount === 0) return;

    const noSelecionado = selecao.anchorNode;

    if (!noSelecionado) return;

    const elemento =
      noSelecionado.nodeType === 1
        ? noSelecionado
        : noSelecionado.parentElement;

    if (!elemento) return;

    const tabelaPT = elemento.closest("#saidaPT table");
    const tabelaEN = elemento.closest("#saidaEN table");
    const tabelaES = elemento.closest("#saidaES table");

    if (tabelaPT) {
      e.preventDefault();
      copiarTabelaDireta(tabelaPT);
      return;
    }

    if (tabelaEN) {
      e.preventDefault();
      copiarTabelaDireta(tabelaEN);
      return;
    }

    if (tabelaES) {
      e.preventDefault();
      copiarTabelaDireta(tabelaES);
    }
  });
});
