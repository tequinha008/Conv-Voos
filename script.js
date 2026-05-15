function converter() {
  const texto = document.getElementById("entrada").value;

  const linhas = prepararLinhas(texto);

  const voos = [];

  for (let linha of linhas) {

    if (!/^\d+/.test(linha)) continue;

    const vooAmadeus = processarAmadeus(linha);
    const vooSabre = vooAmadeus ? null : processarSabre(linha);

    const vooFinal = vooAmadeus || vooSabre;

    if (vooFinal) {
      voos.push(vooFinal);
    }
  }

  gerarTabelas(voos);

  const mostrar = voos.length > 0;

  document.getElementById("tituloPT").style.display =
    mostrar ? "block" : "none";

  document.getElementById("tituloEN").style.display =
    mostrar ? "block" : "none";

  document.getElementById("btnCopiarPT").style.display =
    mostrar ? "inline-block" : "none";

  document.getElementById("btnCopiarEN").style.display =
    mostrar ? "inline-block" : "none";
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

    // Ignorar textos desnecessários do AMADEUS
    if (
      linha.startsWith("•") ||
      linha.includes("GRUPO") ||
      linha.includes("OPERADO POR") ||
      linha.includes("CONSULTE") ||
      linha.includes("LATAM AIRLINES BRASIL") ||
      /^[0-9]{3}\s/.test(linha) ||
      /^\d{1,3}$/.test(linha)
    ) {
      continue;
    }

    // Junta:
    // 1 LA
    // 8084 O 05JUL...
    if (
      /^\d+\s+[A-Z0-9]{2}$/i.test(linha) &&
      linhasOriginais[i + 1]
    ) {

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

/* ===== SABRE ===== */

function processarSabre(linha) {

  const partes = linha.split(/\s+/);

  let i = 0;

  i++;

  let companhia = "";
  let voo = "";

  // LA8126L
  if (/^[A-Z0-9]{2}\d+/i.test(partes[i])) {

    const completo = partes[i];

    companhia = completo.substring(0, 2).toUpperCase();

    voo = completo
      .substring(2)
      .replace(/[A-Z]$/i, "");

    i++;

  } else {

    // LA 8126
    companhia = (partes[i] || "").toUpperCase();

    voo = (partes[i + 1] || "")
      .replace(/[A-Z]$/i, "");

    i += 2;
  }

  const dataSaida = partes[i] || "";

  i++;

  // pula dia da semana
  i++;

  const rotaComPossivelStatus = partes[i] || "";

  i++;

  const rota = rotaComPossivelStatus
    .replace(/[^A-Z]/gi, "");

  const origem = rota.substring(0, 3).toUpperCase();

  const destino = rota.substring(3, 6).toUpperCase();

  if (!origem || !destino) return null;

  // STATUS
  if (
    partes[i] &&
    /^[\*\-]?(SS|HK|TK|DK|HN|HL|UC|UN|WL|HX|NO)\d+/i.test(partes[i])
  ) {
    i++;
  }

  const horaSaida = partes[i] || "";

  i++;

  const horaChegada = partes[i] || "";

  i++;

  let dataChegada = dataSaida;

  if (
    partes[i] &&
    /^[0-9]{2}[A-Z]{3}$/i.test(partes[i])
  ) {
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

  const partes = linha
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length < 6) return null;

  // Remove número do segmento
  if (/^\d+$/.test(partes[0])) {
    partes.shift();
  }

  let companhia = "";
  let voo = "";

  // LA 8084
  if (
    /^[A-Z0-9]{2}$/i.test(partes[0]) &&
    /^\d+[A-Z]?$/i.test(partes[1])
  ) {

    companhia = partes[0].toUpperCase();

    voo = partes[1]
      .replace(/[A-Z]$/i, "");
  }

  // LH1283
  else if (
    /^[A-Z0-9]{2}\d+[A-Z]?$/i.test(partes[0])
  ) {

    companhia = partes[0]
      .substring(0, 2)
      .toUpperCase();

    voo = partes[0]
      .substring(2)
      .replace(/[A-Z]$/i, "");
  }

  else {
    return null;
  }

  // DATAS
  const datas = partes.filter(p =>
    /^[0-9]{2}[A-Z]{3}$/i.test(p)
  );

  const dataSaida = datas[0] || "";

  const dataChegada = datas[1] || dataSaida;

  if (!dataSaida) return null;

  let origem = "";
  let destino = "";

  // ROTA JUNTA
  const rotaToken = partes.find(p =>
    /[A-Z]{6}/i.test(p)
  );

  if (rotaToken) {

    const rota = rotaToken
      .replace(/[^A-Z]/gi, "");

    origem = rota.substring(0, 3).toUpperCase();

    destino = rota.substring(3, 6).toUpperCase();

  } else {

    // ROTA SEPARADA
    const indiceData = partes.findIndex(p =>
      /^[0-9]{2}[A-Z]{3}$/i.test(p)
    );

    const possiveisCodigos = partes
      .slice(indiceData + 1)
      .filter(p => /^[A-Z]{3}$/i.test(p));

    origem = (possiveisCodigos[0] || "")
      .toUpperCase();

    destino = (possiveisCodigos[1] || "")
      .toUpperCase();
  }

  if (
    origem.length !== 3 ||
    destino.length !== 3
  ) {
    return null;
  }

  // STATUS
  const indiceStatus = partes.findIndex(p =>
    /^(HK|TK|DK|HN|HL|SS|RR|UC|UN|WL|HX|NO)\d+$/i.test(p)
  );

  let horarios = [];

  if (indiceStatus !== -1) {

    horarios = partes
      .slice(indiceStatus + 1)
      .filter(p => /^[0-9]{4}$/.test(p));

  } else {

    horarios = partes
      .filter(p => /^[0-9]{4}$/.test(p));
  }

  const horaSaida = horarios[0] || "";

  const horaChegada = horarios[1] || "";

  if (!horaSaida || !horaChegada) {
    return null;
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

/* ===== HELPERS ===== */

function aeroportoB(sigla) {

  const s = (sigla || "").toUpperCase();

  if (typeof aeroportos === "undefined") {
    return s;
  }

  const nome = aeroportos[s];

  return nome
    ? `${nome} (${s})`
    : s;
}

function nomeCompanhia(sigla) {

  const s = (sigla || "").toUpperCase();

  if (typeof companhias === "undefined") {
    return s;
  }

  return companhias[s] || s;
}

function formatarHora(h) {

  if (!h) return "";

  const s = String(h)
    .replace(/\D/g, "");

  if (s.length !== 4) return h;

  return s.slice(0, 2) + ":" + s.slice(2, 4);
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

  const mes = data
    .substring(2, 5)
    .toUpperCase();

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
  <td>${formatarHora(v.horaSaida)}</td>
  <td>${formatarHora(v.horaChegada)}</td>
  <td>${formatarDataPT(v.dataChegada)}</td>
</tr>
`;
  }

  htmlPT += `</tbody></table>`;

  document.getElementById("saidaPT").innerHTML =
    htmlPT;

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
  <td>${formatarHora(v.horaSaida)}</td>
  <td>${formatarHora(v.horaChegada)}</td>
  <td>${v.dataChegada}</td>
</tr>
`;
  }

  htmlEN += `</tbody></table>`;

  document.getElementById("saidaEN").innerHTML =
    htmlEN;
}
/* ===== COPIAR TABELA ===== */

function copiarTabelaEmail(idioma) {

  const selector =
    idioma === "EN"
      ? "#saidaEN table"
      : "#saidaPT table";

  const tabela = document.querySelector(selector);

  if (!tabela) {
    mostrarToast("Gere a tabela primeiro.");
    return;
  }

  copiarTabelaDireta(tabela);
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
        max-width:1000px;
        border-collapse:separate;
        border-spacing:0;
        background:${bodyBg};
        border:1px solid ${borderColor};
        border-radius:10px;
        overflow:hidden;
        font-family:"Segoe UI", Arial, sans-serif;
        font-size:13px;
        color:${textColor};
      }

      table.tabela-voos th{
        background:${headerBg};
        color:${headerText};
        font-weight:700;
        text-align:center;
        padding:10px 12px;
      }

      table.tabela-voos td{
        text-align:center;
        padding:10px 12px;
        border-top:1px solid ${borderColor};
        color:${textColor};
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
      "text/html": new Blob(
        [html],
        { type: "text/html" }
      ),

      "text/plain": new Blob(
        [tabela.innerText],
        { type: "text/plain" }
      )
    });

    navigator.clipboard.write([item])

      .then(() => {
        mostrarToast("Tabela copiada!");
      })

      .catch(() => {

        navigator.clipboard
          .writeText(tabela.innerText)

          .then(() => {
            mostrarToast("Copiado como texto.");
          })

          .catch(() => {
            mostrarToast("Não foi possível copiar.");
          });
      });

  } else if (navigator.clipboard) {

    navigator.clipboard
      .writeText(tabela.innerText)

      .then(() => {
        mostrarToast("Copiado como texto.");
      })

      .catch(() => {
        mostrarToast("Não foi possível copiar.");
      });

  } else {

    mostrarToast(
      "Seu navegador não suporta cópia automática."
    );
  }
}

