import { Resend } from "resend";

const MP_API_KEY = "5165A600-4980-4B9C-AB11-1AB3E9112099";
const RESEND_API_KEY = "re_7Z94YSLj_94bFEZ6Sqfo34Vat37cLp6mH";
const DEST_EMAIL = "c.alarcon.cerd@gmail.com";

const KEYWORDS = [
  "eléctrico", "electrico", "electricidad", "instalación eléctrica",
  "instalacion electrica", "mantención eléctrica", "mantencion electrica",
  "tablero eléctrico", "alumbrado", "subestación", "subestacion",
  "grupo electrógeno", "grupo electrogeno", "transformador", "conductor eléctrico",
  "cable eléctrico", "luminaria", "fotovoltaico", "solar", "BT", "MT", "AT"
];

async function fetchLicitaciones() {
  const url =
    `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json` +
    `?ticket=${MP_API_KEY}&estado=publicada`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`MP API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.Listado || [];
}

function matchesKeyword(licitacion) {
  const text = [
    licitacion.Nombre,
    licitacion.Descripcion,
    licitacion.CodigoExterno,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
}

function buildHtml(matches) {
  const rows = matches
    .map(
      (l) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd">${l.CodigoExterno}</td>
        <td style="padding:8px;border:1px solid #ddd">${l.Nombre}</td>
        <td style="padding:8px;border:1px solid #ddd">${l.NombreOrganismo}</td>
        <td style="padding:8px;border:1px solid #ddd">${l.FechaCierre ?? "—"}</td>
        <td style="padding:8px;border:1px solid #ddd">
          <a href="https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${l.CodigoExterno}">
            Ver licitación
          </a>
        </td>
      </tr>`
    )
    .join("\n");

  return `
  <h2 style="color:#1a3c6b">Licitaciones eléctricas en Mercado Público</h2>
  <p>Se encontraron <strong>${matches.length}</strong> licitación(es) relacionadas con el rubro eléctrico.</p>
  <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:14px">
    <thead>
      <tr style="background:#1a3c6b;color:white">
        <th style="padding:8px">Código</th>
        <th style="padding:8px">Nombre</th>
        <th style="padding:8px">Organismo</th>
        <th style="padding:8px">Cierre</th>
        <th style="padding:8px">Enlace</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="color:#888;font-size:12px;margin-top:24px">Generado automáticamente — ${new Date().toLocaleString("es-CL")}</p>
  `;
}

async function main() {
  console.log("Consultando Mercado Público...");
  const licitaciones = await fetchLicitaciones();
  console.log(`Total licitaciones obtenidas: ${licitaciones.length}`);

  const matches = licitaciones.filter(matchesKeyword);
  console.log(`Licitaciones eléctricas encontradas: ${matches.length}`);

  if (matches.length === 0) {
    console.log("Sin licitaciones relevantes. No se enviará correo.");
    return;
  }

  matches.forEach((l) => console.log(`  • [${l.CodigoExterno}] ${l.Nombre}`));

  const resend = new Resend(RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: "Scanner MP <onboarding@resend.dev>",
    to: DEST_EMAIL,
    subject: `[Mercado Público] ${matches.length} licitación(es) eléctrica(s) nuevas`,
    html: buildHtml(matches),
  });

  if (error) {
    console.error("Error al enviar correo:", error);
    process.exit(1);
  }

  console.log("Correo enviado con éxito. ID:", data.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});