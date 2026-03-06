function converter() {
  const texto = document.getElementById("entrada").value;

  const linhas = texto
    .split("\n")
    .map(l => l.trim())
    .filter(l => l !== "");

  const voos = [];

  for (let linha of linhas) {
    if (!/^\d+/.test(linha)) continue;

    const partes = linha.split(/\s+/);
    let i = 0;

    // número do segmento
    i++;

    let companhia = "";
    let voo = "";

    // casos: LA8126L  OU  UA 63W
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

    // pula dia da semana
    i++;

    const rotaComPossivelStatus = partes[i] || "";
    i++;

    const rota = rotaComPossivelStatus.replace(/[^A-Z]/gi, "");
    const origem = rota.substring(0, 3).toUpperCase();
    const destino = rota.substring(3, 6).toUpperCase();

    // status separado
    if (partes[i] && /^[\*\-]?(SS|HK)\d+/i.test(partes[i])) {
      i++;
    }

    const horaSaida = partes[i] || "";
    i++;

    const horaChegada = partes[i] || "";
    i++;

    // data chegada automática
    let dataChegada = dataSaida;
    if (partes[i] && /^[0-9]{2}[A-Z]{3}$/i.test(partes[i])) {
      dataChegada = partes[i];
    }

    voos.push({
      companhia,
      voo,
      origem,
      destino,
      horaSaida,
      dataSaida,
      horaChegada,
      dataChegada
    });
  }

  gerarTabelas(voos);

  // MOSTRA botões e títulos só depois da conversão (se houver resultado)
  const mostrar = voos.length > 0;

document.getElementById("tituloPT").style.display = mostrar ? "block" : "none";
document.getElementById("tituloEN").style.display = mostrar ? "block" : "none";

document.getElementById("btnCopiarPT").style.display = mostrar ? "inline-block" : "none";
document.getElementById("btnCopiarEN").style.display = mostrar ? "inline-block" : "none";
}

/* ===== helpers ===== */

function aeroportoB(sigla) {
  const s = (sigla || "").toUpperCase();
  if (typeof aeroportos === "undefined") return s;
  const nome = aeroportos[s];
  return nome ? `${nome} (${s})` : s;
}

function nomeCompanhia(sigla) {
  const s = (sigla || "").toUpperCase();
  if (typeof companhias === "undefined") return s;
  return companhias[s] || s;
}

function formatarHora(h) {
  if (!h) return "";
  const s = String(h).replace(/\D/g, "");
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
  const mes = data.substring(2, 5).toUpperCase();
  return dia + (mapaMes[mes] || mes);
}

/* ===== Tabelas ===== */

function gerarTabelas(voos) {

  // PT
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
  document.getElementById("saidaPT").innerHTML = htmlPT;

  // EN
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
  document.getElementById("saidaEN").innerHTML = htmlEN;
}

/* ===== Copiar para e-mail (PT ou EN) com as cores do site ===== */

function copiarTabelaEmail(idioma) {
  const selector = idioma === "EN" ? "#saidaEN table" : "#saidaPT table";
  const tabela = document.querySelector(selector);

  if (!tabela) {
    alert("Gere a tabela primeiro.");
    return;
  }

  // Cores do NOVO tema (azul/roxo/branco)
  const headerBg = "#1e3a8a";   // azul escuro (cabeçalho)
  const headerText = "#ffffff"; // branco
  const borderColor = "#e5e7eb"; // cinza claro (borda)
  const zebraBg = "#f3f4f6";     // cinza claro alternado
  const textColor = "#1e3a8a";   // azul escuro (texto)
  const bodyBg = "#ffffff";      // branco

  const estilos = `
    <style>
      table.tabela-voos{
        width: 100%;
        max-width: 1000px;
        border-collapse: separate;
        border-spacing: 0;
        background: ${bodyBg};
        border: 1px solid ${borderColor};
        border-radius: 10px;
        overflow: hidden;
        font-family: "Segoe UI", Arial, sans-serif;
        font-size: 13px;
        color: ${textColor};
      }
      table.tabela-voos th{
        background: ${headerBg};
        color: ${headerText};
        font-weight: 700;
        text-align: center;
        padding: 10px 12px;
      }
      table.tabela-voos td{
        text-align: center;
        padding: 10px 12px;
        border-top: 1px solid ${borderColor};
        color: ${textColor};
      }
      table.tabela-voos tbody tr:nth-child(even){
        background: ${zebraBg};
      }
        .logo-emoji{
        font-size: 32px;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(30,58,138,0.35);
}
    </style>
  `;

  const html = `<!DOCTYPE html><html><head>${estilos}</head><body>${tabela.outerHTML}</body></html>`;

  // Copia HTML + fallback texto
  if (navigator.clipboard && window.ClipboardItem) {
    const item = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([tabela.innerText], { type: "text/plain" })
    });

    navigator.clipboard.write([item])
      .then(() => alert("Tabela copiada!"))
      .catch(() => {
        navigator.clipboard.writeText(tabela.innerText);
        alert("Copiado como texto (o app pode não aceitar formatação).");
      });
  } else {
    navigator.clipboard.writeText(tabela.innerText);
    alert("Copiado como texto (navegador não suporta HTML no copiar).");
  }

}

/* ===== Atalho teclado ===== */

window.addEventListener("DOMContentLoaded", () => {
  const entrada = document.getElementById("entrada");

  if (!entrada) return;

  entrada.addEventListener("keydown", (e) => {
    // Ctrl + Enter converte
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      converter();
    }
  });
});