/* ===== CTRL + C ===== */

window.addEventListener("DOMContentLoaded", () => {

  const entrada = document.getElementById("entrada");

  // CTRL + ENTER
  if (entrada) {

    entrada.addEventListener("keydown", (e) => {

      if (e.key === "Enter" && e.ctrlKey) {

        e.preventDefault();

        converter();
      }
    });
  }

  // CTRL + C
  document.addEventListener("keydown", (e) => {

    const teclaC =
      e.key.toLowerCase() === "c";

    const ctrlOuCmd =
      e.ctrlKey || e.metaKey;

    if (!ctrlOuCmd || !teclaC) return;

    const ativo = document.activeElement;

    const emCampoEditavel =
      ativo &&
      (
        ativo.tagName === "TEXTAREA" ||
        ativo.tagName === "INPUT" ||
        ativo.isContentEditable
      );

    // mantém ctrl+c normal
    if (emCampoEditavel) return;

    const selecao = window.getSelection();

    if (!selecao || selecao.rangeCount === 0) {
      return;
    }

    const noSelecionado =
      selecao.anchorNode;

    if (!noSelecionado) return;

    const elemento =
      noSelecionado.nodeType === 1
        ? noSelecionado
        : noSelecionado.parentElement;

    if (!elemento) return;

    const tabelaPT =
      elemento.closest("#saidaPT table");

    const tabelaEN =
      elemento.closest("#saidaEN table");

    if (tabelaPT) {

      e.preventDefault();

      copiarTabelaDireta(tabelaPT);

      return;
    }

    if (tabelaEN) {

      e.preventDefault();

      copiarTabelaDireta(tabelaEN);
    }
  });
});
